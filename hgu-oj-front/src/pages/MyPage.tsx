import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { ProblemProgressCard } from '../components/molecules/ProblemProgressCard';
import { useProblemCount } from '../hooks/useProblemCount';
import { useAuthStore } from '../stores/authStore';
import { myPageService } from '../services/myPageService';
import { MyProfile, MySolvedProblem, MyWrongProblem } from '../types';

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

  const [solvedPage, setSolvedPage] = useState(1);
  const [wrongPage, setWrongPage] = useState(1);

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
  } = useQuery<{ items: MySolvedProblem[]; total: number }>({
    queryKey: ['mypage', 'solved', solvedPage, PAGE_SIZE],
    queryFn: () => myPageService.getSolvedProblems({ page: solvedPage, pageSize: PAGE_SIZE }),
    keepPreviousData: true,
  });

  const {
    data: wrongResponse,
    isLoading: wrongLoading,
    error: wrongError,
  } = useQuery<{ items: MyWrongProblem[]; total: number }>({
    queryKey: ['mypage', 'wrong', wrongPage, PAGE_SIZE],
    queryFn: () => myPageService.getWrongProblems({ page: wrongPage, pageSize: PAGE_SIZE }),
    keepPreviousData: true,
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
              <div className="w-28 h-28 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={`${profile.displayName ?? profile.username} 아바타`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-gray-500">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 w-full">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">
                      {profile.displayName ?? profile.username}
                    </p>
                    <p className="text-sm text-gray-500">@{profile.username}</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <p className="text-xs text-blue-600 font-semibold">연속일수</p>
                      <p className="text-xl font-bold text-blue-700">{profile.streak}</p>
                    </div>
                    <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                      <p className="text-xs text-emerald-600 font-semibold">푼 문제</p>
                      <p className="text-xl font-bold text-emerald-700">{profile.solvedCount}</p>
                    </div>
                    <div className="px-4 py-2 bg-rose-50 border border-rose-200 rounded-lg text-center">
                      <p className="text-xs text-rose-600 font-semibold">틀린 문제</p>
                      <p className="text-xl font-bold text-rose-700">{profile.wrongCount}</p>
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
