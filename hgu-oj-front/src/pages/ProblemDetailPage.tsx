import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useProblem } from '../hooks/useProblems';
import { problemService } from '../services/problemService';
import { contestService } from '../services/contestService';
import { workbookService } from '../services/workbookService';
import { resolveProblemStatus } from '../utils/problemStatus';
import { PROBLEM_STATUS_LABELS, PROBLEM_SUMMARY_LABELS } from '../constants/problemStatus';
import { CodeEditor } from '../components/organisms/CodeEditor';
import { Button } from '../components/atoms/Button';
import { Contest, ExecutionResult, Problem } from '../types';
import { executionService } from '../services/executionService';
import { submissionService, SubmissionDetail, SubmissionListItem } from '../services/submissionService';
import { useAuthStore } from '../stores/authStore';

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

const STATUS_META: Record<string, Omit<StatusDisplayMeta, 'code'>> = {
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

const describeStatus = (statusCode?: string): StatusDisplayMeta | undefined => {
  if (!statusCode) return undefined;
  const normalized = statusCode.trim().toUpperCase();
  if (!normalized) return undefined;
  const normalizedKey = normalized.replace(/\s+/g, '_');
  const meta = STATUS_META[normalized] ?? STATUS_META[normalizedKey];
  if (meta) {
    return { ...meta, code: normalized };
  }
  return undefined;
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
  const location = useLocation();
  const rawRouteId = (id ?? '').trim();
  const problemIdentifier = rawRouteId;
  const contestContextId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const raw = searchParams.get('contestId');
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [location.search]);

  const contestProblemDisplayId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const raw = searchParams.get('displayId');
    if (!raw) return undefined;
    return raw.trim();
  }, [location.search]);

  const workbookContextId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const raw = searchParams.get('workbookId');
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [location.search]);

  const [contestMeta, setContestMeta] = useState<Contest | null>(null);
  const [contestTimeLeft, setContestTimeLeft] = useState<string | null>(null);

  const shouldFetchRegularProblem = !contestContextId;

  const getProblemExternalIdentifier = useCallback((source?: Problem | null): string | undefined => {
    if (!source) return undefined;

    const rawId = (source as any).id ?? source.id;
    if (rawId !== null && rawId !== undefined) {
      const idString = String(rawId).trim();
      if (idString.length > 0) {
        return idString;
      }
    }

    const fallbackCandidates = [
      source.displayId,
      (source as any)._id ?? source._id,
    ];

    for (const candidate of fallbackCandidates) {
      if (candidate === null || candidate === undefined) continue;
      const key = String(candidate).trim();
      if (key.length > 0) {
        return key;
      }
    }
    return undefined;
  }, []);

  const getProblemLegacyIdentifier = useCallback((source?: Problem | null): string | undefined => {
    if (!source) return undefined;

    const candidates = [
      (source as any)._id ?? source._id,
      source.displayId,
      (source as any).id ?? source.id,
    ];

    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined) continue;
      const key = String(candidate).trim();
      if (key.length > 0) {
        return key;
      }
    }
    return undefined;
  }, []);

  const {
    data: fallbackProblem,
    isLoading: regularProblemLoading,
    error: regularProblemError,
  } = useProblem(problemIdentifier, { enabled: shouldFetchRegularProblem && !!problemIdentifier });

  const {
    data: contestProblem,
    isLoading: contestProblemLoading,
    error: contestProblemError,
  } = useQuery({
    queryKey: ['contest-problem', contestContextId, contestProblemDisplayId ?? problemIdentifier],
    queryFn: () => {
      if (!contestContextId) {
        throw new Error('contestId is required');
      }
      const identifier = contestProblemDisplayId ?? problemIdentifier;
      return problemService.getContestProblem(contestContextId, identifier);
    },
    enabled: !!contestContextId && (!!contestProblemDisplayId || !!problemIdentifier),
  });

  const problem = contestContextId ? contestProblem : fallbackProblem;
  const isLoading = contestContextId ? contestProblemLoading : regularProblemLoading;
  const error = contestContextId ? contestProblemError : regularProblemError;
  const queryClient = useQueryClient();
  const [executionResult, setExecutionResult] = useState<ExecutionResult | undefined>();
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualStatus, setManualStatus] = useState<string | undefined>();
  const [activeSection, setActiveSection] = useState<'description' | 'problem-list' | 'submissions'>('description');
  const [isSubmissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | string | null>(null);
  const [selectedSubmissionSummary, setSelectedSubmissionSummary] = useState<SubmissionListItem | null>(null);
  const [selectedSubmissionDetail, setSelectedSubmissionDetail] = useState<SubmissionDetail | null>(null);
  const [submissionModalLoading, setSubmissionModalLoading] = useState(false);
  const [submissionModalError, setSubmissionModalError] = useState<string | null>(null);
  const [editorTheme, setEditorTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('oj:editorTheme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });
  const { isAuthenticated, user: authUser } = useAuthStore();
  const submissionPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submissionPollAttemptsRef = useRef(0);
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const contestTimeOffsetRef = useRef(0);

  const requireAuthentication = useCallback((): boolean => {
    if (isAuthenticated) {
      return true;
    }
    alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
    navigate('/login', { replace: true });
    return false;
  }, [isAuthenticated, navigate]);

  const openSubmissionModal = useCallback(() => {
    setSubmissionModalOpen(true);
  }, []);

  const closeSubmissionModal = useCallback(() => {
    setSubmissionModalOpen(false);
    setSelectedSubmissionDetail(null);
    setSelectedSubmissionSummary(null);
    setSubmissionModalError(null);
    setSubmissionModalLoading(false);
    setSelectedSubmissionId(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!contestContextId) {
      setContestMeta(null);
      setContestTimeLeft(null);
      contestTimeOffsetRef.current = 0;
      return;
    }

    contestService.getContest(contestContextId)
      .then((meta) => {
        if (cancelled) return;
        setContestMeta(meta);
        const serverNow = meta.now ? new Date(meta.now).getTime() : NaN;
        contestTimeOffsetRef.current = Number.isNaN(serverNow) ? 0 : serverNow - Date.now();
      })
      .catch(() => {
        if (!cancelled) {
          setContestMeta(null);
          setContestTimeLeft(null);
          contestTimeOffsetRef.current = 0;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [contestContextId]);

  useEffect(() => {
    if (!contestContextId || !contestMeta) {
      setContestTimeLeft(null);
      return;
    }

    const startMs = contestMeta.startTime ? new Date(contestMeta.startTime).getTime() : NaN;
    const endMs = contestMeta.endTime ? new Date(contestMeta.endTime).getTime() : NaN;

    const update = () => {
      const nowWithOffset = Date.now() + contestTimeOffsetRef.current;
      if (Number.isNaN(endMs)) {
        setContestTimeLeft(null);
        return;
      }

      const diff = endMs - nowWithOffset;
      if (diff <= 0) {
        setContestTimeLeft('대회가 종료되었습니다.');
        return;
      }

      if (!Number.isNaN(startMs) && nowWithOffset < startMs) {
        const untilStart = startMs - nowWithOffset;
        const totalSeconds = Math.floor(untilStart / 1000);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const days = Math.floor(totalSeconds / 86400);
        const prefix = days ? `${days}일 ` : '';
        setContestTimeLeft(`시작까지 ${prefix}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const days = Math.floor(totalSeconds / 86400);
      const prefix = days ? `${days}일 ` : '';
      setContestTimeLeft(`${prefix}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [contestContextId, contestMeta]);

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
          if (problemIdentifier) {
            queryClient.invalidateQueries({ queryKey: ['problem', problemIdentifier] });
          }
          stopSubmissionPolling();
          return;
        }
      } catch (pollError) {
        if (problemIdentifier) {
          queryClient.invalidateQueries({ queryKey: ['problem', problemIdentifier] });
        }
        stopSubmissionPolling();
        return;
      }
      submissionPollTimerRef.current = setTimeout(poll, 2000);
    };

    submissionPollTimerRef.current = setTimeout(poll, 1000);
  }, [mapJudgeResult, problemIdentifier, queryClient, stopSubmissionPolling]);

  const submissionProblemKey = useMemo(() => {
    if (contestContextId) {
      const contestKey = getProblemLegacyIdentifier(contestProblem);
      if (contestKey) {
        return contestKey;
      }
      if (contestProblemDisplayId && contestProblemDisplayId.trim().length > 0) {
        return contestProblemDisplayId.trim();
      }
      return problemIdentifier || undefined;
    }
    const practiceKey = getProblemLegacyIdentifier(problem);
    if (practiceKey) {
      return practiceKey;
    }
    return problemIdentifier || undefined;
  }, [
    contestContextId,
    contestProblem,
    contestProblemDisplayId,
    getProblemLegacyIdentifier,
    problem,
    problemIdentifier,
  ]);

  const submissionQueryKey = useMemo(() => {
    if (!submissionProblemKey) return null;
    if (contestContextId) {
      return ['my-submissions', 'contest', contestContextId, submissionProblemKey] as const;
    }
    return ['my-submissions', 'practice', submissionProblemKey] as const;
  }, [contestContextId, submissionProblemKey]);

  const handleExecute = async (code: string, language: string, input?: string) => {
    if (!requireAuthentication()) return;
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
      const executionTimeMs = Number.isFinite(time) ? Math.max(0, Math.round(time)) : 0;
      const memoryRaw = Number(last?.memory ?? (raw as any).memory ?? 0);
      const memoryUsageKb = normalizeMemoryToKB(Number.isFinite(memoryRaw) ? memoryRaw : 0) ?? 0;
      const status: ExecutionResult['status'] = errorMsg ? 'ERROR' : ((last?.exit_code ?? 0) === 0 ? 'SUCCESS' : 'ERROR');
      const finalOutput = output || (!errorMsg ? JSON.stringify(raw, null, 2) : '');
      setExecutionResult({
        output: finalOutput,
        error: errorMsg,
        executionTime: executionTimeMs,
        memoryUsage: Math.max(0, memoryUsageKb),
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
    if (!requireAuthentication()) return;
    setIsSubmitting(true);
    try {
      const targetProblemId = contestContextId
        ? getProblemExternalIdentifier(contestProblem) ?? problemIdentifier
        : getProblemExternalIdentifier(problem) ?? problemIdentifier;

      if (!targetProblemId) {
        throw new Error('문제 식별자를 확인할 수 없습니다.');
      }

      const result = await submissionService.submitSolution({
        problemId: targetProblemId,
        code,
        language,
        contestId: contestContextId,
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
      setActiveSection('submissions');
      if (hasSubmissionId && submissionIdRaw != null) {
        setManualStatus('SUBMITTING');
        startSubmissionPolling(submissionIdRaw);
        if (submissionQueryKey) {
          queryClient.invalidateQueries({ queryKey: submissionQueryKey });
        }
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
  }, [problemIdentifier, stopSubmissionPolling]);

  const rawProblemStatus = useMemo(() => {
    if (!problem || !isAuthenticated) return undefined;
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
  const copyFeedbackClass = isDarkTheme ? 'text-emerald-400' : 'text-green-600';
  const tabBaseClass = 'px-3 py-1.5 text-sm font-medium rounded-md transition-colors';
  const tabActiveClass = isDarkTheme
    ? 'bg-slate-700 text-slate-100 border border-slate-500 shadow'
    : 'bg-white text-gray-900 border border-gray-300 shadow-sm';
  const tabInactiveClass = isDarkTheme
    ? 'text-slate-300 border border-transparent hover:bg-slate-800'
    : 'text-gray-600 border border-transparent hover:bg-gray-100';

  const problemListLabel = useMemo(() => {
    if (contestContextId) return '대회 문제 목록';
    if (workbookContextId) return '문제집 문제';
    return '문제 목록';
  }, [contestContextId, workbookContextId]);

  const showProblemListSection = useMemo(
    () => Boolean(contestContextId) || Boolean(workbookContextId),
    [contestContextId, workbookContextId],
  );

  const sectionOptions = useMemo(() => {
    const options = [{ id: 'description' as const, label: '문제 내용' }];
    if (showProblemListSection) {
      options.push({ id: 'problem-list' as const, label: problemListLabel });
    }
    options.push({ id: 'submissions' as const, label: '내 제출' });
    return options;
  }, [problemListLabel, showProblemListSection]);

  useEffect(() => {
    if (!showProblemListSection && activeSection === 'problem-list') {
      setActiveSection('description');
    }
  }, [showProblemListSection, activeSection]);

  useEffect(() => {
    if (activeSection !== 'submissions' && isSubmissionModalOpen) {
      closeSubmissionModal();
    }
  }, [activeSection, isSubmissionModalOpen, closeSubmissionModal]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedSubmissionId(null);
      setSelectedSubmissionSummary(null);
      setSelectedSubmissionDetail(null);
      setSubmissionModalError(null);
      setSubmissionModalLoading(false);
      setSubmissionModalOpen(false);
    }
  }, [isAuthenticated]);

  const isProblemListActive = showProblemListSection && activeSection === 'problem-list';

  const {
    data: contestProblemList,
    isLoading: isLoadingContestProblemList,
    error: contestProblemListError,
  } = useQuery({
    queryKey: ['contest-problem-list', contestContextId],
    queryFn: () => contestService.getContestProblems(contestContextId!),
    enabled: showProblemListSection && !!contestContextId,
  });

  const {
    data: workbookProblemList,
    isLoading: isLoadingWorkbookProblemList,
    error: workbookProblemListError,
  } = useQuery({
    queryKey: ['workbook-problem-list', workbookContextId],
    queryFn: async () => {
      const response = await workbookService.getWorkbookProblems(workbookContextId!);
      return response.data
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((item) => item.problem);
    },
    enabled: isProblemListActive && !!workbookContextId,
  });

  const {
    data: globalProblemList,
    isLoading: isLoadingGlobalProblemList,
    error: globalProblemListError,
  } = useQuery({
    queryKey: ['problem-list', 'all'],
    queryFn: async () => {
      const response = await problemService.getProblems({ page: 1, limit: 200 });
      return response.data;
    },
    enabled: isProblemListActive && !contestContextId && !workbookContextId,
  });

  const problemListItems = useMemo<Problem[]>(() => {
    if (contestContextId) return contestProblemList ?? [];
    if (workbookContextId) return workbookProblemList ?? [];
    if (!isAuthenticated) return [];
    return globalProblemList ?? [];
  }, [contestContextId, contestProblemList, workbookContextId, workbookProblemList, globalProblemList, isAuthenticated]);

  const problemListError = contestContextId
    ? contestProblemListError
    : workbookContextId
      ? workbookProblemListError
      : isAuthenticated
        ? globalProblemListError
        : null;

  const isLoadingProblemList = contestContextId
    ? isLoadingContestProblemList
    : workbookContextId
      ? isLoadingWorkbookProblemList
      : isAuthenticated
        ? isLoadingGlobalProblemList
        : false;

  const { data: contestRankProgress } = useQuery({
    queryKey: ['contest-rank-progress', contestContextId, authUser?.id],
    queryFn: async () => {
      if (!contestContextId || !authUser) return null;
      const result = await contestService.getContestRank(contestContextId, { limit: 200 });
      return result.results.find((entry) => entry.user?.id === authUser.id) ?? null;
    },
    enabled: !!contestContextId && !!authUser,
    staleTime: 30_000,
  });

  const contestProblemStats = useMemo(() => {
    if (!contestContextId || problemListItems.length === 0) {
      return null;
    }
    const stats = { total: problemListItems.length, solved: 0, wrong: 0, untouched: 0 };
    const overrides = new Map<number, string>();

    const submissionInfo = contestRankProgress?.submissionInfo as Record<string, any> | undefined;
    if (submissionInfo) {
      Object.entries(submissionInfo).forEach(([key, value]) => {
        const numericId = Number(key);
        if (!Number.isFinite(numericId)) return;
        if (value && typeof value === 'object') {
          if (value.is_ac) {
            overrides.set(numericId, 'AC');
          } else if ((value.error_number ?? 0) > 0) {
            overrides.set(numericId, 'WA');
          }
        } else {
          const numericValue = Number(value);
          if (Number.isFinite(numericValue)) {
            overrides.set(numericId, numericValue > 0 ? 'TRIED' : '');
          }
        }
      });
    }

    problemListItems.forEach((item) => {
      const override = overrides.get(item.id);
      const status = resolveProblemStatus(item, override ? { override } : undefined);
      if (status === PROBLEM_STATUS_LABELS.solved) {
        stats.solved += 1;
      } else if (status === PROBLEM_STATUS_LABELS.untouched) {
        stats.untouched += 1;
      } else {
        stats.wrong += 1;
      }
    });

    // Ensure counts sum to total
    const assigned = stats.solved + stats.wrong + stats.untouched;
    if (assigned !== stats.total) {
      stats.untouched += stats.total - assigned;
    }

    return stats;
  }, [contestContextId, contestRankProgress, problemListItems]);

  const { data: mySubmissionsResponse, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: submissionQueryKey ?? ['my-submissions', 'idle'],
    queryFn: () => (submissionProblemKey
      ? submissionService.getMySubmissions(submissionProblemKey, { contestId: contestContextId ?? undefined })
      : Promise.resolve({ items: [], total: 0 })),
    enabled: activeSection === 'submissions' && isAuthenticated && !!submissionProblemKey,
    staleTime: 30_000,
  });

  const mySubmissions = mySubmissionsResponse?.items ?? [];

  const getNumericValue = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const num = Number(value);
      if (Number.isFinite(num)) return num;
    }
    return undefined;
  };

  const getSubmissionTimestamp = (submission: SubmissionListItem): string | undefined => {
    const candidate = submission.create_time
      ?? submission.createTime
      ?? (submission as any).created_at
      ?? (submission as any).createdAt
      ?? (submission as any).submit_time
      ?? (submission as any).submission_time;
    return typeof candidate === 'string' ? candidate : undefined;
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getSubmissionExecutionTime = (submission: SubmissionListItem): number | undefined => {
    const candidate = submission.executionTime
      ?? submission.execution_time
      ?? (submission as any).time
      ?? (submission as any).cpu_time
      ?? (submission.statistic_info as any)?.time_cost
      ?? (submission.statistic_info as any)?.cpu_time;
    return getNumericValue(candidate);
  };

  const getSubmissionMemory = (submission: SubmissionListItem): number | undefined => {
    const candidate = submission.memoryUsage
      ?? submission.memory
      ?? (submission as any).memory_usage
      ?? (submission as any).memory_cost
      ?? (submission.statistic_info as any)?.memory_cost;
    return getNumericValue(candidate);
  };

  const getStatisticMetric = (stats: Record<string, unknown> | null | undefined, keys: string[]): number | undefined => {
    if (!stats) return undefined;
    for (const key of keys) {
      const candidate = (stats as Record<string, unknown>)[key];
      const numeric = getNumericValue(candidate);
      if (numeric != null) {
        return numeric;
      }
    }
    return undefined;
  };

  const resolveSubmissionId = useCallback((submission: SubmissionListItem | SubmissionDetail | null | undefined): number | string | undefined => {
    if (!submission) return undefined;
    const candidates = [
      (submission as SubmissionListItem).submissionId,
      submission.id,
      (submission as any).submission_id,
      (submission as any).submissionID,
      (submission as any).submissionid,
      (submission as any).run_id,
      (submission as any).runId,
    ];
    for (const candidate of candidates) {
      if (candidate === undefined || candidate === null) continue;
      if (typeof candidate === 'number') {
        if (Number.isFinite(candidate)) return candidate;
        continue;
      }
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (!trimmed) continue;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : trimmed;
      }
    }
    return undefined;
  }, []);

  const resolveSubmissionStatusCode = useCallback((submission: SubmissionDetail | SubmissionListItem | null | undefined): string | undefined => {
    if (!submission) return undefined;
    const rawStatusField = typeof submission.status === 'string' && submission.status.trim().length > 0 ? submission.status : undefined;
    if (rawStatusField) return rawStatusField;
    const resultField = (submission as SubmissionListItem).result;
    if (resultField !== undefined && resultField !== null) {
      const mapped = judgeResultToStatus[String(resultField)];
      return mapped ?? String(resultField);
    }
    const statisticResult = (submission as any)?.statistic_info?.result;
    if (statisticResult !== undefined && statisticResult !== null) {
      const mapped = judgeResultToStatus[String(statisticResult)];
      return mapped ?? String(statisticResult);
    }
    return undefined;
  }, []);

  const handleSubmissionCardClick = useCallback(async (submission: SubmissionListItem) => {
    if (!requireAuthentication()) return;
    setSelectedSubmissionSummary(submission);
    const resolvedId = resolveSubmissionId(submission);
    if (!resolvedId) {
      setSelectedSubmissionId(null);
      setSelectedSubmissionDetail(null);
      setSubmissionModalError('제출 ID를 확인할 수 없습니다.');
      setSubmissionModalLoading(false);
      openSubmissionModal();
      return;
    }
    setSelectedSubmissionId(resolvedId);
    setSubmissionModalLoading(true);
    setSubmissionModalError(null);
    setSelectedSubmissionDetail(null);
    openSubmissionModal();
    try {
      const detail = await submissionService.getSubmission(resolvedId);
      setSelectedSubmissionDetail(detail);
    } catch (err) {
      const message = err instanceof Error ? err.message : '제출 정보를 불러오지 못했습니다.';
      setSubmissionModalError(message);
    } finally {
      setSubmissionModalLoading(false);
    }
  }, [openSubmissionModal, requireAuthentication, resolveSubmissionId]);

  const normalizeMemoryToKB = (value: number | undefined): number | undefined => {
    if (value == null || Number.isNaN(value)) return undefined;
    if (value === 0) return 0;
    const absValue = Math.abs(value);
    const kb = absValue / 1024;
    if (!Number.isFinite(kb)) return undefined;
    const rounded = Math.max(1, Math.round(kb));
    return value < 0 ? -rounded : rounded;
  };

  const formatExecutionTimeValue = (value: number | undefined): string => {
    if (value == null || Number.isNaN(value)) return '-';
    const rounded = Math.round(value);
    return `${rounded}ms`;
  };

  const formatMemoryUsageValue = (value: number | undefined): string => {
    if (value == null || Number.isNaN(value)) return '-';
    const normalized = normalizeMemoryToKB(value);
    if (normalized == null || Number.isNaN(normalized)) return '-';
    return `${normalized}KB`;
  };

  const submissionListContent = !isAuthenticated ? (
    <div className={`py-8 text-center space-y-3 ${subtleTextClass}`}>
      <div>로그인 후 내 제출 기록을 확인할 수 있습니다.</div>
      <Button
        variant={isDarkTheme ? 'outline' : 'primary'}
        size="sm"
        onClick={() => requireAuthentication()}
      >
        로그인 하러가기
      </Button>
    </div>
  ) : isLoadingSubmissions ? (
    <div className={`py-8 text-center ${subtleTextClass}`}>
      내 제출을 불러오는 중입니다...
    </div>
  ) : mySubmissions.length === 0 ? (
    <div className={`py-8 text-center ${subtleTextClass}`}>
      아직 제출 기록이 없습니다.
    </div>
  ) : (
    <div className="space-y-3">
      {mySubmissions.map((submission, index) => {
        const statusCode = resolveSubmissionStatusCode(submission);
        const statusMeta = describeStatus(statusCode) ?? {
          label: statusCode ?? '채점 중',
          tone: 'info' as StatusTone,
          code: statusCode?.toString().toUpperCase(),
        };
        const toneStyle = toneStyles[statusMeta.tone];
        const submittedAtRaw = getSubmissionTimestamp(submission);
        const executionTimeValue = getSubmissionExecutionTime(submission);
        const memoryUsageValue = getSubmissionMemory(submission);
        const cardId = resolveSubmissionId(submission);
        const isActive = selectedSubmissionId != null && cardId != null && String(cardId) === String(selectedSubmissionId);
        const baseCardClass = isDarkTheme
          ? 'border-slate-700 bg-slate-900/80 hover:bg-slate-800/70'
          : 'border-gray-200 bg-white hover:bg-gray-50';
        const activeCardClass = isDarkTheme
          ? 'border-blue-400 ring-2 ring-blue-400'
          : 'border-blue-400 ring-2 ring-blue-400';
        return (
          <button
            type="button"
            key={String(submission.id ?? index)}
            onClick={() => handleSubmissionCardClick(submission)}
            className={`w-full text-left rounded-lg border p-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              isActive ? activeCardClass : baseCardClass
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 min-w-0 space-y-1">
                <div className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-gray-500'}`}>
                  {formatDateTime(submittedAtRaw)}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded ${toneStyle.badge}`}>
                    {statusMeta.code ?? ''}
                  </span>
                  <span className={`text-sm font-medium ${isDarkTheme ? 'text-slate-100' : 'text-gray-800'}`}>
                    {statusMeta.label}
                  </span>
                  {submission.language && (
                    <span className={`text-xs ${isDarkTheme ? 'text-slate-300' : 'text-gray-500'}`}>
                      {submission.language}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className={`${isDarkTheme ? 'text-slate-200' : 'text-gray-700'}`}>
                  {formatExecutionTimeValue(executionTimeValue)}
                </span>
                <span className={`${isDarkTheme ? 'text-slate-200' : 'text-gray-700'}`}>
                  {formatMemoryUsageValue(memoryUsageValue)}
                </span>
              </div>
            </div>
            <div className={`mt-3 text-right text-xs font-medium ${isDarkTheme ? 'text-blue-300' : 'text-blue-600'}`}>
              제출 상세 보기
            </div>
          </button>
        );
      })}
    </div>
  );

  const modalSubmission = selectedSubmissionDetail ?? selectedSubmissionSummary;
  const modalSubmissionCombined = useMemo<SubmissionListItem | null>(() => {
    if (!modalSubmission) return null;
    return { ...(selectedSubmissionSummary ?? {}), ...(selectedSubmissionDetail ?? {}) } as SubmissionListItem;
  }, [modalSubmission, selectedSubmissionDetail, selectedSubmissionSummary]);
  const modalStatusCode = resolveSubmissionStatusCode(modalSubmission);
  const modalStatusMeta = modalStatusCode
    ? describeStatus(modalStatusCode) ?? {
      label: modalStatusCode,
      tone: 'info' as StatusTone,
      code: modalStatusCode.toString().toUpperCase(),
    }
    : undefined;
  const modalToneStyle = modalStatusMeta ? toneStyles[modalStatusMeta.tone] : toneStyles.info;
  const detailStats = selectedSubmissionDetail?.statistic_info ?? null;
  const modalExecutionTimeValue = detailStats
    ? getStatisticMetric(detailStats, ['time_cost', 'cpu_time', 'time', 'execution_time', 'real_time'])
    : undefined;
  const modalMemoryValueFromStats = detailStats
    ? getStatisticMetric(detailStats, ['memory_cost', 'memory_usage', 'memory', 'memory_peak', 'memory_cost_bytes'])
    : undefined;
  const modalExecutionTime = modalExecutionTimeValue ?? (modalSubmissionCombined ? getSubmissionExecutionTime(modalSubmissionCombined) : undefined);
  const modalMemoryUsage = modalMemoryValueFromStats ?? (modalSubmissionCombined ? getSubmissionMemory(modalSubmissionCombined) : undefined);
  const modalSubmittedAt = modalSubmissionCombined ? getSubmissionTimestamp(modalSubmissionCombined) : undefined;
  const modalLanguage = modalSubmissionCombined?.language
    ?? (modalSubmissionCombined as any)?.language_name
    ?? '-';
  const modalProblemIdentifier = modalSubmissionCombined?.problem
    ?? (modalSubmissionCombined as any)?.problem_id
    ?? (modalSubmissionCombined as any)?.problemId
    ?? '-';
  const modalSubmissionIdDisplay = modalSubmissionCombined
    ? resolveSubmissionId(modalSubmissionCombined)
    : selectedSubmissionId;
  const modalCode = selectedSubmissionDetail?.code ?? (modalSubmissionCombined as any)?.code ?? null;
  const modalCodeDisplay = typeof modalCode === 'string' && modalCode.trim().length > 0
    ? modalCode
    : '코드를 불러올 수 없습니다.';

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

  const handleBackClick = useCallback(() => {
    if (contestContextId) {
      const params = new URLSearchParams();
      params.set('tab', 'problems');
      navigate(`/contests/${contestContextId}?${params.toString()}`);
      return;
    }

    if (workbookContextId) {
      navigate(`/workbooks/${workbookContextId}`);
      return;
    }

    navigate('/problems');
  }, [contestContextId, workbookContextId, navigate]);

  const openProblemFromList = useCallback((target: Problem) => {
    if (!target) return;
    const targetKey = getProblemExternalIdentifier(target);
    if (!targetKey || targetKey === problemIdentifier) return;

    if (contestContextId) {
      const params = new URLSearchParams();
      params.set('contestId', String(contestContextId));
      const displayValue = target.displayId ?? target.id ?? targetKey;
      if (displayValue !== undefined && displayValue !== null) {
        params.set('displayId', String(displayValue));
      }
      navigate(`/problems/${encodeURIComponent(targetKey)}?${params.toString()}`);
      return;
    }

    if (workbookContextId) {
      const params = new URLSearchParams();
      params.set('workbookId', String(workbookContextId));
      navigate(`/problems/${encodeURIComponent(targetKey)}?${params.toString()}`);
      return;
    }

    navigate(`/problems/${encodeURIComponent(targetKey)}`);
  }, [contestContextId, getProblemExternalIdentifier, problemIdentifier, workbookContextId, navigate]);

  if (isLoading) {
    return (
      <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-8">
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
      <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">문제를 찾을 수 없습니다</h1>
          <Button variant="secondary" onClick={() => navigate('/problems')}>
            문제 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full px-0 py-0 ${isDarkTheme ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      {contestContextId && contestMeta && (
        <div className={`border-b px-4 py-3 text-xs sm:text-sm ${isDarkTheme ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-600'}`}>
          <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => navigate('/')}
                className={`-ml-12 text-lg font-semibold tracking-tight transition ${isDarkTheme ? 'text-blue-200 hover:text-blue-300' : 'text-blue-700 hover:text-blue-800'}`}
              >
                HGU Online Judge
              </button>
              <span className={`text-lg font-semibold ${isDarkTheme ? 'text-slate-100' : 'text-slate-900'}`}>{contestMeta.title}</span>
            </div>
            <div className="flex flex-1 flex-wrap items-end justify-center gap-6 text-right">
              <div className="flex flex-col items-start">
                <span className={`font-medium uppercase tracking-wide ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>시작</span>
                <span className={`text-sm font-semibold ${isDarkTheme ? 'text-slate-100' : 'text-slate-900'}`}>{contestMeta.startTime ? formatDateTime(contestMeta.startTime) : '-'}</span>
              </div>
              <div className="flex flex-col items-start">
                <span className={`font-medium uppercase tracking-wide ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>종료</span>
                <span className={`text-sm font-semibold ${isDarkTheme ? 'text-slate-100' : 'text-slate-900'}`}>{contestMeta.endTime ? formatDateTime(contestMeta.endTime) : '-'}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-medium uppercase tracking-wide text-blue-600 dark:text-blue-300">남은 시간</span>
                <span className={`text-xl font-bold ${isDarkTheme ? 'text-blue-300' : 'text-blue-700'}`}>{contestTimeLeft ?? '-'}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-4 text-xs">
              <div className="flex flex-col items-center">
                <span className={`${isDarkTheme ? 'text-slate-300' : 'text-slate-500'}`}>{PROBLEM_SUMMARY_LABELS.total}</span>
                <span className={`text-2xl font-bold ${isDarkTheme ? 'text-slate-100' : 'text-slate-900'}`}>{contestProblemStats?.total ?? '-'}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-indigo-500 dark:text-indigo-300">{PROBLEM_SUMMARY_LABELS.untouched}</span>
                <span className={`text-2xl font-bold ${isDarkTheme ? 'text-indigo-300' : 'text-indigo-600'}`}>{contestProblemStats?.untouched ?? '-'}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-emerald-600 dark:text-emerald-300">{PROBLEM_SUMMARY_LABELS.solved}</span>
                <span className={`text-2xl font-bold ${isDarkTheme ? 'text-emerald-300' : 'text-emerald-600'}`}>{contestProblemStats?.solved ?? '-'}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-rose-600 dark:text-rose-300">{PROBLEM_SUMMARY_LABELS.wrong}</span>
                <span className={`text-2xl font-bold ${isDarkTheme ? 'text-rose-300' : 'text-rose-600'}`}>{contestProblemStats?.wrong ?? '-'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
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
              <div className="flex items-start gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`mt-1 ${isDarkTheme ? 'text-slate-200 hover:bg-slate-800' : ''}`}
                  onClick={handleBackClick}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </Button>
                <div className="flex-1 flex flex-col gap-1">
                  <h1 className={`text-xl font-semibold flex items-center gap-2 ${headingTextClass}`}>
                    {problem.title}
                    {isAuthenticated && problem.solved && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-700">
                        {PROBLEM_STATUS_LABELS.solved}
                      </span>
                    )}
                  </h1>
                  <div className={`flex flex-wrap items-center gap-3 text-xs ${subtleTextClass}`}>
                    <span>ID {problem.displayId ?? problem.id}</span>
                    <span>시간 {problem.timeLimit}ms · 메모리 {problem.memoryLimit}MB</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {sectionOptions.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      if (tab.id === 'submissions') {
                        if (!isAuthenticated) {
                          requireAuthentication();
                        }
                        setActiveSection('submissions');
                      } else {
                        setActiveSection(tab.id);
                      }
                    }}
                    className={`${tabBaseClass} ${activeSection === tab.id ? tabActiveClass : tabInactiveClass}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeSection === 'description' ? (
                <>
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
                </>
              ) : activeSection === 'problem-list' ? (
                <section className="space-y-4">
                  <h2 className={`text-lg font-semibold ${headingTextClass}`}>{problemListLabel}</h2>
                  {isLoadingProblemList ? (
                    <div className={`py-8 text-center ${subtleTextClass}`}>
                      문제 목록을 불러오는 중입니다...
                    </div>
                  ) : problemListError ? (
                    <div className={`py-8 text-center ${subtleTextClass}`}>
                      문제 목록을 불러오지 못했습니다.
                    </div>
                  ) : (!contestContextId && !workbookContextId && !isAuthenticated) ? (
                    <div className={`py-8 text-center ${subtleTextClass}`}>
                      로그인 후 문제 목록을 확인할 수 있습니다.
                    </div>
                  ) : problemListItems.length === 0 ? (
                    <div className={`py-8 text-center ${subtleTextClass}`}>
                      표시할 문제가 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {problemListItems.map((item) => {
                        const itemKey = getProblemExternalIdentifier(item);
                        const isCurrentProblem = itemKey ? itemKey === problemIdentifier : false;
                        const displayIdentifier = item.displayId ?? (item as any)._id ?? item.id;
                        return (
                          <button
                            key={`${itemKey ?? displayIdentifier}-${item.id}`}
                            type="button"
                            onClick={() => !isCurrentProblem && openProblemFromList(item)}
                            className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                              isCurrentProblem
                                ? isDarkTheme
                                  ? 'border-blue-500 bg-blue-900/40 text-blue-100'
                                  : 'border-blue-500 bg-blue-50 text-blue-700'
                                : isDarkTheme
                                  ? 'border-slate-700 bg-slate-900/70 hover:bg-slate-800'
                                  : 'border-gray-200 bg-white hover:bg-gray-50'
                            } ${isCurrentProblem ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="truncate text-sm font-semibold">
                                  {displayIdentifier} · {item.title}
                                </div>
                              </div>
                              {isCurrentProblem ? (
                                <span className={`text-xs font-semibold ${isDarkTheme ? 'text-blue-200' : 'text-blue-600'}`}>
                                  현재 문제
                                </span>
                              ) : (
                                <span className={`text-xs font-medium ${isDarkTheme ? 'text-slate-300' : 'text-gray-500'}`}>
                                  이동
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              ) : (
                <section className="space-y-4">
                  {submissionListContent}
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
            problemId={problem?.id}
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
      {isSubmissionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeSubmissionModal}
        >
          <div
            className={`max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg shadow-xl ${isDarkTheme ? 'bg-slate-900 text-slate-100 border border-slate-700' : 'bg-white text-gray-900'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkTheme ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className="text-lg font-semibold">
                {modalSubmissionIdDisplay ? `제출 ${modalSubmissionIdDisplay}` : '제출 상세'}
              </h3>
              <button
                type="button"
                onClick={closeSubmissionModal}
                className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                  isDarkTheme
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                닫기
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-5">
              {submissionModalLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : submissionModalError ? (
                <div className={`py-12 text-center text-sm ${isDarkTheme ? 'text-rose-300' : 'text-red-600'}`}>
                  {submissionModalError}
                </div>
              ) : modalSubmissionCombined ? (
                <>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded ${modalToneStyle.badge}`}>
                        {modalStatusMeta?.code ?? 'INFO'}
                      </span>
                      <span className={`text-sm font-semibold ${isDarkTheme ? 'text-slate-100' : 'text-gray-900'}`}>
                        {modalStatusMeta?.label ?? '채점 중'}
                      </span>
                    </div>
                  </div>
                  <div className={`grid gap-3 text-sm ${isDarkTheme ? 'text-slate-200' : 'text-gray-700'} sm:grid-cols-2`}>
                    <div><span className="font-semibold">제출 ID:</span> {modalSubmissionIdDisplay ?? '-'}</div>
                    <div><span className="font-semibold">문제 ID:</span> {modalProblemIdentifier ?? '-'}</div>
                    <div><span className="font-semibold">언어:</span> {modalLanguage ?? '-'}</div>
                    <div><span className="font-semibold">제출 시각:</span> {modalSubmittedAt ? formatDateTime(modalSubmittedAt) : '-'}</div>
                    <div><span className="font-semibold">실행 시간:</span> {formatExecutionTimeValue(modalExecutionTime)}</div>
                    <div><span className="font-semibold">메모리:</span> {formatMemoryUsageValue(modalMemoryUsage)}</div>
                  </div>
                  <div>
                    <h4 className={`mb-2 font-semibold ${isDarkTheme ? 'text-slate-100' : 'text-gray-900'}`}>소스 코드</h4>
                    <pre className={`overflow-x-auto rounded-md border px-4 py-3 text-xs leading-5 ${
                      isDarkTheme ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-gray-200 bg-gray-900 text-gray-100'
                    }`}>
{modalCodeDisplay}
                    </pre>
                  </div>
                </>
              ) : (
                <div className={`py-12 text-center text-sm ${isDarkTheme ? 'text-slate-400' : 'text-gray-500'}`}>
                  제출 정보를 불러오지 못했습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
