import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import { resolveProblemStatus } from '../utils/problemStatus';
import { submissionService, SubmissionListItem, SubmissionDetail } from '../services/submissionService';
import { PROBLEM_STATUS_LABELS, PROBLEM_SUMMARY_LABELS, ProblemStatusKey } from '../constants/problemStatus';

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

type ContestTab = 'overview' | 'announcements' | 'problems' | 'rank' | 'submission-details';

const baseTabs: Array<{ id: ContestTab; label: string; requiresAccess?: boolean }> = [
  { id: 'overview', label: '메인' },
  { id: 'announcements', label: '공지', requiresAccess: true },
  { id: 'problems', label: '대회 문제', requiresAccess: true },
  { id: 'rank', label: '랭크', requiresAccess: true },
];

const parseTabFromSearch = (search: string, availableTabs: Array<{ id: ContestTab }>): ContestTab | null => {
  const params = new URLSearchParams(search);
  const candidate = params.get('tab') as ContestTab | null;
  if (candidate && availableTabs.some((item) => item.id === candidate)) {
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
  const isAdminUser = useMemo(() => authUser?.admin_type?.includes('Admin') ?? false, [authUser?.admin_type]);

  const tabs = useMemo(() => {
    const list = [...baseTabs];
    if (isAdminUser) {
      list.splice(4, 0, { id: 'submission-details', label: '제출 상세정보', requiresAccess: true });
    }
    return list;
  }, [isAdminUser]);

  const [contestPhase, setContestPhase] = useState<'before' | 'running' | 'after'>('before');
  const [serverClock, setServerClock] = useState('--:--:--');

  const {
    data: accessData,
    isLoading: accessLoading,
    error: accessError,
  } = useContestAccess(contestId, !!contest && requiresPassword);

  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<ContestTab>(() => parseTabFromSearch(location.search, baseTabs) ?? 'overview');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [problemSearchQuery, setProblemSearchQuery] = useState('');
  const [problemSearchField, setProblemSearchField] = useState<'title' | 'tag' | 'number'>('title');
  const [problemSortField, setProblemSortField] = useState<'number' | 'submission' | 'accuracy'>('number');
  const [problemSortOrder, setProblemSortOrder] = useState<'asc' | 'desc'>('asc');
const [problemStatusFilter, setProblemStatusFilter] = useState<'all' | ProblemStatusKey>('all');

  const offsetRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const [timeLeft, setTimeLeft] = useState('-');

  const startTimeMs = useMemo(() => (contest?.startTime ? new Date(contest.startTime).getTime() : Number.NaN), [contest?.startTime]);
  const endTimeMs = useMemo(() => (contest?.endTime ? new Date(contest.endTime).getTime() : Number.NaN), [contest?.endTime]);

  const canViewProtectedContent = hasAccess && contestPhase === 'running';

  useEffect(() => {
    const queryTab = parseTabFromSearch(location.search, tabs);
    if (queryTab && queryTab !== activeTab) {
      setActiveTab(queryTab);
    }
  }, [location.search, tabs, activeTab]);

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
  }, [contest]);

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

  const shouldLoadRank = canViewProtectedContent && (activeTab === 'rank' || activeTab === 'problems');
  const {
    data: rankData,
    isLoading: rankLoading,
    error: rankError,
    refetch: refetchRank,
  } = useContestRank(contestId, shouldLoadRank);

  const rankEntries: ContestRankEntry[] = useMemo(
    () => rankData?.results ?? [],
    [rankData],
  );

  const {
    data: contestSubmissions,
    isLoading: submissionsLoading,
    error: submissionsError,
  } = useQuery<{ data: SubmissionListItem[]; total: number }, Error>({
    queryKey: ['contest-submissions', contestId, isAdminUser, activeTab === 'submission-details'],
    queryFn: () => contestService.getContestSubmissions(contestId, { limit: 2000 }),
    enabled: isAdminUser && activeTab === 'submission-details' && !!contestId,
  });

  type SubmissionGroup = { userId: number; username: string; submissions: SubmissionListItem[] };
  type SubmissionWithUserMeta = SubmissionListItem & {
    user?: { id?: number; username?: string };
  };

  const submissionGroups = useMemo<SubmissionGroup[]>(() => {
    if (!contestSubmissions?.data) {
      return [];
    }

    const map = new Map<number, SubmissionGroup>();
    contestSubmissions.data.forEach((rawItem) => {
      const item = rawItem as SubmissionWithUserMeta;
      const candidateIds = [item.user?.id, item.user_id, item.userId];
      const resolvedUserId = candidateIds.find((value): value is number => typeof value === 'number' && Number.isFinite(value)) ?? 0;
      const fallbackName = resolvedUserId ? `User ${resolvedUserId}` : '알 수 없는 사용자';
      const username =
        (typeof item.user?.username === 'string' && item.user.username) ||
        (typeof item.username === 'string' && item.username) ||
        fallbackName;

      if (!map.has(resolvedUserId)) {
        map.set(resolvedUserId, { userId: resolvedUserId, username, submissions: [] });
      }

      map.get(resolvedUserId)!.submissions.push(rawItem);
    });

    return Array.from(map.values()).sort((a, b) => a.userId - b.userId);
  }, [contestSubmissions]);

  const [isSubmissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [submissionModalLoading, setSubmissionModalLoading] = useState(false);
  const [submissionModalError, setSubmissionModalError] = useState<string | null>(null);
  const [selectedSubmissionDetail, setSelectedSubmissionDetail] = useState<SubmissionDetail | null>(null);

  const closeSubmissionModal = useCallback(() => {
    setSubmissionModalOpen(false);
    setSubmissionModalLoading(false);
    setSubmissionModalError(null);
    setSelectedSubmissionDetail(null);
  }, []);

  const handleContestProblemSearchChange = (value: string) => {
    setProblemSearchQuery(value);
  };

  const handleContestProblemSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProblemSearchQuery((prev) => prev.trim());
  };

  const handleContestProblemSearchFieldChange = (value: string) => {
    const nextField = (value || 'title') as typeof problemSearchField;
    setProblemSearchField(nextField);
  };

  const handleContestProblemSortToggle = (field: 'number' | 'submission' | 'accuracy') => {
    setProblemSortOrder((prevOrder) => {
      if (problemSortField === field) {
        return prevOrder === 'asc' ? 'desc' : 'asc';
      }
      return 'asc';
    });
    setProblemSortField(field);
  };

  const handleContestProblemStatusFilterChange = (value: string) => {
    if (value === 'all') {
      setProblemStatusFilter('all');
      return;
    }
    if (Object.values(PROBLEM_STATUS_LABELS).includes(value as ProblemStatusKey)) {
      setProblemStatusFilter(value as ProblemStatusKey);
    } else {
      setProblemStatusFilter('all');
    }
  };

  const handleContestProblemReset = () => {
    setProblemSearchQuery('');
    setProblemSearchField('title');
    setProblemSortField('number');
    setProblemSortOrder('asc');
    setProblemStatusFilter('all');
  };

  const handleSubmissionClick = useCallback(async (submissionId: number | string | undefined) => {
    if (submissionId == null) {
      return;
    }
    setSubmissionModalOpen(true);
    setSubmissionModalLoading(true);
    setSubmissionModalError(null);
    try {
      const detail = await submissionService.getSubmission(submissionId);
      setSelectedSubmissionDetail(detail);
    } catch (err) {
      const message = err instanceof Error ? err.message : '제출 내용을 불러오지 못했습니다.';
      setSubmissionModalError(message);
    } finally {
      setSubmissionModalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'submission-details' && isSubmissionModalOpen) {
      closeSubmissionModal();
    }
  }, [activeTab, isSubmissionModalOpen, closeSubmissionModal]);

  type AcmSubmissionDetail = {
    is_ac?: boolean;
    ac_time?: number | string;
    error_number?: number;
    is_first_ac?: boolean;
  };

  const myRankProgress = useMemo(() => {
    if (!authUser?.id || !contest) return {} as Record<number, string>;
    const entry = rankEntries.find((item) => item.user?.id === authUser.id);
    if (!entry || !entry.submissionInfo) return {} as Record<number, string>;

    const result: Record<number, string> = {};
    const submissionInfo = entry.submissionInfo ?? {};
    const scoreLookup = new Map<number, number>(
      problems.map((problem) => [problem.id, problem.totalScore ?? 0]),
    );

    if (contest.ruleType === 'ACM') {
      Object.entries(submissionInfo).forEach(([problemKey, info]) => {
        const numericId = Number(problemKey);
        if (!Number.isFinite(numericId)) return;
        const detail = (typeof info === 'object' && info !== null ? info : {}) as AcmSubmissionDetail;
        if (detail.is_ac) {
          result[numericId] = 'AC';
          return;
        }
        const errorCount = typeof detail.error_number === 'number' ? detail.error_number : Number(detail.error_number ?? 0);
        if (errorCount > 0) {
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

  const processedContestProblems = useMemo(() => {
    if (!canViewProtectedContent || problemsLoading) return [] as Problem[];

    const items = problems ?? [];
    const query = problemSearchQuery.trim().toLowerCase();

    const matchesSearch = (problem: Problem) => {
      if (!query) return true;
      if (problemSearchField === 'tag') {
        const tags = problem.tags ?? [];
        return tags.some((tag) => tag.toLowerCase().includes(query));
      }
      if (problemSearchField === 'number') {
        const identifier = (problem.displayId ?? problem._id ?? problem.id ?? '').toString().toLowerCase();
        return identifier.includes(query);
      }
      return (problem.title ?? '').toLowerCase().includes(query);
    };

    const matchesStatus = (problem: Problem) => {
      const status = resolveProblemStatus(problem, { override: myRankProgress?.[problem.id] });
      if (problemStatusFilter === 'all') return true;
      if (problemStatusFilter === PROBLEM_STATUS_LABELS.solved) return status === PROBLEM_STATUS_LABELS.solved;
      if (problemStatusFilter === PROBLEM_STATUS_LABELS.wrong) return status === PROBLEM_STATUS_LABELS.wrong;
      if (problemStatusFilter === PROBLEM_STATUS_LABELS.untouched) return status === PROBLEM_STATUS_LABELS.untouched;
      return true;
    };

    const safeNumber = (value: unknown) => {
      const numeric = Number(value);
      return Number.isNaN(numeric) ? null : numeric;
    };

    const getProblemNumber = (problem: Problem) => {
      const raw = (problem.displayId ?? problem._id ?? problem.id ?? '').toString();
      const numericOnly = raw.replace(/[^0-9]/g, '');
      return {
        numeric: numericOnly ? safeNumber(numericOnly) : null,
        raw,
      };
    };

    const getAccuracy = (problem: Problem) => {
      const submissions = Number(problem.submissionNumber ?? 0);
      const accepted = Number(problem.acceptedNumber ?? 0);
      if (!submissions) return 0;
      return accepted / submissions;
    };

    const filtered = items.filter(matchesSearch).filter(matchesStatus);

    const sorted = [...filtered].sort((a, b) => {
      let result = 0;
      if (problemSortField === 'submission') {
        result = (a.submissionNumber ?? 0) - (b.submissionNumber ?? 0);
      } else if (problemSortField === 'accuracy') {
        result = getAccuracy(a) - getAccuracy(b);
      } else {
        const aNum = getProblemNumber(a);
        const bNum = getProblemNumber(b);
        if (typeof aNum.numeric === 'number' && typeof bNum.numeric === 'number') {
          result = aNum.numeric - bNum.numeric;
        } else if (typeof aNum.numeric === 'number') {
          result = -1;
        } else if (typeof bNum.numeric === 'number') {
          result = 1;
        } else {
          result = aNum.raw.localeCompare(bNum.raw, undefined, { numeric: true, sensitivity: 'base' });
        }
      }
      return problemSortOrder === 'desc' ? -result : result;
    });

    return sorted;
  }, [
    canViewProtectedContent,
    problemsLoading,
    problems,
    problemSearchQuery,
    problemSearchField,
    problemSortField,
    problemSortOrder,
    problemStatusFilter,
    myRankProgress,
  ]);

  const contestProblemStats = useMemo(() => {
    if (!canViewProtectedContent || problemsLoading) {
      return { total: 0, solved: 0, wrong: 0, untouched: 0, attempted: 0 };
    }
    return (problems ?? []).reduce(
      (acc, problem) => {
        const status = resolveProblemStatus(problem, { override: myRankProgress?.[problem.id] });
        if (status === PROBLEM_STATUS_LABELS.solved) {
          acc.solved += 1;
        } else if (status === PROBLEM_STATUS_LABELS.wrong) {
          acc.wrong += 1;
        } else if (status === PROBLEM_STATUS_LABELS.untouched) {
          acc.untouched += 1;
        } else {
          acc.attempted += 1;
        }
        acc.total += 1;
        return acc;
      },
      { total: 0, solved: 0, wrong: 0, untouched: 0, attempted: 0 },
    );
  }, [canViewProtectedContent, problemsLoading, problems, myRankProgress]);

  const totalProblems = contestProblemStats.total || (problems?.length ?? 0);
  const solvedProblems = contestProblemStats.solved;
  const wrongProblems = contestProblemStats.wrong;
  const remainingProblems = Math.max(totalProblems - solvedProblems - wrongProblems, 0);
  const startTimeDisplay = contest?.startTime ? formatDateTime(contest.startTime) : '-';
  const endTimeDisplay = contest?.endTime ? formatDateTime(contest.endTime) : '-';
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
    if (activeTab === 'problems' && canViewProtectedContent) {
      refetchProblems();
      refetchRank();
    }
  }, [activeTab, canViewProtectedContent, refetchProblems, refetchRank]);

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
        <Button className="mt-4 w-fit min-w-[180px] bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/contests')}>
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
        <Button variant="secondary" className="mt-6 w-fit min-w-[180px]" onClick={() => navigate('/contests')}>
          대회 목록으로 이동
        </Button>
      </div>
    );
  }

  const renderOverview = () => {
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
                  {contestStatus && (
                    <div className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                      {statusLabel[contestStatus] ?? contestStatus}
                    </div>
                  )}
                </div>
              </div>

            <div className="prose max-w-none text-lg font-semibold leading-relaxed text-slate-700 dark:prose-invert dark:text-slate-200">
              <div dangerouslySetInnerHTML={{ __html: contest.description }} />
            </div>
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
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 sm:self-end lg:ml-auto lg:justify-end">
            <form onSubmit={handleContestProblemSearchSubmit} className="flex w-full sm:w-auto sm:min-w-[360px]">
              <label htmlFor="contest-problem-search" className="sr-only">문제 검색</label>
              <input
                id="contest-problem-search"
                type="search"
                value={problemSearchQuery}
                onChange={(event) => handleContestProblemSearchChange(event.target.value)}
                placeholder="문제 검색..."
                className="w-full rounded-l-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={problemSearchField}
                onChange={(event) => handleContestProblemSearchFieldChange(event.target.value)}
                className="w-28 border-y border-r border-gray-300 bg-white px-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="title">제목</option>
                <option value="tag">태그</option>
                <option value="number">번호</option>
              </select>
              <button
                type="submit"
                className="min-w-[60px] rounded-r-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white text-center shadow-sm transition hover:bg-blue-700"
              >
                검색
              </button>
            </form>
            <div className="flex w-full sm:w-auto sm:min-w-[220px] sm:justify-end">
              <label htmlFor="contest-problem-status-filter" className="sr-only">문제 상태 필터</label>
              <select
                id="contest-problem-status-filter"
                value={problemStatusFilter}
                onChange={(event) => handleContestProblemStatusFilterChange(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-28"
              >
                <option value="all">전체</option>
                <option value={PROBLEM_STATUS_LABELS.untouched}>{PROBLEM_STATUS_LABELS.untouched}</option>
                <option value={PROBLEM_STATUS_LABELS.solved}>{PROBLEM_STATUS_LABELS.solved}</option>
                <option value={PROBLEM_STATUS_LABELS.wrong}>{PROBLEM_STATUS_LABELS.wrong}</option>
              </select>
              <button
                type="button"
                onClick={handleContestProblemReset}
                className="ml-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 text-center shadow-sm transition hover:border-blue-400 hover:text-blue-600"
              >
                초기화
              </button>
            </div>
          </div>
        </div>

        <ContestProblemList
          problems={processedContestProblems}
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
          onSortChange={handleContestProblemSortToggle}
          sortField={problemSortField}
          sortOrder={problemSortOrder}
        />
      </div>
    );
  };

  const judgeStatusLabels: Record<number, string> = {
    [-2]: '컴파일 에러',
    [-1]: '오답',
    [0]: PROBLEM_STATUS_LABELS.solved,
    [1]: '시간 초과',
    [2]: '실행 시간 초과',
    [3]: '메모리 초과',
    [4]: '런타임 에러',
    [5]: '시스템 에러',
    [6]: '채점 대기',
    [7]: '채점 중',
    [8]: '부분 정답',
  };

  function getJudgeResultLabel(resultValue: unknown): string {
    if (resultValue == null) {
      return '-';
    }
    const numeric = Number(resultValue);
    if (!Number.isNaN(numeric) && numeric in judgeStatusLabels) {
      return judgeStatusLabels[numeric];
    }
    if (typeof resultValue === 'string') {
      return resultValue;
    }
    return String(resultValue);
  }

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

  const renderSubmissionDetailsTab = () => {
    if (!isAdminUser) {
      return <div className="text-sm text-gray-600">관리자만 제출 상세정보를 확인할 수 있습니다.</div>;
    }

    if (submissionsLoading) {
      return (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (submissionsError) {
      return <div className="text-sm text-red-600">제출 상세정보를 불러오는 중 오류가 발생했습니다.</div>;
    }

    if (submissionGroups.length === 0) {
      return <div className="text-sm text-gray-600">표시할 제출 상세정보가 없습니다.</div>;
    }

    return (
      <div className="space-y-4">
        {submissionGroups.map((group) => (
          <Card key={group.userId} className="border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="font-medium text-gray-900">
                {group.username} <span className="text-sm text-gray-500">(ID {group.userId})</span>
              </div>
              <div className="text-sm text-gray-600">총 제출 {group.submissions.length}건</div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full table-fixed border border-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-28 border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">제출 ID</th>
                    <th className="w-24 border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">문제 ID</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">결과</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">언어</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">제출 시각</th>
                    <th className="w-28 border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">소스 보기</th>
                  </tr>
                </thead>
                <tbody>
                  {group.submissions
                    .slice()
                    .sort((a, b) => {
                      const ta = new Date((a.create_time ?? a.createTime) || 0).getTime();
                      const tb = new Date((b.create_time ?? b.createTime) || 0).getTime();
                      return ta - tb;
                    })
                    .map((submission) => {
                      const submissionId = submission.id ?? submission.submissionId;
                      const problemId = submission.problem_id ?? submission.problemId ?? submission.problem ?? '-';
                      const language = submission.language ?? submission.language_name ?? '-';
                      const submittedAt = submission.create_time ?? submission.createTime ?? '';
                      const statusValue = submission.result ?? submission.status;
                      const resultLabel = getJudgeResultLabel(statusValue);
                      return (
                        <tr key={String(submissionId)} className="border-b border-gray-200">
                          <td className="px-3 py-2 text-gray-700">{submissionId}</td>
                          <td className="px-3 py-2 text-gray-700">{problemId}</td>
                          <td className="px-3 py-2 text-gray-700">{resultLabel}</td>
                          <td className="px-3 py-2 text-gray-700">{language}</td>
                          <td className="px-3 py-2 text-gray-700">{submittedAt ? formatDateTime(submittedAt) : '-'}</td>
                          <td className="px-3 py-2 text-gray-700">
                            <button
                              type="button"
                              className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                              onClick={(event) => {
                                event.preventDefault();
                                handleSubmissionClick(submissionId);
                              }}
                            >
                              소스 보기
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <>
    <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-8">
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
      <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(220px,0.55fr)]">
        <div className="rounded-xl bg-slate-100/80 px-6 py-6 text-sm dark:bg-slate-800/70">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/contests')}
                  className="w-fit min-w-[200px] whitespace-nowrap"
                >
                  ← 대회 목록으로 돌아가기
                </Button>
                <h1 className="ml-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap lg:ml-8">
                  {contest.title}
                </h1>
                {contestStatus && (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                    {statusLabel[contestStatus] ?? contestStatus}
                  </span>
                )}
              </div>
            </div>
            <div className="flex w-full flex-wrap items-end justify-end gap-6 text-right pl-0 sm:flex-nowrap lg:gap-12 lg:pl-[calc(200px+1rem)]">
              <div className="text-left w-full sm:w-auto sm:min-w-[160px] lg:ml-6">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">시작 시간</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{startTimeDisplay}</p>
              </div>
              <div className="text-left w-full sm:w-auto sm:min-w-[160px]">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">종료 시간</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{endTimeDisplay}</p>
              </div>
              <div className="w-full sm:w-auto sm:min-w-[160px]">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">남은 시간</p>
                <p className={`text-2xl font-black tracking-tight ${timeTextClass} sm:text-[28px] whitespace-nowrap`}>{timeLeftDisplay}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white px-4 py-6 text-sm shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 justify-self-end w-full">
          <div className="grid grid-cols-2 gap-y-4 gap-x-3 sm:gap-x-4">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">전체 문제</p>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{totalProblems}문제</p>
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{PROBLEM_SUMMARY_LABELS.solved}</p>
              <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">{solvedProblems}문제</p>
            </div>
            <div>
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">남은 문제</p>
              <p className="mt-1 text-base font-semibold text-indigo-600 dark:text-indigo-400">{remainingProblems}문제</p>
            </div>
            <div>
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{PROBLEM_SUMMARY_LABELS.wrong}</p>
              <p className="mt-1 text-base font-semibold text-rose-600 dark:text-rose-400">{wrongProblems}문제</p>
            </div>
          </div>
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
          {activeTab === 'submission-details' && renderSubmissionDetailsTab()}
        </div>
      </div>
    </div>
    {isSubmissionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeSubmissionModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <h3 className="text-lg font-semibold text-gray-900">제출 코드 보기</h3>
              <button
                type="button"
                onClick={closeSubmissionModal}
                className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-4 text-sm text-gray-800">
              {submissionModalLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                </div>
              ) : submissionModalError ? (
                <div className="text-red-600">{submissionModalError}</div>
              ) : selectedSubmissionDetail ? (
                <div className="space-y-4">
                  <div className="grid gap-2 text-gray-700 sm:grid-cols-2">
                    <div><span className="font-semibold">제출 ID:</span> {selectedSubmissionDetail.id}</div>
                    <div><span className="font-semibold">문제 ID:</span> {selectedSubmissionDetail.problem ?? selectedSubmissionDetail.problem_id ?? selectedSubmissionDetail.problemId ?? '-'}</div>
                    <div><span className="font-semibold">결과:</span> {getJudgeResultLabel(selectedSubmissionDetail.result ?? selectedSubmissionDetail.status)}</div>
                    <div><span className="font-semibold">언어:</span> {selectedSubmissionDetail.language ?? selectedSubmissionDetail.language_name ?? '-'}</div>
                    <div><span className="font-semibold">제출 시각:</span> {selectedSubmissionDetail.create_time ? formatDateTime(selectedSubmissionDetail.create_time) : selectedSubmissionDetail.createTime ? formatDateTime(selectedSubmissionDetail.createTime) : '-'}</div>
                  </div>
                  <div>
                    <h4 className="mb-2 font-semibold text-gray-900">소스 코드</h4>
                    <pre className="overflow-x-auto rounded-md bg-gray-900 px-4 py-3 text-xs leading-5 text-gray-100">
{selectedSubmissionDetail.code ?? '코드를 불러올 수 없습니다.'}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">제출 정보를 불러오지 못했습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
