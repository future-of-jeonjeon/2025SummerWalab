import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useProblem } from '../hooks/useProblems';
import { CodeEditor } from '../components/organisms/CodeEditor';
import { Button } from '../components/atoms/Button';
import { ExecutionResult } from '../types';
import { executionService } from '../services/executionService';
import { submissionService } from '../services/submissionService';

type StatusTone = 'success' | 'error' | 'warning' | 'info';

interface StatusDisplayMeta {
  label: string;
  message?: string;
  tone: StatusTone;
  code?: string;
}

interface StatusToneStyle {
  container: string;
  label: string;
  message: string;
  iconColor: string;
  badge: string;
  icon: React.ReactNode;
}

const toneStyles: Record<StatusTone, StatusToneStyle> = {
  success: {
    container: 'bg-green-50 border-green-200',
    label: 'text-green-900',
    message: 'text-green-700',
    iconColor: 'text-green-500',
    badge: 'bg-green-100 text-green-700 border-green-200',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <polyline points="9 12.5 11 14.5 15 10.5" />
      </svg>
    ),
  },
  error: {
    container: 'bg-red-50 border-red-200',
    label: 'text-red-900',
    message: 'text-red-700',
    iconColor: 'text-red-500',
    badge: 'bg-red-100 text-red-700 border-red-200',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="15" y1="9" x2="9" y2="15" />
      </svg>
    ),
  },
  warning: {
    container: 'bg-amber-50 border-amber-200',
    label: 'text-amber-900',
    message: 'text-amber-700',
    iconColor: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3 2 21h20L12 3z" />
        <line x1="12" y1="9.5" x2="12" y2="13.5" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  info: {
    container: 'bg-blue-50 border-blue-200',
    label: 'text-blue-900',
    message: 'text-blue-700',
    iconColor: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="10" x2="12" y2="16" />
        <line x1="12" y1="7.5" x2="12.01" y2="7.5" />
      </svg>
    ),
  },
};

const judgeResultToStatus: Record<string, string> = {
  '-2': 'CE',
  '-1': 'WA',
  '0': 'AC',
  '1': 'TLE',
  '2': 'TLE',
  '3': 'MLE',
  '4': 'RE',
  '5': 'SE',
  '6': 'PENDING',
  '7': 'JUDGING',
  '8': 'PAC',
  '9': 'SUBMITTING',
};

const MAX_SUBMISSION_POLL_ATTEMPTS = 60;
const progressStatuses = new Set(['PENDING', 'JUDGING', 'RUNNING', 'SUBMITTED', 'SUBMITTING']);

