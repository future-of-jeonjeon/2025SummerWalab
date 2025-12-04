import React, { useMemo, useState } from 'react';
import type { ContestRankEntry, Problem } from '../../../types';
import { contestService } from '../../../services/contestService';
import { submissionService } from '../../../services/submissionService';
import type { SubmissionDetail, SubmissionListItem } from '../../../services/submissionService';

type ProblemStatus = { status: 'ac' | 'tried' | 'unknown'; errors?: number; acTime?: number };
type CaseEntry = { id: string; result?: number | string; success: boolean };

interface ContestSubmissionDetailsTabProps {
  contestId: number;
  isAdminUser: boolean;
  rankEntries: ContestRankEntry[];
  problems?: Problem[];
}

export const ContestSubmissionDetailsTab: React.FC<ContestSubmissionDetailsTabProps> = ({
  contestId,
  isAdminUser,
  rankEntries,
  problems = [],
}) => {
  const [mode, setMode] = useState<'scoreboard' | 'submissions'>('scoreboard');
  const [selectedUser, setSelectedUser] = useState<{ id: number; username: string } | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [codeModal, setCodeModal] = useState<{ open: boolean; code?: string; loading: boolean; error?: string }>({
    open: false,
    loading: false,
  });
  const [caseModal, setCaseModal] = useState<{
    open: boolean;
    loading: boolean;
    error?: string;
    cases?: CaseEntry[];
    submissionId?: number | string;
  }>({
    open: false,
    loading: false,
  });
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const formatKSTDateTime = (value: unknown): string => {
    if (typeof value !== 'string') return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const parseTestCases = (detail: SubmissionDetail | null | undefined): CaseEntry[] => {
    const data = (detail as SubmissionDetail & { info?: { data?: unknown } } | null | undefined)?.info?.data;
    if (!Array.isArray(data)) return [];

    return data
      .map<CaseEntry | null>((item, idx) => {
        if (item === null || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const rawId = record.test_case ?? record.test_case_id ?? idx + 1;
        const id = rawId != null ? String(rawId) : String(idx + 1);
        const rawResult = record.result ?? record.error ?? record.status;
        const numeric = typeof rawResult === 'number' ? rawResult : Number(rawResult);
        const success =
          (typeof rawResult === 'string' && ['ac', 'accepted', 'success'].includes(rawResult.toLowerCase())) ||
          numeric === 0;
        return { id, result: rawResult as number | string | undefined, success };
      })
      .filter((item): item is CaseEntry => item !== null);
  };

  const renderResultLabel = (status: unknown): string => {
    // Normalize numeric codes: 0 => 성공, others => 실패
    if (typeof status === 'number') {
      return status === 0 ? '성공' : '실패';
    }
    if (typeof status === 'string') {
      const trimmed = status.trim().toLowerCase();
      if (trimmed === '0') return '성공';
      // Known success tokens
      if (['ac', 'accepted', 'success'].includes(trimmed)) return '성공';
      // Known failure tokens
      if (
        ['wa', 'wrong answer', 'tle', 'mle', 're', 'ce', 'runtime error', 'compile error', 'fail', 'failed'].includes(trimmed)
      ) {
        return '실패';
      }
      // Pending/other
      if (['pending', 'judging', 'queue', 'processing'].includes(trimmed)) return '채점 중';
    }
    return '알 수 없음';
  };

  const problemList = useMemo(() => {
    const sorted = [...(problems ?? [])].sort((a, b) => {
      const da = String(a.displayId ?? a.id ?? '').toLowerCase();
      const db = String(b.displayId ?? b.id ?? '').toLowerCase();
      return da.localeCompare(db, undefined, { numeric: true, sensitivity: 'base' });
    });
    return sorted;
  }, [problems]);

  const scoreboardEntries = useMemo<Array<ContestRankEntry & { problemStatuses: Array<ProblemStatus & { score?: number }> }>>(() => {
    return rankEntries.map((entry) => {
      const infoMap = entry.submissionInfo as Record<string, unknown> | undefined;
      const problemStatuses = problemList.map((problem) => {
        const pid = problem.id;
        if (!pid) return { status: 'unknown' as const };
        const info = infoMap?.[pid] ?? infoMap?.[String(pid)];
        let status: ProblemStatus['status'] = 'unknown';
        if (info) {
          if (typeof info === 'object') {
            const record = info as Record<string, unknown>;
            const isAc = record.is_ac === true || record.is_ac === 'true';
            status = isAc ? 'ac' : 'tried';
          } else {
            const numeric = Number(info);
            status = Number.isFinite(numeric) && numeric > 0 ? 'tried' : 'unknown';
          }
        }
        return { status };
      });

      return {
        ...entry,
        problemStatuses,
      };
    });
  }, [rankEntries, problemList]);

  const handleCellClick = async (userId: number, username: string, problem: Problem) => {
    setSelectedUser({ id: userId, username });
    setSelectedProblem(problem);
    setMode('submissions');
    setSubmissionsLoading(true);
    setSubmissionsError(null);

    try {
      const resp = await contestService.getContestSubmissions(contestId, {
        userId,
        username,
        // Contest submissions API expects the problem's display/_id, not the PK
        problemId: problem.displayId ?? problem._id ?? problem.id,
      });
      setSubmissions(resp.data || []);
    } catch (error) {
      setSubmissionsError(error instanceof Error ? error.message : '제출을 불러오지 못했습니다.');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleOpenCode = async (submissionId: number | string | undefined) => {
    if (!submissionId) return;
    setCodeModal({ open: true, loading: true });
    try {
      const detail = await submissionService.getSubmission(submissionId);
      const code = detail.code;
      setCodeModal({ open: true, loading: false, code });
    } catch (error) {
      setCodeModal({
        open: true,
        loading: false,
        error: error instanceof Error ? error.message : '코드를 불러오지 못했습니다.',
      });
    }
  };

  const handleOpenCaseModal = async (submissionId: number | string | undefined) => {
    if (!submissionId) return;
    setCaseModal({ open: true, loading: true, submissionId });
    try {
      const detail = await submissionService.getSubmission(submissionId);
      const cases = parseTestCases(detail);
      setCaseModal({
        open: true,
        loading: false,
        cases,
        submissionId,
        error: cases.length === 0 ? '테스트 케이스 정보를 찾을 수 없습니다.' : undefined,
      });
    } catch (error) {
      setCaseModal({
        open: true,
        loading: false,
        submissionId,
        error: error instanceof Error ? error.message : '테스트 케이스를 불러오지 못했습니다.',
      });
    }
  };

  if (!isAdminUser) {
    return <div className="text-sm text-gray-600">관리자만 제출 상세정보를 확인할 수 있습니다.</div>;
  }

  if (mode === 'submissions' && selectedUser && selectedProblem) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMode('scoreboard')}
            className="px-4 py-2 rounded-md border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            목록으로 돌아가기
          </button>
          <div className="text-sm font-semibold text-gray-800">
            {selectedUser.username}의 제출기록
          </div>
        </div>
        {submissionsLoading ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 animate-pulse">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="grid grid-cols-5 gap-4">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
              </div>
            </div>
            <div className="divide-y divide-gray-200 bg-white">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="grid grid-cols-5 gap-4 items-center">
                    <div className="h-4 bg-gray-200 rounded w-12"></div>
                    <div className="h-4 bg-gray-200 rounded w-10"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-8 bg-gray-200 rounded w-16 mx-auto"></div>
                    <div className="h-8 bg-gray-200 rounded w-20 mx-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : submissionsError ? (
          <div className="text-sm text-red-600">{submissionsError}</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">결과</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">언어</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">제출 시각</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">코드</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">테스트 결과</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {submissions.map((item) => {
                  const createdAt =
                    'create_time' in item && typeof item.create_time === 'string'
                      ? item.create_time
                      : 'createTime' in item && typeof (item as SubmissionListItem & { createTime?: string }).createTime === 'string'
                        ? (item as SubmissionListItem & { createTime?: string }).createTime
                        : undefined;
                  const submissionId = item.id ?? item.submissionId;
                  const statusRaw = item.status ?? item.result ?? '-';
                  const statusText = renderResultLabel(statusRaw);
                  return (
                    <tr key={String(submissionId ?? Math.random())}>
                      <td className="px-4 py-2 text-gray-800">{statusText}</td>
                      <td className="px-4 py-2 text-gray-800">
                        {item.language ??
                          ('language_name' in item && typeof (item as SubmissionListItem & { language_name?: string }).language_name === 'string'
                            ? (item as SubmissionListItem & { language_name?: string }).language_name
                            : '-')}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{formatKSTDateTime(createdAt)}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenCode(submissionId)}
                          className="px-3 py-1 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 bg-white"
                        >
                          소스 보기
                        </button>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenCaseModal(submissionId)}
                          className="px-3 py-1 rounded-md border border-indigo-200 text-sm text-indigo-700 hover:bg-indigo-50 bg-indigo-50"
                        >
                          케이스 결과
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      제출 기록이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {codeModal.open && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setCodeModal({ open: false, loading: false })}>
            <div
              className="bg-slate-900 text-slate-100 rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-auto p-4 border border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end mb-2">
                <button
                  type="button"
                  onClick={() => setCodeModal({ open: false, loading: false })}
                  className="text-sm text-slate-300 hover:text-white"
                >
                  닫기
                </button>
              </div>
              {codeModal.loading ? (
                <div className="animate-pulse space-y-2 p-4">
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                  <div className="h-4 bg-slate-700 rounded w-2/3"></div>
                  <div className="h-4 bg-slate-700 rounded w-4/5"></div>
                </div>
              ) : codeModal.error ? (
                <div className="text-sm text-red-400">{codeModal.error}</div>
              ) : (
                <pre className="whitespace-pre-wrap text-xs bg-slate-800 text-slate-100 rounded-md p-3 border border-slate-700">
                  {codeModal.code ?? '코드가 없습니다.'}
                </pre>
              )}
            </div>
          </div>
        )}

        {caseModal.open && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setCaseModal({ open: false, loading: false })}>
            <div
              className="bg-white rounded-lg shadow-xl max-w-sm w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="text-sm font-semibold text-gray-800">테스트 케이스 결과</div>
                <button
                  type="button"
                  onClick={() => setCaseModal({ open: false, loading: false })}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  닫기
                </button>
              </div>
              <div className="px-5 py-4 max-h-[70vh] overflow-auto">
                {caseModal.loading ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="grid grid-cols-2 gap-4 px-1">
                      <div className="h-4 bg-gray-200 rounded mx-auto w-12"></div>
                      <div className="h-4 bg-gray-200 rounded mx-auto w-12"></div>
                    </div>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-10 bg-gray-100 rounded border border-gray-200"></div>
                    ))}
                  </div>
                ) : caseModal.error ? (
                  <div className="text-sm text-red-600">{caseModal.error}</div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 items-center text-xs font-semibold text-gray-600 px-1">
                      <div className="text-center">케이스</div>
                      <div className="text-center">결과</div>
                    </div>
                    {(caseModal.cases ?? []).map((tc) => {
                      const success = tc.success;
                      const rowTone = success ? 'bg-green-50 text-green-800 border-green-200' : 'bg-rose-50 text-rose-800 border-rose-200';
                      const label = success ? '성공' : '실패';
                      return (
                        <div
                          key={tc.id}
                          className={`grid grid-cols-2 items-center place-items-center rounded-md border px-1 py-2 text-sm ${rowTone}`}
                        >
                          <div className="font-semibold text-center">{tc.id}</div>
                          <div className="font-semibold text-center">{label}</div>
                        </div>
                      );
                    })}
                    {(caseModal.cases ?? []).length === 0 && (
                      <div className="text-sm text-gray-600">테스트 케이스 정보를 확인할 수 없습니다.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  // 제출 상세 테이블 레이아웃 설정
  const baseColumnsPx = [64, 90, 56, 56]; // 순위, 유저(전체 이름 표시 위해 확대), 해결, 점수
  const problemColumnWidth = 58;
  const gapPx = 8;
  const TABLE_OUTER_MAX = 1000; // 표 전체 컨테이너 고정폭
  const baseWidthSum = baseColumnsPx.reduce((a, b) => a + b, 0);
  const columnsWidth =
    baseWidthSum +
    problemList.length * problemColumnWidth +
    (problemList.length + baseColumnsPx.length - 1) * gapPx;
  const minTableWidthPx = Math.max(columnsWidth, TABLE_OUTER_MAX);
  const gridTemplateColumns = `${baseColumnsPx.map((v) => `${v}px`).join(' ')} repeat(${problemList.length}, ${problemColumnWidth}px)`;
  const rankWidth = baseColumnsPx[0];

  const stickyHeaderStyles = [
    { position: 'sticky' as const, left: 0, zIndex: 3, background: '#f8fafc' },
    { position: 'sticky' as const, left: rankWidth, zIndex: 3, background: '#f8fafc' },
  ];
  const stickyBodyBase = {
    position: 'sticky' as const,
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '0 6px',
  };

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 mx-auto"
      style={{ width: `${TABLE_OUTER_MAX}px` }}
    >
      <div className="w-full overflow-x-auto">
        <div
          className="inline-block bg-white"
          style={{
            minWidth: `${minTableWidthPx}px`,
            width: `${minTableWidthPx}px`,
          }}
        >
          <div className="border-b border-gray-200 bg-gray-50 px-1 py-4">
            <div className="grid items-center gap-x-2" style={{ gridTemplateColumns }}>
              <div className="text-center text-sm font-medium text-gray-500 uppercase tracking-wider" style={stickyHeaderStyles[0]}>
                순위
              </div>
              <div className="text-center text-sm font-medium text-gray-500 uppercase tracking-wider" style={stickyHeaderStyles[1]}>
                유저
              </div>
              <div className="text-center text-sm font-medium text-gray-500 uppercase tracking-wider">해결</div>
              <div className="text-center text-sm font-medium text-gray-500 uppercase tracking-wider">점수</div>
              {problemList.map((_, idx) => (
                <div key={`problem-header-${idx}`} className="text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  {idx + 1}
                </div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {scoreboardEntries.map((entry, index) => (
              <div
                key={entry.id ?? index}
                className="px-1 py-4 transition-colors"
                onMouseEnter={() => setHoveredRow(index)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{ backgroundColor: hoveredRow === index ? '#f8fafc' : '#ffffff' }}
              >
                <div className="grid items-center gap-x-2" style={{ gridTemplateColumns }}>
                  <div
                    className="text-center font-semibold text-gray-800"
                    style={{
                      ...stickyBodyBase,
                      left: 0,
                      backgroundColor: hoveredRow === index ? '#f8fafc' : '#ffffff',
                    }}
                  >
                    {index + 1}
                  </div>
                  <div
                    style={{
                      ...stickyBodyBase,
                      left: rankWidth,
                      backgroundColor: hoveredRow === index ? '#f8fafc' : '#ffffff',
                    }}
                  >
                    <div className="text-sm font-medium text-gray-900 text-center w-full">
                      {entry.user.realName || entry.user.username}
                    </div>
                  </div>
                  <div className="text-center text-sm text-gray-700">
                    {(entry.acceptedNumber ?? 0)}/{problemList.length}
                  </div>
                  <div className="text-center text-sm text-gray-700">{entry.totalScore ?? 0}</div>
                  {problemList.map((problem, pIdx) => {
                    const info = entry.problemStatuses ? entry.problemStatuses[pIdx] : null;
                    const status = info?.status ?? 'unknown';
                    const bg =
                      status === 'ac'
                        ? 'bg-green-100 text-green-700'
                        : status === 'tried'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-gray-100 text-gray-400';
                    const labelScore = info?.score;
                    const label = labelScore != null ? `${labelScore}` : status === 'ac' ? 'AC' : status === 'tried' ? 'T' : '-';
                    const handleClick = () => {
                      if (entry.user?.id) {
                        handleCellClick(entry.user.id, entry.user.username, problem);
                      }
                    };
                    return (
                      <button
                        key={problem.id}
                        type="button"
                        onClick={handleClick}
                        className={`w-full h-full px-2 py-2 text-xs font-semibold rounded ${bg} transition-colors hover:opacity-90`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
