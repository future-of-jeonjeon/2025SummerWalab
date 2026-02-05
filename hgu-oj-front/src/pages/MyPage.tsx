import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { ProblemProgressCard } from '../components/molecules/ProblemProgressCard';
import { useProblemCount } from '../hooks/useProblemCount';
import { useAuthStore } from '../stores/authStore';
import { myPageService, ContestHistoryEntry } from '../services/myPageService';
import { userService, DEPARTMENTS } from '../services/userService';
import { submissionService } from '../services/submissionService';
import { MyProfile, MySolvedProblem, MyWrongProblem } from '../types';
import { UserInfoModal } from '../components/organisms/UserInfoModal';
import { ContributionGraph } from '../components/molecules/ContributionGraph';
import { GoalConfigModal } from '../components/organisms/GoalConfigModal';
import { todoService, GoalRecommendation } from '../services/todoService';









export const MyPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);



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
    isLoading: profileLoading,
    error: profileError,
  } = useQuery<MyProfile>({
    queryKey: ['mypage', 'profile'],
    queryFn: myPageService.getMyProfile,
    staleTime: 60 * 1000,
  });

  const {
    data: contributionData,
    isLoading: contributionLoading,
  } = useQuery({
    queryKey: ['mypage', 'contribution'],
    queryFn: submissionService.getContributionData,
    enabled: isAuthenticated,
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
    total: totalProblemCount,
    isLoading: problemCountLoading,
    error: problemCountError,
  } = useProblemCount();

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  const { data: myTodo } = useQuery({
    queryKey: ['todo', 'my'],
    queryFn: todoService.getMyTodo,
    enabled: isAuthenticated,
  });

  const { data: recommendations } = useQuery({
    queryKey: ['todo', 'recommendations'],
    queryFn: todoService.getRecommendations,
    enabled: isAuthenticated,
  });

  const { data: solveStats } = useQuery({
    queryKey: ['todo', 'stats', 'solve-count'],
    queryFn: todoService.getSolveCountStats,
    enabled: isAuthenticated,
  });

  const { data: streakStats } = useQuery({
    queryKey: ['todo', 'stats', 'streak'],
    queryFn: todoService.getStreakStats,
    enabled: isAuthenticated,
  });

  const { data: difficultyStats } = useQuery({
    queryKey: ['todo', 'stats', 'difficulty'],
    queryFn: todoService.getDifficultyStats,
    enabled: isAuthenticated,
  });

  // Helper to find goal definition
  const getGoalDef = (val: string | null | undefined, type: 'daily' | 'weekly' | 'monthly'): GoalRecommendation | undefined => {
    if (!val) return undefined;
    if (val.startsWith('CUSTOM:')) {
      const parts = val.split(':');
      return {
        id: 'custom',
        type: parts[1],
        target: parseInt(parts[2]) || 1,
        unit: parts[3] || 'problem',
        label: parts[4] || '사용자 지정 목표',
        startDate: parts[5],
        endDate: parts[6]
      } as any;
    }
    if (!recommendations) return undefined;
    return recommendations[type].find(r => r.id === val);
  };

  // Helper to calculate progress using real API stats
  const getProgress = (def: GoalRecommendation | undefined, type: 'daily' | 'weekly' | 'monthly') => {
    if (!def) return { current: 0, percent: 0 };

    let current = 0;
    if (def.type === 'SOLVE_COUNT' || def.type === 'PROBLEM_SOLVE') {
      if (type === 'daily') current = solveStats?.daily || 0;
      else if (type === 'weekly') current = solveStats?.weekly || 0;
      else if (type === 'monthly') current = solveStats?.monthly || 0;
    } else if (def.type === 'STREAK') {
      current = streakStats?.streak || 0;
    } else if (def.type === 'TIER_SOLVE') {
      let searchDifficulty = 'Bronze';
      if (def.id === 'custom') {
        if (def.label.includes('Mid')) searchDifficulty = 'Mid';
        else if (def.label.includes('Gold')) searchDifficulty = 'Gold';
      } else {
        const difficultyMap: Record<string, string> = {
          'monthly_bronze_3': 'Bronze',
          'monthly_mid_3': 'Mid',
          'monthly_gold_3': 'Gold',
        };
        searchDifficulty = difficultyMap[def.id] || 'Bronze';
      }
      current = difficultyStats?.stats.find(s => s.difficulty === searchDifficulty)?.count || 0;
    }

    const percent = Math.min(Math.round((current / def.target) * 100), 100);
    return { current, percent };
  };

  const dailyGoal = getGoalDef(myTodo?.day_todo, 'daily');
  const weeklyGoal = getGoalDef(myTodo?.week_todo, 'weekly');
  const monthlyGoal = getGoalDef(myTodo?.month_todo, 'monthly');
  const customGoal = getGoalDef(myTodo?.custom_todo, 'daily');

  const dailyProgress = getProgress(dailyGoal, 'daily');
  const weeklyProgress = getProgress(weeklyGoal, 'weekly');
  const monthlyProgress = getProgress(monthlyGoal, 'monthly');
  const customProgress = getProgress(customGoal, 'daily');

  const activeGoals = [
    { type: 'daily', goal: dailyGoal, progress: dailyProgress, color: 'emerald', title: '일간 목표' },
    { type: 'weekly', goal: weeklyGoal, progress: weeklyProgress, color: 'blue', title: '주간 목표' },
    { type: 'monthly', goal: monthlyGoal, progress: monthlyProgress, color: 'purple', title: '월간 목표' },
    { type: 'custom', goal: customGoal, progress: customProgress, color: 'amber', title: '사용자 정의' },
  ].filter(g => !!g.goal);

  const getGridCols = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-3';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
  };

  const getCardPadding = (count: number) => {
    return count > 3 ? 'p-4' : 'p-5';
  };



  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const solvedCount = profile?.solvedCount ?? 0;
  const progressError = profileError ?? problemCountError;
  const progressLoading = profileLoading || problemCountLoading;



  return (
    <div className="min-h-screen bg-gray-50">
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
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="ml-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="프로필 수정"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
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
            </div>

            {/* Right: Learning Goal Management */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">학습 목표 관리</h3>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Learning Goal</h3>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => setIsGoalModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    목표 관리하기
                  </button>
                  <span className="text-xs text-gray-400">최근 업데이트: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>

              <div className={`grid gap-4 ${getGridCols(activeGoals.length)}`}>
                {activeGoals.map((g) => {
                  const progressColorMap: Record<string, string> = {
                    emerald: 'bg-emerald-500',
                    blue: 'bg-blue-600',
                    purple: 'bg-purple-500',
                    amber: 'bg-amber-500'
                  };
                  const textColorMap: Record<string, string> = {
                    emerald: 'text-emerald-600',
                    blue: 'text-blue-600',
                    purple: 'text-purple-600',
                    amber: 'text-amber-600'
                  };
                  const bgMap: Record<string, string> = {
                    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  };

                  return (
                    <div key={g.type} className={`bg-gray-50 dark:bg-slate-700/50 rounded-2xl ${getCardPadding(activeGoals.length)} relative group transition-all`}>
                      <span className={`inline-block px-2 py-0.5 rounded ${bgMap[g.color]} text-[10px] font-bold tracking-wide mb-3`}>
                        {g.title}
                      </span>
                      <p className={`font-semibold text-gray-900 dark:text-white ${activeGoals.length > 3 ? 'text-xs mb-1 line-clamp-1' : 'text-sm mb-1'}`}>
                        {g.goal?.label}
                      </p>
                      {g.type === 'custom' && (g.goal as any).startDate && (
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-4 font-mono">
                          {(g.goal as any).startDate} ~ {(g.goal as any).endDate}
                        </p>
                      )}
                      {g.type !== 'custom' && <div className={activeGoals.length > 3 ? 'mb-4' : 'mb-6'} />}
                      <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 mb-2">
                        <div className={`${progressColorMap[g.color]} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${g.progress.percent}%` }}></div>
                      </div>
                      <div className={`flex justify-between items-center text-gray-500 dark:text-slate-400 font-medium ${activeGoals.length > 3 ? 'text-[10px]' : 'text-xs'}`}>
                        <span>{g.progress.current} / {g.goal?.target || 0} {g.goal?.unit || ''}</span>
                        <span className={`${textColorMap[g.color]} dark:brightness-110`}>{g.progress.percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <section aria-labelledby="mypage-contribution" className="lg:col-span-6 flex flex-col">
            <h2 id="mypage-contribution" className="sr-only">활동 그래프</h2>
            <Card className="h-full flex flex-col justify-center">
              {contributionLoading ? (
                <div className="flex justify-center items-center h-40 text-gray-500">
                  활동 데이터를 불러오는 중...
                </div>
              ) : (
                <ContributionGraph data={contributionData ?? []} totalDays={365} />
              )}
            </Card>
          </section>

          <section aria-labelledby="mypage-progress" className="lg:col-span-4 flex flex-col">
            <h2 id="mypage-progress" className="sr-only">문제 풀이 진행도</h2>
            <ProblemProgressCard
              solvedCount={solvedCount}
              totalCount={totalProblemCount}
              isLoading={progressLoading}
              error={progressError}
              className="h-full"
            />
          </section>
        </div>

        <UserInfoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialData={userData}
          onSuccess={() => {
            refetchUserData();
          }}
        />

        <GoalConfigModal
          isOpen={isGoalModalOpen}
          onClose={() => setIsGoalModalOpen(false)}
          currentTodo={myTodo || null}
        />

        <section aria-labelledby="mypage-contests">
          <h2 id="mypage-contests" className="text-lg font-semibold text-gray-900 mb-4">참여한 대회</h2>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b bg-gray-50">
                    <th scope="col" className="py-3 px-4 font-medium">대회명</th>
                    <th scope="col" className="py-3 px-4 text-right font-medium">날짜</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contestHistoryLoading ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-gray-500">
                        대회 기록을 불러오는 중...
                      </td>
                    </tr>
                  ) : (contestHistory ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-gray-500">
                        참여한 대회가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    (contestHistory ?? []).map((contest) => (
                      <tr key={contest.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          <Link to={`/contests/${contest.id}`} className="hover:text-blue-600 hover:underline">
                            {contest.title}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
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
            <h2 id="mypage-problem-lists" className="text-lg font-semibold text-gray-900 mb-4">푼 문제</h2>
            <Card>
              {solvedLoading ? (
                <div className="text-gray-500">푼 문제를 불러오는 중입니다...</div>
              ) : solvedError ? (
                <div className="text-red-500">
                  목록을 불러오지 못했습니다: {solvedError instanceof Error ? solvedError.message : '알 수 없는 오류'}
                </div>
              ) : (solvedResponse?.items ?? []).length === 0 ? (
                <div className="text-gray-500">아직 푼 문제가 없습니다.</div>
              ) : (
                <div className="leading-relaxed text-gray-700">
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">틀린 문제</h2>
            <Card>
              {wrongLoading ? (
                <div className="text-gray-500">틀린 문제를 불러오는 중입니다...</div>
              ) : (wrongResponse?.items ?? []).length === 0 ? (
                <div className="text-gray-500">틀린 문제가 없습니다.</div>
              ) : (
                <div className="leading-relaxed text-gray-700">
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
