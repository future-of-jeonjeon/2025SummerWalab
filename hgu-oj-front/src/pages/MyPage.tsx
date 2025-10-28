import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { useAuthStore } from '../stores/authStore';
import { myPageService } from '../services/myPageService';
import { HeatmapEntry, MyProfile, MySolvedProblem, MyWrongProblem } from '../types';

const PAGE_SIZE = 20;

const pad2 = (value: number): string => String(value).padStart(2, '0');

const toDateKey = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const normalized = value.slice(0, 10);
    return normalized;
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

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

const getHeatmapLevel = (count: number): string => {
  if (!count) return 'bg-gray-100 border border-gray-200';
  if (count < 2) return 'bg-emerald-100';
  if (count < 5) return 'bg-emerald-300';
  if (count < 10) return 'bg-emerald-500';
  return 'bg-emerald-700';
};

interface CalendarDay {
  date: string;
  count: number;
}

interface CalendarWeek {
  key: string;
  days: CalendarDay[];
}

const buildCalendarWeeks = (endDate: Date, months: number, heatmapData: HeatmapEntry[]): CalendarWeek[] => {
  const startDate = new Date(endDate);
  startDate.setDate(1);
  startDate.setMonth(startDate.getMonth() - months + 1);
  const heatmapMap = heatmapData.reduce<Record<string, number>>((acc, entry) => {
    const key = toDateKey(entry.date);
    acc[key] = entry.count;
    return acc;
  }, {});

  const weeks: CalendarWeek[] = [];
  let currentWeek: CalendarDay[] = [];

  const cursor = new Date(startDate);
  const startOffset = cursor.getDay();
  for (let i = 0; i < startOffset; i += 1) {
    currentWeek.push({ date: '', count: 0 });
  }

  while (cursor <= endDate) {
    const key = `${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}-${pad2(cursor.getDate())}`;
    currentWeek.push({
      date: key,
      count: heatmapMap[key] ?? 0,
    });
    if (currentWeek.length === 7) {
      weeks.push({ key: `week-${weeks.length}`, days: currentWeek });
      currentWeek = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: '', count: 0 });
    }
    weeks.push({ key: `week-${weeks.length}`, days: currentWeek });
  }

  return weeks;
};

const calcTotalPages = (total: number, pageSize: number) => Math.max(1, Math.ceil(Math.max(0, total) / pageSize));

export const MyPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const today = new Date();
  const [monthsRange, setMonthsRange] = useState(6);

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
    data: heatmap = [],
    isLoading: heatmapLoading,
    error: heatmapError,
  } = useQuery<HeatmapEntry[]>({
    queryKey: ['mypage', 'heatmap', monthsRange],
    queryFn: () => myPageService.getMyHeatmap({ months: monthsRange }),
  });

  const {
    data: solvedResponse,
    isLoading: solvedLoading,
    error: solvedError,
  } = useQuery<{ items: MySolvedProblem[]; total: number }>({
    queryKey: ['mypage', 'solved', solvedPage, PAGE_SIZE],
    queryFn: () => myPageService.getSolvedProblems({ page: solvedPage, pageSize: PAGE_SIZE }),
  });

  const {
    data: wrongResponse,
    isLoading: wrongLoading,
    error: wrongError,
  } = useQuery<{ items: MyWrongProblem[]; total: number }>({
    queryKey: ['mypage', 'wrong', wrongPage, PAGE_SIZE],
    queryFn: () => myPageService.getWrongProblems({ page: wrongPage, pageSize: PAGE_SIZE }),
  });

  const calendarWeeks = useMemo(
    () => buildCalendarWeeks(today, monthsRange, heatmap),
    [today, monthsRange, heatmap],
  );

  const monthSummary = useMemo(() => {
    if (!heatmap.length) {
      return { total: 0, activeDays: 0, maxCount: 0 };
    }
    let total = 0;
    let activeDays = 0;
    let maxCount = 0;
    heatmap.forEach((item) => {
      total += item.count;
      if (item.count > 0) {
        activeDays += 1;
      }
      if (item.count > maxCount) {
        maxCount = item.count;
      }
    });
    return { total, activeDays, maxCount };
  }, [heatmap]);

  const solvedTotalPages = calcTotalPages(solvedResponse?.total ?? 0, PAGE_SIZE);
  const wrongTotalPages = calcTotalPages(wrongResponse?.total ?? 0, PAGE_SIZE);

  const handleRangeChange = (months: number) => {
    setMonthsRange(months);
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
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

      <section aria-labelledby="mypage-heatmap" className="space-y-6 lg:space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="mypage-heatmap" className="text-lg font-semibold text-gray-900">제출 잔디</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>최근</span>
            <Button
              variant={monthsRange === 3 ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleRangeChange(3)}
            >
              3개월
            </Button>
            <Button
              variant={monthsRange === 6 ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleRangeChange(6)}
            >
              6개월
            </Button>
            <Button
              variant={monthsRange === 12 ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleRangeChange(12)}
            >
              12개월
            </Button>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-16">
          {heatmapLoading ? (
            <Card className="text-gray-500 lg:flex-1">제출 기록을 불러오는 중입니다...</Card>
          ) : heatmapError ? (
            <Card className="text-red-500 lg:flex-1">
              제출 기록을 불러오지 못했습니다: {renderError(heatmapError, '')}
            </Card>
          ) : (
            <Card className="lg:w-auto px-6 py-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:gap-10">
                <div className="w-full lg:w-[240px] bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 flex-shrink-0">
                  <p className="text-[11px] font-semibold text-slate-600">최근 {monthsRange}개월 제출</p>
                  <p className="mt-2 text-[28px] font-bold text-slate-900">{monthSummary.total}</p>
                  <dl className="mt-4 space-y-3 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between">
                      <dt>활성 일수</dt>
                      <dd className="font-semibold text-slate-800">{monthSummary.activeDays}일</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>최다 제출</dt>
                      <dd className="font-semibold text-slate-800">{monthSummary.maxCount}회</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>평균</dt>
                      <dd className="font-semibold text-slate-800">
                        {monthSummary.activeDays > 0 ? (monthSummary.total / monthSummary.activeDays).toFixed(1) : '0.0'}회
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="flex-1">
                  <div className="flex gap-[6px]">
                    <div className="flex gap-[4px]">
                      {calendarWeeks.map((week) => (
                        <div key={week.key} className="flex flex-col gap-[4px]">
                          {week.days.map((day, idx) => {
                            if (!day.date) {
                              return <div key={`${week.key}-${idx}`} className="h-3 w-3 rounded-sm bg-transparent" aria-hidden="true" />;
                            }
                            const dateObj = new Date(day.date);
                            const label = `${dateObj.getFullYear()}-${pad2(dateObj.getMonth() + 1)}-${pad2(dateObj.getDate())} 제출 ${day.count}회`;
                            return (
                              <div
                                key={`${week.key}-${idx}`}
                                className={`h-3 w-3 rounded-sm transition-colors duration-200 ${getHeatmapLevel(day.count)}`}
                                title={label}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-slate-500">
                    <span>적음</span>
                    <div className="flex items-center gap-[3px]">
                      <div className="h-3 w-3 rounded-sm border border-gray-200 bg-gray-100" />
                      <div className="h-3 w-3 rounded-sm bg-emerald-100" />
                      <div className="h-3 w-3 rounded-sm bg-emerald-300" />
                      <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                      <div className="h-3 w-3 rounded-sm bg-emerald-700" />
                    </div>
                    <span>많음</span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
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
  );
};

export default MyPage;
