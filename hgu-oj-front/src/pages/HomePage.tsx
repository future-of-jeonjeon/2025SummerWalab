import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { problemService } from '../services/problemService';
import { submissionService, SubmissionListItem } from '../services/submissionService';
import { contestService } from '../services/contestService';
import { rankingService } from '../services/rankingService';

type RecentProblem = {
  id: number;
  displayId?: string | number | null;
  title: string;
  createdAt?: string;
};

type RecentSolved = {
  submissionId: string;
  problemId: number;
  displayId?: string | number | null;
  username?: string | null;
  solvedAt?: string;
};

type ContestHighlight = {
  id: number;
  title: string;
  startTime?: string;
  endTime?: string;
};

type HighlightPanelProps<Item> = {
  title: string;
  items: Item[];
  emptyMessage: string;
  loading?: boolean;
  onItemClick: (item: Item) => void;
  renderPrimary: (item: Item) => React.ReactNode;
  renderSecondary?: (item: Item) => React.ReactNode;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const HighlightPanel = <Item,>({
  title,
  items,
  emptyMessage,
  loading,
  onItemClick,
  renderPrimary,
  renderSecondary,
}: HighlightPanelProps<Item>) => {
  if (loading && items.length === 0) {
    return (
      <Card className="h-full rounded-3xl border-0 bg-white/90 shadow-lg dark:bg-slate-900/80" padding="lg" shadow="lg">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-xl bg-slate-100/80 px-4 py-3 dark:bg-slate-800/60">
              <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full rounded-3xl border-0 bg-white/90 shadow-lg dark:bg-slate-900/80" padding="lg" shadow="lg">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {items.length === 0 ? (
        <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</div>
      ) : (
        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onItemClick(item)}
              className="flex w-full flex-col items-start gap-1 px-2 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {renderPrimary(item)}
              </span>
              {renderSecondary && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {renderSecondary(item)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const {
    data: recentProblemsData,
    isLoading: recentProblemsLoading,
  } = useQuery({
    queryKey: ['home', 'recent-problems'],
    queryFn: () => problemService.getMicroProblemList({ page: 1, limit: 5, sortField: 'number', sortOrder: 'desc' }),
    staleTime: 60 * 1000,
  });

  const {
    data: recentSolvedData,
    isLoading: recentSolvedLoading,
  } = useQuery({
    queryKey: ['home', 'recent-solved'],
    queryFn: () => submissionService.getRecentSubmissions({ limit: 5 }),
    staleTime: 30 * 1000,
  });

  const {
    data: runningContestsData,
    isLoading: runningContestsLoading,
  } = useQuery({
    queryKey: ['home', 'running-contests'],
    queryFn: () => contestService.getContests({ page: 1, limit: 5, status: '0' }),
    staleTime: 60 * 1000,
  });

  const {
    data: upcomingContestsData,
    isLoading: upcomingContestsLoading,
  } = useQuery({
    queryKey: ['home', 'upcoming-contests'],
    queryFn: () => contestService.getContests({ page: 1, limit: 5, status: '1' }),
    staleTime: 60 * 1000,
  });

  const recentProblems = useMemo<RecentProblem[]>(() => {
    return (recentProblemsData?.data ?? []).map((problem) => ({
      id: problem.id,
      displayId: problem.displayId ?? problem._id ?? problem.id,
      title: problem.title,
      createdAt: problem.createTime ?? problem.lastUpdateTime,
    }));
  }, [recentProblemsData?.data]);

  const recentSolved = useMemo<RecentSolved[]>(() => {
    const items = recentSolvedData?.items ?? [];
    return items.map((item: SubmissionListItem) => ({
      submissionId: String(item.id ?? item.submissionId ?? ''),
      problemId: Number(item.problem_id ?? item.problemId ?? 0),
      displayId: item.problem ?? item.problem_id ?? item.problemId,
      username: item.username,
      solvedAt: item.create_time ?? item.createTime,
    }));
  }, [recentSolvedData?.items]);

  const runningContests = useMemo<ContestHighlight[]>(() => {
    return (runningContestsData?.data ?? []).map((contest) => {
      const startTime = contest.startTime ?? (contest as any).start_time;
      const endTime = contest.endTime ?? (contest as any).end_time;
      return {
        id: contest.id,
        title: contest.title,
        startTime,
        endTime,
      };
    });
  }, [runningContestsData?.data]);

  const upcomingContests = useMemo<ContestHighlight[]>(() => {
    return (upcomingContestsData?.data ?? []).map((contest) => {
      const startTime = contest.startTime ?? (contest as any).start_time;
      const endTime = contest.endTime ?? (contest as any).end_time;
      return {
        id: contest.id,
        title: contest.title,
        startTime,
        endTime,
      };
    });
  }, [upcomingContestsData?.data]);

  const {
    data: topUserRankings,
    isLoading: userRankingLoading,
  } = useQuery({
    queryKey: ['home', 'user-rankings'],
    queryFn: () => rankingService.getUserRankings({ page: 1, limit: 5 }),
    staleTime: 60 * 1000,
  });

  const {
    data: topOrganizationRankings,
    isLoading: organizationRankingLoading,
  } = useQuery({
    queryKey: ['home', 'organization-rankings'],
    queryFn: () => rankingService.getOrganizationRankings({ page: 1, limit: 5 }),
    staleTime: 60 * 1000,
  });

  const organizationRanking = useMemo(
    () => ({
      items: topOrganizationRankings?.data ?? [],
      loading: organizationRankingLoading,
    }),
    [topOrganizationRankings?.data, organizationRankingLoading],
  );

  const userRanking = useMemo(
    () => ({
      items: topUserRankings?.data ?? [],
      loading: userRankingLoading,
    }),
    [topUserRankings?.data, userRankingLoading],
  );

  const handleProblemNavigate = (problem: RecentProblem | RecentSolved) => {
    const identifier =
      'problemId' in problem
        ? problem.displayId ?? problem.problemId
        : problem.displayId ?? problem.id;
    if (!identifier) return;
    navigate(`/problems/${encodeURIComponent(String(identifier))}`);
  };

  const handleContestNavigate = (contest: ContestHighlight) => {
    if (!contest?.id) return;
    navigate(`/contests/${contest.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-12 space-y-12">
        <section className="grid gap-6 lg:grid-cols-[1.8fr,1fr] items-stretch">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-white shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/70 via-sky-500/70 to-cyan-400/70" />
            <div className="relative flex h-full flex-col justify-between p-10 space-y-10">
              <div>
                <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-medium uppercase tracking-wide">
                  Why Not Change The World?
                </span>
                <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
                  한동인을 위한 온라인 저지 플랫폼
                </h1>
                <p className="mt-4 max-w-2xl text-base sm:text-lg text-white/90">
                  매일 새로운 문제를 풀고, 팀과 함께 문제집을 구성하며, 실전과 같은 대회에 참가해 보세요.
                </p>
              </div>
            </div>
          </div>

          <Card className="rounded-3xl h-full bg-white/80 shadow-lg dark:bg-slate-900/80" padding="lg" shadow="lg">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">플랫폼 한눈에 보기</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              실시간으로 변화하는 상위 랭킹을 확인해 보세요.
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">조직 랭킹 TOP 5</h3>
                  <Link to="/ranking" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300">
                    전체 보기
                  </Link>
                </div>
                <div className="mt-3 space-y-2">
                  {organizationRanking.items.length === 0 && !organizationRanking.loading && (
                    <div className="rounded-lg bg-slate-100/70 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      랭킹 데이터가 없습니다.
                    </div>
                  )}
                  {organizationRanking.loading &&
                    Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={`org-skeleton-${index}`}
                        className="animate-pulse rounded-lg bg-slate-100/80 px-3 py-2 dark:bg-slate-800/60"
                      >
                        <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                      </div>
                    ))}
                  {organizationRanking.items.map((entry) => (
                    <div
                      key={entry.rank}
                      className="flex items-center justify-between rounded-lg bg-slate-100/70 px-3 py-2 text-sm text-slate-800 dark:bg-slate-800/60 dark:text-slate-100"
                    >
                      <span>
                        <span className="mr-2 font-bold text-blue-600 dark:text-blue-300">{entry.rank}</span>
                        {entry.name}
                      </span>
                      {entry.totalSolved != null && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {entry.totalSolved} solved
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">유저 랭킹 TOP 5</h3>
                  <Link to="/ranking" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300">
                    전체 보기
                  </Link>
                </div>
                <div className="mt-3 space-y-2">
                  {userRanking.items.length === 0 && !userRanking.loading && (
                    <div className="rounded-lg bg-slate-100/70 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      랭킹 데이터가 없습니다.
                    </div>
                  )}
                  {userRanking.loading &&
                    Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={`user-skeleton-${index}`}
                        className="animate-pulse rounded-lg bg-slate-100/80 px-3 py-2 dark:bg-slate-800/60"
                      >
                        <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                      </div>
                    ))}
                  {userRanking.items.map((entry) => (
                    <div
                      key={entry.rank}
                      className="flex items-center justify-between rounded-lg bg-slate-100/70 px-3 py-2 text-sm text-slate-800 dark:bg-slate-800/60 dark:text-slate-100"
                    >
                      <span>
                        <span className="mr-2 font-bold text-blue-600 dark:text-blue-300">{entry.rank}</span>
                        {entry.username}
                      </span>
                      {entry.solvedCount != null && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {entry.solvedCount} solved
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-4">
          <HighlightPanel<RecentProblem>
            title="최근 추가된 문제"
            items={recentProblems}
            emptyMessage="새로 추가된 문제가 없습니다."
            loading={recentProblemsLoading}
            onItemClick={handleProblemNavigate}
            renderPrimary={(item) => `${item.displayId ?? item.id}. ${item.title}`}
            renderSecondary={(item) => formatDateTime(item.createdAt)}
          />
          <HighlightPanel<RecentSolved>
            title="최근 풀린 문제"
            items={recentSolved}
            emptyMessage="최근 풀이 내역이 없습니다."
            loading={recentSolvedLoading}
            onItemClick={handleProblemNavigate}
            renderPrimary={(item) => `${item.displayId ?? item.problemId}`}
            renderSecondary={(item) =>
              item.username ? `${item.username} · ${formatDateTime(item.solvedAt)}` : formatDateTime(item.solvedAt)
            }
          />
          <HighlightPanel<ContestHighlight>
            title="진행 중인 대회"
            items={runningContests}
            emptyMessage="진행 중인 대회가 없습니다."
            loading={runningContestsLoading}
            onItemClick={handleContestNavigate}
            renderPrimary={(item) => item.title}
            renderSecondary={(item) => {
              const start = formatDateTime(item.startTime);
              const end = formatDateTime(item.endTime);
              if (!start && !end) return '';
              return `${start || ''}${start && end ? ' ~ ' : ''}${end || ''}`;
            }}
          />
          <HighlightPanel<ContestHighlight>
            title="예정된 대회"
            items={upcomingContests}
            emptyMessage="예정된 대회가 없습니다."
            loading={upcomingContestsLoading}
            onItemClick={handleContestNavigate}
            renderPrimary={(item) => item.title}
            renderSecondary={(item) => formatDateTime(item.startTime)}
          />
        </section>
      </div>
    </div>
  );
};
