import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { useAuthStore } from '../stores/authStore';
import { myPageService, ContestHistoryEntry } from '../services/myPageService';
import { GoalHistoryGroupSummary, UserGoalInput, todoService } from '../services/todoService';
import { userService, DEPARTMENTS } from '../services/userService';
import { MyProfile, MySolvedProblem, MyWrongProblem } from '../types';
import { ContributionGraph } from '../components/molecules/ContributionGraph';
import { GoalConfigModal } from '../components/organisms/GoalConfigModal';
import { useUserGoals } from '../hooks/useUserGoals';
import { UserGoalCard } from '../components/molecules/UserGoalCard';
import { GOAL_PERIOD_LABELS, GOAL_PERIOD_TONES, GOAL_TYPE_LABELS, toEditableGoalInput } from '../utils/goals';

export const MyPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();


  const {
    data: userData,
    refetch: refetchUserData,
  } = useQuery({
    queryKey: ['mypage', 'userdata'],
    queryFn: userService.getUserData,
    enabled: isAuthenticated,
  });

  const {
    data: profile,
  } = useQuery<MyProfile>({
    queryKey: ['mypage', 'profile'],
    queryFn: myPageService.getMyProfile,
    staleTime: 60 * 1000,
  });

  const {
    data: solvedResponse,
    isLoading: solvedLoading,
    error: solvedError,
  } = useQuery<{ items: MySolvedProblem[]; total: number }>({
    queryKey: ['mypage', 'solved'],
    queryFn: () => myPageService.getSolvedProblems({ page: 1, pageSize: 100 }), // Fetch enough items for the list
    enabled: isAuthenticated,
  });

  const {
    data: wrongResponse,
    isLoading: wrongLoading,
  } = useQuery<{ items: MyWrongProblem[]; total: number }>({
    queryKey: ['mypage', 'wrong'],
    queryFn: () => myPageService.getWrongProblems({ page: 1, pageSize: 100 }),
    enabled: isAuthenticated,
  });

  const {
    data: contestHistory,
    isLoading: contestHistoryLoading,
  } = useQuery<ContestHistoryEntry[]>({
    queryKey: ['mypage', 'contestHistory'],
    queryFn: myPageService.getParticipatedContests,
    enabled: isAuthenticated,
  });

  const {
    data: goalHistoryOverview,
    isLoading: goalHistoryLoading,
  } = useQuery({
    queryKey: ['todo', 'history', 'overview'],
    queryFn: todoService.getGoalHistoryOverview,
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [modalInitialView, setModalInitialView] = useState<'profile' | 'goal'>('goal');
  const [initialGoalDraft, setInitialGoalDraft] = useState<UserGoalInput | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyStatusDraft, setHistoryStatusDraft] = useState<'all' | 'success' | 'failure'>('all');
  const [historyStartDateDraft, setHistoryStartDateDraft] = useState('');
  const [historyEndDateDraft, setHistoryEndDateDraft] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'success' | 'failure'>('all');
  const [historyStartDateFilter, setHistoryStartDateFilter] = useState('');
  const [historyEndDateFilter, setHistoryEndDateFilter] = useState('');

  const handleUserUpdateSuccess = async () => {
    await Promise.all([
      refetchUserData(),
      queryClient.invalidateQueries({ queryKey: ['mypage', 'profile'] }),
    ]);
  };

  const { data: myTodo, goals: userGoals } = useUserGoals();

  const averageGoalProgress = userGoals.length > 0
    ? Math.round(userGoals.reduce((sum, goal) => sum + goal.progress.percent, 0) / userGoals.length)
    : 0;
  const completedGoalCount = userGoals.filter((goal) => goal.progress.percent >= 100).length;

  const openGoalSettings = () => {
    setInitialGoalDraft(null);
    setModalInitialView('goal');
    setIsGoalModalOpen(true);
  };

  const openProfileSettings = () => {
    setInitialGoalDraft(null);
    setModalInitialView('profile');
    setIsGoalModalOpen(true);
  };

  const [selectedHistoryGroupKey, setSelectedHistoryGroupKey] = useState<string | null>(null);
  const goalHistoryGroups = goalHistoryOverview?.groups ?? [];

  const selectedHistoryGroup = useMemo(() => {
    if (!goalHistoryGroups.length) return null;
    const fallbackKey = goalHistoryGroups[0]?.key ?? null;
    const activeKey = selectedHistoryGroupKey ?? fallbackKey;
    return goalHistoryGroups.find((group) => group.key === activeKey) ?? goalHistoryGroups[0] ?? null;
  }, [goalHistoryGroups, selectedHistoryGroupKey]);

  useEffect(() => {
    setHistoryPage(1);
  }, [selectedHistoryGroupKey]);

  useEffect(() => {
    setSelectedHistoryGroupKey((currentKey) => {
      if (!goalHistoryGroups.length) return null;
      if (currentKey && goalHistoryGroups.some((group) => group.key === currentKey)) {
        return currentKey;
      }
      return goalHistoryGroups[0].key;
    });
  }, [goalHistoryGroups]);

  const historyPageSize = 3;
  const {
    data: goalHistoryPage,
    isLoading: goalHistoryPageLoading,
  } = useQuery({
    queryKey: [
      'todo',
      'history',
      'group',
      selectedHistoryGroup?.period,
      selectedHistoryGroup?.type,
      selectedHistoryGroup?.target,
      selectedHistoryGroup?.difficulty ?? null,
      selectedHistoryGroup?.customDays ?? null,
      historyStartDateFilter || null,
      historyEndDateFilter || null,
      historyStatusFilter,
      historyPage,
      historyPageSize,
    ],
    queryFn: () =>
      todoService.getGoalHistoryGroupPage({
        period: selectedHistoryGroup!.period,
        type: selectedHistoryGroup!.type,
        target: selectedHistoryGroup!.target,
        difficulty: selectedHistoryGroup!.difficulty ?? null,
        customDays: selectedHistoryGroup!.customDays ?? null,
        page: historyPage,
        pageSize: historyPageSize,
        startDayFrom: historyStartDateFilter || undefined,
        endDayTo: historyEndDateFilter || undefined,
        status: historyStatusFilter,
      }),
    enabled: isAuthenticated && !!selectedHistoryGroup,
    staleTime: 30 * 1000,
  });

  const historyPageCount = goalHistoryPage?.totalPages ?? 1;

  const handleApplyHistoryFilters = () => {
    setHistoryPage(1);
    setHistoryStartDateFilter(historyStartDateDraft);
    setHistoryEndDateFilter(historyEndDateDraft);
    setHistoryStatusFilter(historyStatusDraft);
  };

  const handleResetHistoryFilters = () => {
    setHistoryPage(1);
    setHistoryStartDateDraft('');
    setHistoryEndDateDraft('');
    setHistoryStatusDraft('all');
    setHistoryStartDateFilter('');
    setHistoryEndDateFilter('');
    setHistoryStatusFilter('all');
  };

  const handleChangeHistoryStartDate = (value: string) => {
    setHistoryStartDateDraft(value);
    setHistoryEndDateDraft((currentEnd) => {
      if (!value) return currentEnd;
      if (!currentEnd || currentEnd < value) {
        return value;
      }
      return currentEnd;
    });
  };

  const openGoalFromHistory = (group: GoalHistoryGroupSummary) => {
    setInitialGoalDraft(
      toEditableGoalInput({
        id: undefined,
        period: group.period,
        type: group.type,
        target: group.target,
        difficulty: group.difficulty ?? null,
        customDays: group.customDays ?? null,
      }),
    );
    setModalInitialView('goal');
    setIsGoalModalOpen(true);
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 2xl:max-w-screen-2xl 2xl:px-10 space-y-8">
        <section aria-labelledby="mypage-top-section" className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 dark:bg-slate-800 dark:border-slate-700">
          <h1 id="mypage-top-section" className="sr-only">마이페이지 상단 정보</h1>

          <div className="flex flex-col lg:flex-row gap-12">
            {/* Left: Profile Section */}
            <div className="w-full lg:w-1/3 flex flex-col items-center border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-slate-700 pb-8 lg:pb-0 lg:pr-8">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-emerald-50 dark:bg-slate-700 dark:border-slate-600">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt="프로필 이미지"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-full h-full text-emerald-800/20 dark:text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userData?.name || profile?.displayName || profile?.username || 'ADMIN'}
                </h2>
                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-sm rounded-full font-medium dark:bg-slate-700 dark:text-slate-300">
                  @{profile?.username || 'root'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400 mb-8">
                <div className="flex items-center gap-1.5 vertical-writing-mode">
                  <span className="writing-mode-vertical">{DEPARTMENTS[userData?.major_id ?? 0] || '전산전자공학부'}</span>
                </div>
                <div className="h-4 w-px bg-gray-300 dark:bg-slate-600" />
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{userData?.student_id || '00000000'}</span>
                </div>
              </div>

              <div className="w-full rounded-3xl border border-gray-200 bg-gray-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                {goalHistoryLoading ? (
                  <div className="flex h-24 items-center justify-center text-sm text-gray-500 dark:text-slate-400">
                    목표 기록을 불러오는 중...
                  </div>
                ) : (
                  <ContributionGraph
                    data={goalHistoryOverview?.heatmap ?? []}
                    totalDays={140}
                    tooltipFormatter={(date, count) =>
                      count === 0 ? `${date}: 달성한 목표 없음` : `${date}: 목표 ${count}개 달성`
                    }
                  />
                )}
              </div>
            </div>

            {/* Right: Learning Goal Management */}
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <div className="max-w-full rounded-3xl border border-gray-100 bg-gray-50/70 p-5 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Learning Goals</p>
                    <h3 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">학습 목표 관리</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                      목표를 원하는 만큼 추가하고, 진행률을 한눈에 확인할 수 있습니다.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={openProfileSettings}
                      className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 7a3 3 0 11-6 0 3 3 0 016 0zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      프로필 설정
                    </button>
                    <button
                      onClick={openGoalSettings}
                      className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      목표 설정
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">활성 목표</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{userGoals.length}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">완료 목표</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{completedGoalCount}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">평균 달성률</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{averageGoalProgress}%</p>
                  </div>
                </div>

                {userGoals.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center dark:border-slate-600 dark:bg-slate-800">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3A9 9 0 1112 3a9 9 0 019 9z" />
                      </svg>
                    </div>
                    <h4 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">아직 설정한 목표가 없습니다</h4>
                    <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                      목표를 추가하면 일간, 주간, 월간 학습 계획을 자유롭게 관리할 수 있습니다.
                    </p>
                  </div>
                ) : userGoals.length <= 2 ? (
                  <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {userGoals.map((goal) => (
                      <UserGoalCard key={goal.id} goal={goal} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 max-w-full overflow-hidden">
                    <div className="overflow-x-auto pb-2">
                      <div className="flex w-max gap-4">
                        {userGoals.map((goal) => (
                          <UserGoalCard
                            key={goal.id}
                            goal={goal}
                            className="w-[320px] min-w-[320px]"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="mypage-goal-history">
          <h2 id="mypage-goal-history" className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">학습 목표 로그</h2>
          <Card className="overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-5 dark:border-slate-700">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Goal History</p>
                  <h3 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">지금까지 기록된 학습 목표 결과</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                    기간이 종료되어 로그로 저장된 목표 결과를 확인할 수 있습니다.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[460px]">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">총 로그</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{goalHistoryOverview?.summary.totalLogged ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500 dark:text-emerald-300">달성</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-200">{goalHistoryOverview?.summary.successCount ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3 dark:border-rose-900/60 dark:bg-rose-950/30">
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-500 dark:text-rose-300">미달성</p>
                    <p className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-200">{goalHistoryOverview?.summary.failureCount ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">평균 달성률</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{goalHistoryOverview?.summary.averageProgress ?? 0}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              {goalHistoryLoading ? (
                <div className="flex h-40 items-center justify-center text-gray-500 dark:text-slate-400">
                  목표 로그를 불러오는 중...
                </div>
              ) : goalHistoryGroups.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50/80 px-6 py-12 text-center dark:border-slate-600 dark:bg-slate-900/60">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">아직 저장된 학습 목표 로그가 없습니다</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                    목표 기간이 종료되면 결과가 자동으로 기록됩니다.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
                  <div className="space-y-3">
                    {goalHistoryGroups.map((group) => {
                      const tone = GOAL_PERIOD_TONES[group.period];
                      const isSelected = selectedHistoryGroup?.key === group.key;

                      return (
                        <button
                          key={group.key}
                          type="button"
                          onClick={() => setSelectedHistoryGroupKey(group.key)}
                          className={`w-full rounded-3xl border p-4 text-left transition ${
                            isSelected
                              ? `border-transparent bg-white shadow-sm ring-2 ${tone.soft} dark:bg-slate-800`
                              : 'border-gray-200 bg-gray-50/80 hover:border-gray-300 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-500'
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.badge} ${tone.badgeText}`}>
                              {GOAL_PERIOD_LABELS[group.period]}
                            </span>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                              {GOAL_TYPE_LABELS[group.type]}
                            </span>
                          </div>
                          <h3 className="mt-3 text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                            {group.label}
                          </h3>
                          <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                            <span>기록 {group.totalLogged}회</span>
                            <span className="text-emerald-600 dark:text-emerald-300">달성 {group.successCount}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-3xl border border-gray-200 bg-gray-50/70 p-5 dark:border-slate-700 dark:bg-slate-900/60">
                    {selectedHistoryGroup ? (
                      <>
                        <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-slate-700 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${GOAL_PERIOD_TONES[selectedHistoryGroup.period].badge} ${GOAL_PERIOD_TONES[selectedHistoryGroup.period].badgeText}`}>
                                {GOAL_PERIOD_LABELS[selectedHistoryGroup.period]}
                              </span>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                                {GOAL_TYPE_LABELS[selectedHistoryGroup.type]}
                              </span>
                            </div>
                            <h3 className="mt-3 text-xl font-bold text-gray-900 dark:text-white">{selectedHistoryGroup.label}</h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                              같은 조건으로 기록된 목표 {selectedHistoryGroup.totalLogged}회를 모아 보여줍니다.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openGoalFromHistory(selectedHistoryGroup)}
                            className="inline-flex items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/70"
                          >
                            이 목표 다시 설정
                          </button>
                        </div>

                        <div className="mt-5 space-y-4">
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                            <label className="flex flex-col gap-1 text-xs font-medium text-gray-500 dark:text-slate-400">
                              시작일
                              <input
                                type="date"
                                value={historyStartDateDraft}
                                onChange={(event) => handleChangeHistoryStartDate(event.target.value)}
                                className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs font-medium text-gray-500 dark:text-slate-400">
                              종료일
                              <input
                                type="date"
                                value={historyEndDateDraft}
                                min={historyStartDateDraft || undefined}
                                onChange={(event) => setHistoryEndDateDraft(event.target.value)}
                                className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs font-medium text-gray-500 dark:text-slate-400">
                              결과
                              <select
                                value={historyStatusDraft}
                                onChange={(event) => setHistoryStatusDraft(event.target.value as 'all' | 'success' | 'failure')}
                                className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                              >
                                <option value="all">전체 결과</option>
                                <option value="success">달성만</option>
                                <option value="failure">미달성만</option>
                              </select>
                            </label>
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleResetHistoryFilters}
                              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                              aria-label="필터 초기화"
                              title="필터 초기화"
                            >
                              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8 8 0 106.582 9m0 0H9m11 11v-5h-.581" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={handleApplyHistoryFilters}
                              className="inline-flex h-10 items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                            >
                              적용
                            </button>
                          </div>

                          {goalHistoryPageLoading ? (
                            <div className="flex h-32 items-center justify-center text-sm text-gray-500 dark:text-slate-400">
                              목표 로그를 불러오는 중...
                            </div>
                          ) : (goalHistoryPage?.items ?? []).length === 0 ? (
                            <div className="flex h-32 items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                              이 조건으로 저장된 로그가 없습니다.
                            </div>
                          ) : (
                            (goalHistoryPage?.items ?? []).map((entry) => {
                              const tone = GOAL_PERIOD_TONES[entry.period];
                              const progressWidth = `${Math.max(0, Math.min(entry.percent, 100))}%`;
                              const unitLabel = entry.type === 'ATTENDANCE' ? 'day' : 'problem';

                              return (
                                <div
                                  key={entry.id}
                                  className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950/50"
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {entry.startDay} ~ {entry.endDay}
                                      </p>
                                      <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                                        기록일 {entry.archivedAt.slice(0, 10)}
                                      </p>
                                    </div>
                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                        entry.isSuccess
                                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                      }`}
                                    >
                                      {entry.isSuccess ? '달성' : '미달성'}
                                    </span>
                                  </div>

                                  <div className="mt-5 flex items-end justify-between gap-4">
                                    <div>
                                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                                        {entry.count} / {entry.target} {unitLabel}
                                      </p>
                                      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                        {entry.isSuccess ? '목표를 달성했습니다.' : '목표를 달성하지 못했습니다.'}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className={`text-3xl font-bold ${tone.text}`}>{entry.percent}%</p>
                                      <p className="text-xs font-medium text-gray-400 dark:text-slate-500">달성률</p>
                                    </div>
                                  </div>

                                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                                    <div
                                      className={`h-full rounded-full ${tone.progress}`}
                                      style={{ width: progressWidth }}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {historyPageCount > 1 && (
                          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5 dark:border-slate-700">
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                              {historyPage} / {historyPageCount} 페이지
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setHistoryPage((prev) => Math.max(prev - 1, 1))}
                                disabled={historyPage === 1}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                이전
                              </button>
                              <button
                                type="button"
                                onClick={() => setHistoryPage((prev) => Math.min(prev + 1, historyPageCount))}
                                disabled={historyPage === historyPageCount}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                다음
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </section>

        <GoalConfigModal
          isOpen={isGoalModalOpen}
          onClose={() => {
            setIsGoalModalOpen(false);
            setInitialGoalDraft(null);
          }}
          currentTodo={myTodo || null}
          initialUserData={userData || null}
          onUserUpdateSuccess={handleUserUpdateSuccess}
          initialView={modalInitialView}
          initialGoalDraft={initialGoalDraft}
        />

        <section aria-labelledby="mypage-contests">
          <h2 id="mypage-contests" className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">참여한 대회</h2>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                    <th scope="col" className="py-3 px-4 font-medium">대회명</th>
                    <th scope="col" className="py-3 px-4 text-right font-medium">날짜</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {contestHistoryLoading ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-gray-500 dark:text-slate-400">
                        대회 기록을 불러오는 중...
                      </td>
                    </tr>
                  ) : (contestHistory ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-gray-500 dark:text-slate-400">
                        참여한 대회가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    (contestHistory ?? []).map((contest) => (
                      <tr key={contest.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-slate-100">
                          <Link to={`/contests/${contest.id}`} className="hover:text-blue-600 hover:underline">
                            {contest.title}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600 dark:text-slate-300">
                          {contest.startTime ? new Date(contest.startTime).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <section aria-labelledby="mypage-problem-lists" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 id="mypage-problem-lists" className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">푼 문제</h2>
            <Card>
              {solvedLoading ? (
                <div className="text-gray-500 dark:text-slate-400">푼 문제를 불러오는 중입니다...</div>
              ) : solvedError ? (
                <div className="text-red-500">
                  목록을 불러오지 못했습니다: {solvedError instanceof Error ? solvedError.message : '알 수 없는 오류'}
                </div>
              ) : (solvedResponse?.items ?? []).length === 0 ? (
                <div className="text-gray-500 dark:text-slate-400">아직 푼 문제가 없습니다.</div>
              ) : (
                <div className="leading-relaxed text-gray-700 dark:text-slate-300">
                  {solvedResponse?.items.map((item, index, array) => (
                    <React.Fragment key={item.id}>
                      <Link
                        to={`/problems/${item.id}`}
                        className="hover:text-blue-600 hover:underline transition-colors"
                      >
                        {item.title}
                      </Link>
                      {index < array.length - 1 && <span className="mr-2">,</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">틀린 문제</h2>
            <Card>
              {wrongLoading ? (
                <div className="text-gray-500 dark:text-slate-400">틀린 문제를 불러오는 중입니다...</div>
              ) : (wrongResponse?.items ?? []).length === 0 ? (
                <div className="text-gray-500 dark:text-slate-400">틀린 문제가 없습니다.</div>
              ) : (
                <div className="leading-relaxed text-gray-700 dark:text-slate-300">
                  {wrongResponse?.items.map((item, index, array) => (
                    <React.Fragment key={item.id}>
                      <Link
                        to={`/problems/${item.id}`}
                        className="hover:text-red-600 hover:underline transition-colors"
                      >
                        {item.title}
                      </Link>
                      {index < array.length - 1 && <span className="mr-2">,</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MyPage;
