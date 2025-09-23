import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  useContest,
  useContestAccess,
  useContestAnnouncements,
  useContestProblems,
  useContestRank,
} from '../hooks/useContests';
import { useAuthStore } from '../stores/authStore';
import { contestService } from '../services/contestService';
import { Card } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { ContestProblemList } from '../components/organisms/ContestProblemList';
import { ContestRankTable } from '../components/organisms/ContestRankTable';
import { ContestAnnouncement, ContestRankEntry, Problem } from '../types';

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusLabel: Record<string, string> = {
  '1': '시작 예정',
  '0': '진행 중',
  '-1': '종료',
};

type ContestTab = 'overview' | 'announcements' | 'problems' | 'rank';

const tabs: Array<{ id: ContestTab; label: string; requiresAccess?: boolean }> = [
  { id: 'overview', label: '메인' },
  { id: 'announcements', label: '공지', requiresAccess: true },
  { id: 'problems', label: '대회 문제', requiresAccess: true },
  { id: 'rank', label: '랭크', requiresAccess: true },
];

const parseTabFromSearch = (search: string): ContestTab | null => {
  const params = new URLSearchParams(search);
  const candidate = params.get('tab') as ContestTab | null;
  if (candidate && tabs.some((item) => item.id === candidate)) {
    return candidate;
  }
  return null;
};

