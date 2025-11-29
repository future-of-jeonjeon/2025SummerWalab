import React, { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { ProblemProgressCard } from '../components/molecules/ProblemProgressCard';
import { useProblemCount } from '../hooks/useProblemCount';
import { useAuthStore } from '../stores/authStore';
import { myPageService } from '../services/myPageService';
import { userService, DEPARTMENTS } from '../services/userService';
import { MyProfile, MySolvedProblem, MyWrongProblem } from '../types';
import { UserInfoModal } from '../components/organisms/UserInfoModal';

const PAGE_SIZE = 20;

const formatDisplayDate = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const calcTotalPages = (total: number, pageSize: number) => Math.max(1, Math.ceil(Math.max(0, total) / pageSize));

export const MyPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [solvedPage, setSolvedPage] = useState(1);
  const [wrongPage, setWrongPage] = useState(1);

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
    data: solvedResponse,
    isLoading: solvedLoading,
    error: solvedError,
  } = useQuery<{ items: MySolvedProblem[]; total: number }, Error>({
    queryKey: ['mypage', 'solved', solvedPage, PAGE_SIZE],
    queryFn: () => myPageService.getSolvedProblems({ page: solvedPage, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const {
    data: wrongResponse,
    isLoading: wrongLoading,
    error: wrongError,
  } = useQuery<{ items: MyWrongProblem[]; total: number }, Error>({
    queryKey: ['mypage', 'wrong', wrongPage, PAGE_SIZE],
    queryFn: () => myPageService.getWrongProblems({ page: wrongPage, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const {
    total: totalProblemCount,
    isLoading: problemCountLoading,
    error: problemCountError,
  } = useProblemCount();

  const solvedTotalPages = calcTotalPages(solvedResponse?.total ?? 0, PAGE_SIZE);
  const wrongTotalPages = calcTotalPages(wrongResponse?.total ?? 0, PAGE_SIZE);

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

                    {/* Stats Cards */}
                    <div className="flex flex-wrap gap-3">
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
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-gray-500">표시할 프로필 데이터가 없습니다.</div>
            )}
          </Card>
        </section>

        <UserInfoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialData={userData}
          onSuccess={() => {
            refetchUserData();
          }}
        />

        <section aria-labelledby="mypage-progress" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="mypage-progress" className="text-lg font-semibold text-gray-900">문제 풀이 진행도</h2>
            {!progressLoading && !progressError && totalProblemCount > 0 && (
              <span className="text-sm text-gray-500">총 {totalProblemCount}문제 기준</span>
            )}
          </div>
          <ProblemProgressCard
            solvedCount={solvedCount}
            totalCount={totalProblemCount}
            isLoading={progressLoading}
            error={progressError}
          />
        </section>

        <section aria-labelledby="mypage-problem-lists" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 id="mypage-problem-lists" className="text-lg font-semibold text-gray-900 mb-4">푼 문제</h2>
            <Card>
              {solvedLoading ? (
                <div className="text-gray-500">푼 문제를 불러오는 중입니다...</div>
              ) : solvedError ? (
                <div className="text-red-500">푼 문제를 불러오지 못했습니다: {renderError(solvedError, '')}</div>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th scope="col" className="py-3">제목</th>
                        <th scope="col" className="py-3 text-right">난이도</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(solvedResponse?.items ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={2} className="py-6 text-center text-gray-500">아직 푼 문제가 없습니다.</td>
                        </tr>
                      ) : (
                        solvedResponse?.items.map((item) => (
                          <tr key={item.id} className="border-b last:border-b-0">
                            <td className="py-3">
                              <Link to={`/problems/${item.id}`} className="text-blue-600 hover:underline">
                                {item.title}
                              </Link>
                            </td>
                            <td className="py-3 text-right text-gray-600">{item.difficulty ?? '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {solvedTotalPages > 1 && (
                    <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
                      <span>{solvedPage} / {solvedTotalPages} 페이지</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSolvedPage((prev) => Math.max(1, prev - 1))}
                          disabled={solvedPage <= 1}
                        >
                          이전
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSolvedPage((prev) => Math.min(solvedTotalPages, prev + 1))}
                          disabled={solvedPage >= solvedTotalPages}
                        >
                          다음
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">틀린 문제</h2>
            <Card>
              {wrongLoading ? (
                <div className="text-gray-500">틀린 문제를 불러오는 중입니다...</div>
              ) : wrongError ? (
                <div className="text-red-500">틀린 문제를 불러오지 못했습니다: {renderError(wrongError, '')}</div>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th scope="col" className="py-3">제목</th>
                        <th scope="col" className="py-3 text-right">최근 시도일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(wrongResponse?.items ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={2} className="py-6 text-center text-gray-500">최근 틀린 문제가 없습니다.</td>
                        </tr>
                      ) : (
                        wrongResponse?.items.map((item) => (
                          <tr key={item.id} className="border-b last:border-b-0">
                            <td className="py-3">
                              <Link to={`/problems/${item.id}`} className="text-blue-600 hover:underline">
                                {item.title}
                              </Link>
                            </td>
                            <td className="py-3 text-right text-gray-600">
                              {formatDisplayDate(item.lastTriedAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {wrongTotalPages > 1 && (
                    <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
                      <span>{wrongPage} / {wrongTotalPages} 페이지</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWrongPage((prev) => Math.max(1, prev - 1))}
                          disabled={wrongPage <= 1}
                        >
                          이전
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWrongPage((prev) => Math.min(wrongTotalPages, prev + 1))}
                          disabled={wrongPage >= wrongTotalPages}
                        >
                          다음
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MyPage;
