import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { ProblemProgressCard } from '../components/molecules/ProblemProgressCard';
import { useProblemCount } from '../hooks/useProblemCount';
import { useAuthStore } from '../stores/authStore';
import { myPageService, ContestHistoryEntry } from '../services/myPageService';
import { userService, DEPARTMENTS } from '../services/userService';
import { submissionService } from '../services/submissionService';
import { MyProfile, MySolvedProblem, MyWrongProblem } from '../types';
import { UserInfoModal } from '../components/organisms/UserInfoModal';
import { ContributionGraph } from '../components/molecules/ContributionGraph';









export const MyPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);



  const {
    data: userData,
    isLoading: userDataLoading,
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



  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const solvedCount = profile?.solvedCount ?? 0;
  const progressError = profileError ?? problemCountError;
  const progressLoading = profileLoading || problemCountLoading;

  const renderError = (error: unknown, fallback: string) => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return fallback;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 2xl:max-w-screen-2xl 2xl:px-10 space-y-8">
        <section aria-labelledby="mypage-profile">
          <h1 id="mypage-profile" className="sr-only">마이페이지 프로필</h1>
          <Card className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {profileLoading ? (
              <div className="text-gray-500">프로필을 불러오는 중입니다...</div>
            ) : profileError ? (
              <div className="text-red-500">프로필을 불러오지 못했습니다: {renderError(profileError, '')}</div>
            ) : profile ? (
              <>
                <div className="w-28 h-28 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border-4 border-white shadow-lg">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={`${profile.displayName ?? profile.username} 아바타`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-gray-500 bg-gray-100">
                      {profile.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full min-w-0">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-bold text-gray-900 truncate">
                          {userData?.name || profile.displayName || profile.username}
                        </h2>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                          @{profile.username}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsModalOpen(true)}
                          className="text-gray-400 hover:text-blue-600 p-1 h-auto"
                          title="정보 수정"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </Button>
                      </div>

                      {/* User Details Row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 mb-6">
                        {userDataLoading ? (
                          <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
                        ) : userData ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <span>{DEPARTMENTS[userData.major_id] || '학부 미설정'}</span>
                            </div>
                            <div className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full" />
                            <div className="flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                              </svg>
                              <span>{userData.student_id}</span>
                            </div>
                          </>
                        ) : (
                          <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            추가 정보 입력하기
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Stats Cards - Removed as per request */}
                    {/* <div className="flex flex-wrap gap-3">
                      <div className="flex flex-col items-center justify-center px-4 py-3 bg-blue-50 rounded-xl border border-blue-100 min-w-[80px]">
                        <span className="text-xs text-blue-600 font-semibold mb-1">연속일수</span>
                        <span className="text-xl font-bold text-blue-700">{profile.streak}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-100 min-w-[80px]">
                        <span className="text-xs text-emerald-600 font-semibold mb-1">푼 문제</span>
                        <span className="text-xl font-bold text-emerald-700">{profile.solvedCount}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center px-4 py-3 bg-rose-50 rounded-xl border border-rose-100 min-w-[80px]">
                        <span className="text-xs text-rose-600 font-semibold mb-1">틀린 문제</span>
                        <span className="text-xl font-bold text-rose-700">{profile.wrongCount}</span>
                      </div>
                    </div> */}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-gray-500">표시할 프로필 데이터가 없습니다.</div>
            )}
          </Card>
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