export const ContestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const contestId = id ? parseInt(id, 10) : 0;
  const navigate = useNavigate();
  const location = useLocation();

  const { data: contest, isLoading, error } = useContest(contestId);
  const requiresPassword = useMemo(
    () => contest?.contestType?.toLowerCase().includes('password') ?? false,
    [contest?.contestType],
  );

  const { user: authUser } = useAuthStore();

  const [contestPhase, setContestPhase] = useState<'before' | 'running' | 'after'>('before');
  const [serverClock, setServerClock] = useState('--:--:--');

  const {
    data: accessData,
    isLoading: accessLoading,
    error: accessError,
  } = useContestAccess(contestId, !!contest && requiresPassword);

  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<ContestTab>(() => parseTabFromSearch(location.search) ?? 'overview');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const offsetRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const [timeLeft, setTimeLeft] = useState('-');

  const startTimeMs = useMemo(() => (contest?.startTime ? new Date(contest.startTime).getTime() : Number.NaN), [contest?.startTime]);
  const endTimeMs = useMemo(() => (contest?.endTime ? new Date(contest.endTime).getTime() : Number.NaN), [contest?.endTime]);

  const canViewProtectedContent = hasAccess && contestPhase === 'running';

  useEffect(() => {
    const queryTab = parseTabFromSearch(location.search);
    if (queryTab && queryTab !== activeTab) {
      setActiveTab(queryTab);
    }
  }, [location.search]);

  useEffect(() => {
    if (contest && !requiresPassword) {
      setHasAccess(true);
    }
  }, [contest, requiresPassword]);

  useEffect(() => {
    if (accessData?.access) {
      setHasAccess(true);
    }
  }, [accessData]);

  useEffect(() => {
    if (accessError instanceof Error) {
      setPasswordError(accessError.message);
    }
  }, [accessError]);

  useEffect(() => {
    if (!contest) {
      offsetRef.current = 0;
      return;
    }
    const serverNow = contest.now ? new Date(contest.now).getTime() : NaN;
    offsetRef.current = Number.isNaN(serverNow) ? 0 : serverNow - Date.now();
  }, [contest?.id, contest?.now]);

  useEffect(() => {
    const update = () => {
      const nowWithOffset = Date.now() + offsetRef.current;
      if (Number.isNaN(nowWithOffset)) {
        setServerClock('--:--:--');
        setContestPhase('before');
        setTimeLeft('-');
        return;
      }

      const serverDate = new Date(nowWithOffset);
      setServerClock(serverDate.toLocaleTimeString('ko-KR', { hour12: false }));

      if (!Number.isNaN(startTimeMs) && nowWithOffset < startTimeMs) {
        setContestPhase((prev) => (prev !== 'before' ? 'before' : prev));
      } else if (!Number.isNaN(endTimeMs) && nowWithOffset > endTimeMs) {
        setContestPhase((prev) => (prev !== 'after' ? 'after' : prev));
      } else {
        setContestPhase((prev) => (prev !== 'running' ? 'running' : prev));
      }

      if (Number.isNaN(endTimeMs)) {
        setTimeLeft('-');
        return;
      }

      const diff = endTimeMs - nowWithOffset;
      if (diff <= 0) {
        setTimeLeft('대회가 종료되었습니다.');
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const formatted = `${days ? `${days}일 ` : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setTimeLeft(formatted);
    };

    update();
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    intervalRef.current = window.setInterval(update, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startTimeMs, endTimeMs]);

  const {
    data: announcements = [] as ContestAnnouncement[],
    isLoading: announcementsLoading,
    error: announcementsError,
    refetch: refetchAnnouncements,
  } = useContestAnnouncements(contestId, canViewProtectedContent);

  const {
    data: problems = [] as Problem[],
    isLoading: problemsLoading,
    error: problemsError,
    refetch: refetchProblems,
  } = useContestProblems(contestId, canViewProtectedContent);

  const {
    data: rankData,
    isLoading: rankLoading,
    error: rankError,
    refetch: refetchRank,
  } = useContestRank(contestId, canViewProtectedContent && activeTab === 'rank');

  const rankEntries: ContestRankEntry[] = rankData?.results ?? [];

  const myRankProgress = useMemo(() => {
    if (!authUser?.id || !contest) return {} as Record<number, string>;
    const entry = rankEntries.find((item) => item.user?.id === authUser.id);
    if (!entry || !entry.submissionInfo) return {} as Record<number, string>;

    const result: Record<number, string> = {};
    const submissionInfo = entry.submissionInfo as Record<string, any>;
    const scoreLookup = new Map<number, number>(
      problems.map((problem) => [problem.id, problem.totalScore ?? 0]),
    );

    if (contest.ruleType === 'ACM') {
      Object.entries(submissionInfo).forEach(([problemKey, info]) => {
        const numericId = Number(problemKey);
        if (!Number.isFinite(numericId)) return;
        if (info?.is_ac) {
          result[numericId] = 'AC';
          return;
        }
        if ((info?.error_number ?? 0) > 0) {
          result[numericId] = 'WA';
        }
      });
    } else {
      Object.entries(submissionInfo).forEach(([problemKey, scoreValue]) => {
        const numericId = Number(problemKey);
        if (!Number.isFinite(numericId)) return;
        const score = Number(scoreValue);
        if (!Number.isFinite(score)) return;
        const fullScore = scoreLookup.get(numericId) ?? 0;
        if (fullScore > 0 && score >= fullScore) {
          result[numericId] = 'AC';
        } else if (score > 0) {
          result[numericId] = 'TRIED';
        } else {
          result[numericId] = 'WA';
        }
      });
    }

    return result;
  }, [authUser?.id, rankEntries, contest, problems]);

  const problemSummary = useMemo(() => {
    if (!canViewProtectedContent) return '-- / --';
    if (problemsLoading) return '로딩 중...';
    const total = problems.length;
    const solved = problems.reduce((count, problem) => {
      const rawStatus = problem.myStatus ?? (problem as any).my_status;
      const normalized = rawStatus == null ? '' : String(rawStatus).trim().toUpperCase();
      const isSolved = problem.solved || normalized === 'AC' || normalized === 'ACCEPTED' || normalized === '0';
      return isSolved ? count + 1 : count;
    }, 0);
    return `${solved} / ${total}`;
  }, [canViewProtectedContent, problemsLoading, problems]);

  const contestStatus = contest?.status ?? '';
  const timeLeftDisplay = timeLeft || '-';
  const timeTextClass = timeLeft.includes('종료')
    ? 'text-red-600 dark:text-red-400'
    : 'text-slate-900 dark:text-slate-100';

  const disabledTabs = (tab: ContestTab) => {
    const tabConfig = tabs.find((item) => item.id === tab);
    if (!tabConfig?.requiresAccess) {
      return false;
    }
    if (contestPhase !== 'running') {
      return true;
    }
    return !hasAccess;
  };

  const handleTabChange = useCallback((tabId: ContestTab) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(location.search);
    params.set('tab', tabId);
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const requestedTab = parseTabFromSearch(location.search);
    if (requestedTab && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [location.search]);

  const passwordMutation = useMutation({
    mutationFn: (formPassword: string) => contestService.verifyContestPassword(contestId, formPassword),
    onSuccess: () => {
      setPassword('');
      setPasswordError(null);
      setHasAccess(true);
      if (contestPhase === 'running') {
        refetchAnnouncements();
        refetchProblems();
        if (activeTab === 'rank') {
          refetchRank();
        }
      }
    },
    onError: (mutError: unknown) => {
      if (mutError instanceof Error) {
        setPasswordError(mutError.message);
      } else {
        setPasswordError('비밀번호 인증에 실패했습니다.');
      }
    },
  });

  const handlePasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password.trim()) {
      setPasswordError('비밀번호를 입력해주세요.');
      return;
    }
    passwordMutation.mutate(password.trim());
  };

  if (!contestId) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg">유효하지 않은 대회입니다.</div>
        <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/contests')}>
          대회 목록으로 돌아가기
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg mb-4">대회를 불러오지 못했습니다.</div>
        <p className="text-gray-600">{error instanceof Error ? error.message : '정보를 가져오는 중 오류가 발생했습니다.'}</p>
        <Button variant="secondary" className="mt-6" onClick={() => navigate('/contests')}>
          대회 목록으로 이동
        </Button>
      </div>
    );
  }

  const renderOverview = () => {
    const overviewItems = [
      { label: '시작 시간', value: formatDateTime(contest.startTime) },
      { label: '종료 시간', value: formatDateTime(contest.endTime) },
      { label: '대회장', value: contest.createdBy.username },
      { label: '실시간 랭크', value: contest.realTimeRank ? '사용' : '캐시 사용' },
      { label: '규칙 유형', value: contest.ruleType },
      { label: '상태', value: (statusLabel[contestStatus] ?? contestStatus) || '-' },
    ];

    return (
      <div className="space-y-6">
        <Card className="border-0 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {contest.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                      {contest.ruleType}
                    </span>
                    {contest.contestType && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {contest.contestType === 'Password Protected' ? '비밀번호 필요' : contest.contestType}
                      </span>
                    )}
                    {contestStatus && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                        {statusLabel[contestStatus] ?? contestStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                대회의 진행 시간과 규칙, 실시간 랭크 여부 등을 한눈에 확인하고 준비하세요.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {overviewItems.map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl bg-slate-100/80 px-4 py-4 text-sm dark:bg-slate-800/70"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {label}
                  </div>
                  <div className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="prose max-w-none leading-relaxed text-slate-700 dark:prose-invert dark:text-slate-200">
              <div dangerouslySetInnerHTML={{ __html: contest.description }} />
            </div>
          </div>
        </Card>

        {requiresPassword && !hasAccess && (
          <Card className="border border-blue-200/70 bg-blue-50/70 p-6 dark:border-blue-400/40 dark:bg-blue-900/20 dark:text-blue-100">
            <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-100 mb-3">비밀번호 인증 필요</h2>
            <p className="text-sm text-blue-700/80 dark:text-blue-200/90 mb-4">
              이 대회는 비밀번호가 필요합니다. 비밀번호를 입력해 주세요.
            </p>
            <form onSubmit={handlePasswordSubmit} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setPasswordError(null);
                }}
                className="w-full sm:w-64 rounded-lg border border-blue-200 bg-white px-4 py-2 text-blue-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:border-blue-400/60 dark:bg-slate-900 dark:text-blue-100"
                placeholder="비밀번호"
                disabled={passwordMutation.isLoading}
              />
              <Button
                type="submit"
                loading={passwordMutation.isLoading}
              >
                입장하기
              </Button>
            </form>
            {(passwordError || accessLoading) && (
              <div className="mt-3 text-sm text-red-600 dark:text-red-300">
                {accessLoading ? '접근 권한을 확인하는 중입니다.' : passwordError}
              </div>
            )}
          </Card>
        )}
      </div>
    );
  };

  const renderAnnouncements = () => {
    if (contestPhase !== 'running') {
      return <div className="text-sm text-gray-600">대회 진행 중에만 공지를 확인할 수 있습니다.</div>;
    }

    if (!hasAccess) {
      return <div className="text-sm text-gray-600">비밀번호 인증 후 공지를 확인할 수 있습니다.</div>;
    }

    if (announcementsLoading) {
      return (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (announcementsError) {
      return <div className="text-sm text-red-600">공지사항을 불러오는 중 오류가 발생했습니다.</div>;
    }

    if (!announcements.length) {
      return (
        <div className="flex min-h-[120px] items-center justify-center py-6 text-center text-base text-gray-500">
          등록된 공지가 없습니다.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">{announcement.title}</h3>
              <span className="text-xs text-gray-500">{formatDateTime(announcement.createdAt)}</span>
            </div>
            <div className="prose prose-sm max-w-none text-gray-700">
              <div dangerouslySetInnerHTML={{ __html: announcement.content }} />
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderProblems = () => {
    if (contestPhase !== 'running') {
      return (
        <div className="text-sm text-gray-600">
          {contestPhase === 'before'
            ? '대회 시작 이후에 문제를 공개합니다.'
            : '대회가 종료되어 문제 열람이 제한됩니다.'}
        </div>
      );
    }

    if (!hasAccess) {
      return <div className="text-sm text-gray-600">비밀번호 인증 후 문제를 확인할 수 있습니다.</div>;
    }

    if (problemsLoading) {
      return (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (problemsError) {
      return <div className="text-sm text-red-600">문제 목록을 불러오는 중 오류가 발생했습니다.</div>;
    }

    return (
      <ContestProblemList
        problems={problems}
        onProblemClick={(problem) => {
          const displayId = problem.displayId ?? problem.id;
          const query = new URLSearchParams();
          query.set('contestId', String(contestId));
          if (displayId != null) {
            query.set('displayId', String(displayId));
          }
          navigate(`/problems/${problem.id}?${query.toString()}`);
        }}
        disabled={contestPhase !== 'running'}
        statusOverrides={myRankProgress}
      />
    );
  };

  const renderRank = () => {
    if (contestPhase !== 'running') {
      return (
        <div className="text-sm text-gray-600">
          {contestPhase === 'before'
            ? '대회 시작 후에 랭크가 공개됩니다.'
            : '대회가 종료되어 랭크 확인이 제한됩니다.'}
        </div>
      );
    }

    if (!hasAccess) {
      return <div className="text-sm text-gray-600">비밀번호 인증 후 랭크를 확인할 수 있습니다.</div>;
    }

    if (rankLoading) {
      return (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (rankError) {
      return <div className="text-sm text-red-600">랭크 정보를 불러오는 중 오류가 발생했습니다.</div>;
    }

    return <ContestRankTable entries={rankEntries} ruleType={contest.ruleType} />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {contestPhase !== 'running' && (
        <Card className="mb-6 border border-amber-200 bg-amber-50 px-6 py-4 text-amber-800 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-100">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-semibold">
              {contestPhase === 'before' ? '대회 시작 전입니다.' : '대회가 종료되었습니다.'}
            </span>
            <span className="text-sm">현재 서버 시간: <span className="font-mono text-base">{serverClock}</span></span>
          </div>
        </Card>
      )}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-stretch">
        <Button
          variant="secondary"
          onClick={() => navigate('/contests')}
          className="w-full md:w-auto md:self-start"
        >
          ← 대회 목록으로 돌아가기
        </Button>
        <div className="md:ml-auto md:w-fit">
          <Card className="border-0 bg-white p-4 shadow-md dark:border-slate-800 dark:bg-slate-900 md:min-w-[320px]">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 flex-col rounded-xl bg-blue-50 px-4 py-2.5 dark:bg-blue-900/30">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
                  남은 시간
                </span>
                <span className={`mt-1 text-base font-semibold sm:text-lg ${timeTextClass} whitespace-nowrap`}>{timeLeftDisplay}</span>
              </div>
              <div className="flex flex-1 flex-col rounded-xl bg-sky-50 px-4 py-2.5 dark:bg-sky-900/30">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-200">
                  맞힌 문제 / 전체 문제
                </span>
                <span className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg whitespace-nowrap">{problemSummary}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-40 xl:w-52 space-y-2">
          {tabs.map((tab) => {
            const disabled = disabledTabs(tab.id);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (!disabled) {
                    handleTabChange(tab.id);
                  }
                }}
                disabled={disabled}
                aria-disabled={disabled}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-blue-50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {tab.label}
              </button>
            );
          })}
        </aside>

        <div className="flex-1 space-y-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'announcements' && renderAnnouncements()}
          {activeTab === 'problems' && renderProblems()}
          {activeTab === 'rank' && renderRank()}
        </div>
      </div>
    </div>
  );
};