export const ProblemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const problemId = id ? parseInt(id, 10) : 0;

  const { data: problem, isLoading, error } = useProblem(problemId);
  const queryClient = useQueryClient();
  const [executionResult, setExecutionResult] = useState<ExecutionResult | undefined>();
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualStatus, setManualStatus] = useState<string | undefined>();
  const [editorTheme, setEditorTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('oj:editorTheme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });
  const submissionPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submissionPollAttemptsRef = useRef(0);
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Layout states: left/right resizable and collapsible
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [leftWidthPct, setLeftWidthPct] = useState<number>(() => {
    const saved = localStorage.getItem('oj:layout:leftWidthPct');
    return saved ? Number(saved) : 45; // percentage
  });
  const [isDraggingLR, setIsDraggingLR] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('oj:layout:leftCollapsed');
    return saved === '1';
  });
  // Right editor is always visible; no collapse state

  const onMouseMoveLR = useCallback((e: MouseEvent) => {
    if (!isDraggingLR || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(15, Math.min(85, (x / rect.width) * 100));
    setLeftWidthPct(pct);
  }, [isDraggingLR]);

  const onMouseUpLR = useCallback(() => setIsDraggingLR(false), []);

  useEffect(() => {
    if (isDraggingLR) {
      window.addEventListener('mousemove', onMouseMoveLR);
      window.addEventListener('mouseup', onMouseUpLR);
      return () => {
        window.removeEventListener('mousemove', onMouseMoveLR);
        window.removeEventListener('mouseup', onMouseUpLR);
      };
    }
  }, [isDraggingLR, onMouseMoveLR, onMouseUpLR]);

  useEffect(() => {
    localStorage.setItem('oj:layout:leftWidthPct', String(leftWidthPct));
  }, [leftWidthPct]);

  useEffect(() => {
    localStorage.setItem('oj:layout:leftCollapsed', leftCollapsed ? '1' : '0');
  }, [leftCollapsed]);

  // Keyboard shortcut: Ctrl/Cmd+B to toggle left panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const ctrl = isMac ? e.metaKey : e.ctrlKey;
      if (!ctrl) return;
      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setLeftCollapsed(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const stopSubmissionPolling = useCallback(() => {
    if (submissionPollTimerRef.current) {
      clearTimeout(submissionPollTimerRef.current);
      submissionPollTimerRef.current = null;
    }
  }, []);

  const mapJudgeResult = useCallback((value: number | string | undefined) => {
    if (value === null || value === undefined) return undefined;
    const mapped = judgeResultToStatus[String(value)];
    return mapped;
  }, []);

  const startSubmissionPolling = useCallback((submissionId: number | string) => {
    if (!submissionId) return;
    if (typeof submissionId === 'number' && Number.isNaN(submissionId)) return;
    stopSubmissionPolling();
    submissionPollAttemptsRef.current = 0;

    const poll = async () => {
      try {
        submissionPollAttemptsRef.current += 1;
        const detail = await submissionService.getSubmission(submissionId);
        const fallbackStatus = typeof detail?.status === 'string'
          ? detail.status.trim().toUpperCase()
          : undefined;
        const nextStatus = mapJudgeResult(detail?.result as number | string | undefined) ?? fallbackStatus;
        const normalizedStatus = nextStatus ? String(nextStatus).trim().toUpperCase() : undefined;
        const normalizedKey = normalizedStatus ? normalizedStatus.replace(/\s+/g, '_') : undefined;
        if (normalizedStatus) {
          setManualStatus(normalizedStatus);
        }
        const stats = detail?.statistic_info;
        const hasStats = !!stats && typeof stats === 'object' && Object.keys(stats as Record<string, unknown>).length > 0;
        const isProgress = normalizedStatus
          ? progressStatuses.has(normalizedStatus) || (normalizedKey ? progressStatuses.has(normalizedKey) : false)
          : false;
        const reachedAttemptLimit = submissionPollAttemptsRef.current >= MAX_SUBMISSION_POLL_ATTEMPTS;
        if (hasStats || (!isProgress && normalizedStatus) || reachedAttemptLimit) {
          if (problemId > 0) {
            queryClient.invalidateQueries({ queryKey: ['problem', problemId] });
          }
          stopSubmissionPolling();
          return;
        }
      } catch (pollError) {
        if (problemId > 0) {
          queryClient.invalidateQueries({ queryKey: ['problem', problemId] });
        }
        stopSubmissionPolling();
        return;
      }
      submissionPollTimerRef.current = setTimeout(poll, 2000);
    };

    submissionPollTimerRef.current = setTimeout(poll, 1000);
  }, [mapJudgeResult, problemId, queryClient, stopSubmissionPolling]);

  const handleExecute = async (code: string, language: string, input?: string) => {
    setIsExecuting(true);
    try {
      const raw = await executionService.run({ language, code, input });
      // Normalize to ExecutionResult (support diverse shapes)
      // Prefer the last record in data[] when present
      const dataArr = Array.isArray((raw as any).data) ? (raw as any).data as any[] : [];
      const last = dataArr.length > 0 ? dataArr[dataArr.length - 1] : undefined;

      const output = (last?.output ?? last?.stdout ?? (raw as any).output ?? (raw as any).stdout ?? '') as string;
      const stderr = (last?.stderr ?? (raw as any).stderr) as string | undefined;
      const errField = (raw as any).err;
      const apiErrorField = (raw as any).error;
      let errorMsg = typeof apiErrorField === 'string' ? apiErrorField : stderr;
      if (!errorMsg && typeof errField === 'string') {
        const detail = typeof (raw as any).data === 'string' ? (raw as any).data : undefined;
        errorMsg = detail ? `${errField}: ${detail}` : errField;
      }
      const time = (last?.cpu_time ?? last?.real_time ?? (raw as any).time ?? (raw as any).cpu_time ?? (raw as any).real_time ?? 0) as number;
      let memory = Number(last?.memory ?? (raw as any).memory ?? 0);
      // Heuristic: if memory looks like bytes, convert to KB
      if (memory > 0 && memory > 10_000) {
        memory = Math.round(memory / 1024);
      }
      const status: ExecutionResult['status'] = errorMsg ? 'ERROR' : ((last?.exit_code ?? 0) === 0 ? 'SUCCESS' : 'ERROR');
      const finalOutput = output || (!errorMsg ? JSON.stringify(raw, null, 2) : '');
      setExecutionResult({
        output: finalOutput,
        error: errorMsg,
        executionTime: Math.max(0, Math.round(time)),
        memoryUsage: Math.max(0, Math.round(memory)),
        status,
      });
    } catch (err: any) {
      setExecutionResult({
        output: '',
        error: err?.message || '실행 중 오류가 발생했습니다.',
        executionTime: 0,
        memoryUsage: 0,
        status: 'ERROR',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = async (code: string, language: string) => {
    setIsSubmitting(true);
    try {
      const result = await submissionService.submitSolution({
        problemId,
        code,
        language,
      });

      const submissionIdRaw = (result?.submissionId ?? result?.id) as number | string | undefined;
      const hasSubmissionId = typeof submissionIdRaw === 'number'
        ? !Number.isNaN(submissionIdRaw)
        : typeof submissionIdRaw === 'string'
          ? submissionIdRaw.trim().length > 0
          : false;
      const successMessage = hasSubmissionId
        ? `제출이 완료되었습니다! (제출 번호: ${submissionIdRaw})`
        : '제출이 완료되었습니다!';
      if (hasSubmissionId && submissionIdRaw != null) {
        setManualStatus('SUBMITTING');
        startSubmissionPolling(submissionIdRaw);
      } else {
        setManualStatus('SUBMITTED');
      }
      alert(successMessage);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '제출 중 오류가 발생했습니다.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setManualStatus(undefined);
    stopSubmissionPolling();
    submissionPollAttemptsRef.current = 0;
  }, [problemId, stopSubmissionPolling]);

  const rawProblemStatus = useMemo(() => {
    if (!problem) return undefined;
    const fromProblem = problem.myStatus ?? (problem as any).my_status;
    if (fromProblem != null && String(fromProblem).trim().length > 0) {
      const raw = String(fromProblem).trim();
      const mapped = judgeResultToStatus[raw];
      if (mapped) {
        return mapped;
      }
      return raw.toUpperCase();
    }
    if (problem.solved) {
      return 'AC';
    }
    return undefined;
  }, [problem]);

  const statusDisplay = useMemo<StatusDisplayMeta | undefined>(() => {
    if (!problem) return undefined;

    const statusDefinitions: Record<string, { label: string; message?: string; tone: StatusTone }> = {
      AC: { label: '채점 통과', message: '축하합니다! 이 문제를 해결했습니다.', tone: 'success' },
      ACCEPTED: { label: '채점 통과', message: '축하합니다! 이 문제를 해결했습니다.', tone: 'success' },
      WA: { label: '틀렸습니다', message: '정답과 출력이 달랐어요. 입출력 예제를 다시 확인해보세요.', tone: 'error' },
      WRONG_ANSWER: { label: '틀렸습니다', message: '정답과 출력이 달랐어요. 입출력 예제를 다시 확인해보세요.', tone: 'error' },
      TLE: { label: '시간 초과', message: '실행 시간이 제한을 넘었습니다. 알고리즘을 최적화해보세요.', tone: 'warning' },
      TIME_LIMIT_EXCEEDED: { label: '시간 초과', message: '실행 시간이 제한을 넘었습니다. 알고리즘을 최적화해보세요.', tone: 'warning' },
      MLE: { label: '메모리 초과', message: '필요한 메모리가 제한을 초과했습니다. 자료구조를 재검토해보세요.', tone: 'warning' },
      MEMORY_LIMIT_EXCEEDED: { label: '메모리 초과', message: '필요한 메모리가 제한을 초과했습니다. 자료구조를 재검토해보세요.', tone: 'warning' },
      OLE: { label: '출력 초과', message: '출력 크기가 제한을 초과했습니다.', tone: 'warning' },
      OUTPUT_LIMIT_EXCEEDED: { label: '출력 초과', message: '출력 크기가 제한을 초과했습니다.', tone: 'warning' },
      RE: { label: '런타임 에러', message: '실행 중 예외가 발생했습니다. 예외 상황을 확인해보세요.', tone: 'error' },
      RUNTIME_ERROR: { label: '런타임 에러', message: '실행 중 예외가 발생했습니다. 예외 상황을 확인해보세요.', tone: 'error' },
      CE: { label: '컴파일 에러', message: '컴파일이 실패했습니다. 컴파일러 메시지를 확인하세요.', tone: 'error' },
      COMPILE_ERROR: { label: '컴파일 에러', message: '컴파일이 실패했습니다. 컴파일러 메시지를 확인하세요.', tone: 'error' },
      SE: { label: '시스템 오류', message: '채점 서버에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.', tone: 'error' },
      SYSTEM_ERROR: { label: '시스템 오류', message: '채점 서버에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.', tone: 'error' },
      PAC: { label: '부분 정답', message: '일부 테스트만 통과했습니다. 나머지도 해결해 보세요.', tone: 'warning' },
      PARTIAL_ACCEPTED: { label: '부분 정답', message: '일부 테스트만 통과했습니다. 나머지도 해결해 보세요.', tone: 'warning' },
      PE: { label: '출력 형식 오류', message: '형식 차이로 오답 처리되었습니다. 공백과 줄바꿈을 확인해보세요.', tone: 'warning' },
      PRESENTATION_ERROR: { label: '출력 형식 오류', message: '형식 차이로 오답 처리되었습니다. 공백과 줄바꿈을 확인해보세요.', tone: 'warning' },
      PENDING: { label: '채점 대기 중', message: '채점 서버가 제출을 처리하는 중입니다.', tone: 'info' },
      JUDGING: { label: '채점 중', message: '곧 결과가 업데이트됩니다.', tone: 'info' },
      RUNNING: { label: '실행 중', message: '채점 서버에서 프로그램이 실행되고 있습니다.', tone: 'info' },
      SUBMITTED: { label: '제출 완료', message: '곧 채점이 시작됩니다.', tone: 'info' },
      SUBMITTING: { label: '제출 중', message: '제출한 코드를 채점 서버에 전달하고 있습니다.', tone: 'info' },
    };

    const statusCode = manualStatus ?? rawProblemStatus;

    if (!statusCode) {
      return {
        label: '제출 기록이 없습니다',
        message: '코드를 제출하면 채점 결과가 여기에 표시됩니다.',
        tone: 'info' as const,
      };
    }

    const normalized = String(statusCode).trim().toUpperCase();
    const normalizedKey = normalized.replace(/\s+/g, '_');
    const definition = statusDefinitions[normalized] ?? statusDefinitions[normalizedKey];
    if (definition) {
      return { ...definition, code: normalized };
    }

    return {
      label: normalized,
      message: '최근 제출 상태를 확인했습니다.',
      tone: normalized === 'AC' ? 'success' : 'info',
      code: normalized,
    };
  }, [manualStatus, rawProblemStatus, problem]);

  const statusToneStyle = statusDisplay ? toneStyles[statusDisplay.tone] : undefined;
  const isDarkTheme = editorTheme === 'dark';

  const contentPanelClasses = isDarkTheme
    ? 'bg-slate-900 text-slate-100'
    : 'bg-white text-gray-900';

  const subtleTextClass = isDarkTheme ? 'text-slate-400' : 'text-gray-600';
  const headingTextClass = isDarkTheme ? 'text-slate-100' : 'text-gray-900';
  const proseClass = isDarkTheme ? 'prose prose-invert max-w-none' : 'prose max-w-none';
  const samplePreClasses = isDarkTheme
    ? 'bg-slate-800 text-slate-100 border border-slate-700'
    : 'bg-gray-100 text-gray-900';
  const sampleCopyVariant = isDarkTheme ? 'outline' : 'ghost';
  const sampleCopyButtonClass = isDarkTheme
    ? 'px-2 py-1 text-xs text-slate-200 border-slate-500 hover:bg-slate-800'
    : 'px-2 py-1 text-xs';
  const editorHeaderClasses = isDarkTheme
    ? 'bg-slate-800 border-slate-700 text-slate-200'
    : 'bg-gray-50 border-gray-200 text-gray-700';
  const copyFeedbackClass = isDarkTheme ? 'text-emerald-400' : 'text-green-600';

  useEffect(() => {
    if (!manualStatus) return;
    if ((rawProblemStatus && rawProblemStatus !== manualStatus) || problem?.solved) {
      setManualStatus(undefined);
    }
  }, [manualStatus, rawProblemStatus, problem?.solved]);

  useEffect(() => () => {
    stopSubmissionPolling();
    if (copyFeedbackTimeoutRef.current) {
      clearTimeout(copyFeedbackTimeoutRef.current);
      copyFeedbackTimeoutRef.current = null;
    }
  }, [stopSubmissionPolling]);

  const copyToClipboard = useCallback(async (text: string, key: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
      setCopiedKey(key);
      copyFeedbackTimeoutRef.current = setTimeout(() => {
        setCopiedKey(null);
      }, 2000);
    } catch (err) {
      console.error('클립보드 복사 실패', err);
      alert('복사에 실패했습니다. 다시 시도해주세요.');
    }
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">문제를 찾을 수 없습니다</h1>
          <Button onClick={() => navigate('/problems')}>
            문제 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full px-0 py-0 ${isDarkTheme ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      <div
        ref={containerRef}
        className="relative flex gap-0 h-screen overflow-visible"
      >
        {/* Left: Problem */}
        <div
          className={`flex flex-col ${contentPanelClasses}`}
          style={{ width: leftCollapsed ? 0 : `${leftWidthPct}%` }}
        >
          {/* Scrollable problem content - headerless, edge-to-edge */}
          <div className="flex-1 overflow-auto no-scrollbar">
            <div className="px-6 py-4 space-y-6">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className={isDarkTheme ? 'text-slate-200 hover:bg-slate-800' : ''}
                  onClick={() => navigate(-1)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </Button>
                <h1 className={`text-xl font-semibold flex items-center gap-2 ${headingTextClass}`}>
                  {problem.title}
                  {problem.solved && (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-700">Solved</span>
                  )}
                </h1>
                <span className={`text-xs ${subtleTextClass}`}>
                  시간 {problem.timeLimit}ms · 메모리 {problem.memoryLimit}MB
                </span>
              </div>

              {statusDisplay && statusToneStyle && (
                <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${statusToneStyle.container}`}>
                  <div className={`mt-1 ${statusToneStyle.iconColor}`}>
                    {statusToneStyle.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-semibold ${statusToneStyle.label}`}>
                        {statusDisplay.label}
                      </p>
                      {statusDisplay.code && (
                        <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusToneStyle.badge}`}>
                          {statusDisplay.code}
                        </span>
                      )}
                    </div>
                    {statusDisplay.message && (
                      <p className={`mt-1 text-xs leading-5 ${statusToneStyle.message}`}>
                        {statusDisplay.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <section>
                <h2 className={`text-lg font-semibold mb-3 ${headingTextClass}`}>문제 설명</h2>
                <div className={proseClass}>
                  <div dangerouslySetInnerHTML={{ __html: problem.description }} />
                </div>
              </section>

              {problem.inputDescription && (
                <section>
                  <h2 className={`text-lg font-semibold mb-3 ${headingTextClass}`}>입력 형식</h2>
                  <div className={proseClass}>
                    <div dangerouslySetInnerHTML={{ __html: problem.inputDescription }} />
                  </div>
                </section>
              )}

              {problem.outputDescription && (
                <section>
                  <h2 className={`text-lg font-semibold mb-3 ${headingTextClass}`}>출력 형식</h2>
                  <div className={proseClass}>
                    <div dangerouslySetInnerHTML={{ __html: problem.outputDescription }} />
                  </div>
                </section>
              )}

              {problem.samples && problem.samples.length > 0 && (
                <section>
                  <h2 className={`text-lg font-semibold mb-3 ${headingTextClass}`}>입출력 예제</h2>
                  <div className="space-y-4">
                    {problem.samples.map((sample, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">입력 {index + 1}</h3>
                            <div className="flex items-center gap-2">
                              {copiedKey === `sample-${index}-input` && (
                                <span className={`text-[11px] ${copyFeedbackClass}`}>복사됨!</span>
                              )}
                              <Button
                                variant={sampleCopyVariant}
                                size="sm"
                                onClick={(e) => {
                                  e?.stopPropagation?.();
                                  copyToClipboard(sample.input, `sample-${index}-input`);
                                }}
                                className={sampleCopyButtonClass}
                              >
                                복사
                              </Button>
                            </div>
                          </div>
                          <pre className={`${samplePreClasses} p-3 rounded text-sm font-mono whitespace-pre-wrap`}>
                            {sample.input}
                          </pre>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">출력 {index + 1}</h3>
                            <div className="flex items-center gap-2">
                              {copiedKey === `sample-${index}-output` && (
                                <span className={`text-[11px] ${copyFeedbackClass}`}>복사됨!</span>
                              )}
                              <Button
                                variant={sampleCopyVariant}
                                size="sm"
                                onClick={(e) => {
                                  e?.stopPropagation?.();
                                  copyToClipboard(sample.output, `sample-${index}-output`);
                                }}
                                className={sampleCopyButtonClass}
                              >
                                복사
                              </Button>
                            </div>
                          </div>
                          <pre className={`${samplePreClasses} p-3 rounded text-sm font-mono whitespace-pre-wrap`}>
                            {sample.output}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {problem.hint && (
                <section>
                  <h2 className={`text-lg font-semibold mb-3 ${headingTextClass}`}>힌트</h2>
                  <p className="whitespace-pre-wrap">{problem.hint}</p>
                </section>
              )}
            </div>
          </div>
        </div>

        {/* Vertical resizer with collapse/expand toggle (minimal visual line, wide hit area) */}
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={() => !leftCollapsed && setIsDraggingLR(true)}
          className="oj-resizer-v flex items-center justify-center select-none"
          style={{ userSelect: 'none' }}
        >
          <button
            aria-label={leftCollapsed ? '좌측 패널 펼치기' : '좌측 패널 접기'}
            className="oj-side-handle small blend"
            onClick={(e) => { e.stopPropagation(); setLeftCollapsed(v => !v); }}
            title={leftCollapsed ? '펼치기' : '접기'}
          >
            {leftCollapsed ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            )}
          </button>
        </div>

        {/* Right: Editor + I/O split */}
        <div className={`flex-1 min-w-0 flex flex-col ${isDarkTheme ? 'bg-slate-900 text-slate-100' : 'bg-white text-gray-900'}`}>
          <CodeEditor
            problemId={problemId}
            samples={problem.samples}
            onExecute={handleExecute}
            onSubmit={handleSubmit}
            executionResult={executionResult}
            isExecuting={isExecuting}
            isSubmitting={isSubmitting}
            preferredTheme={editorTheme}
            onThemeChange={setEditorTheme}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
};
