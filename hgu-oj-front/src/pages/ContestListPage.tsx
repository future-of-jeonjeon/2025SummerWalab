import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContests } from '../hooks/useContests';
import CommonPagination from '../components/common/CommonPagination';
import { GoalSidebar } from '../components/organisms/GoalSidebar';
export const ContestListPage: React.FC = () => {
  const navigate = useNavigate();

  const [endedPage, setEndedPage] = useState(1);
  const endedLimit = 10;

  const { data: activeData, isLoading: isActiveLoading, error: activeError } = useContests({
    limit: 100,
    status: '1',
  });

  const { data: upcomingData, isLoading: isUpcomingLoading, error: upcomingError } = useContests({
    limit: 100,
    status: '0',
  });

  const { data: endedData, isLoading: isEndedLoading, error: endedError } = useContests({
    page: endedPage,
    limit: endedLimit,
    status: '-1',
  });

  const isLoading = isActiveLoading || isUpcomingLoading || isEndedLoading;
  const error = activeError || upcomingError || endedError;

  const handleContestClick = (contestId: number) => {
    navigate(`/contests/${contestId}`);
  };

  const getContestStatus = (contest: any) => {
    const now = new Date();
    const startTime = new Date(contest.startTime);
    const endTime = new Date(contest.endTime);

    if (now < startTime) {
      return { status: 'upcoming', text: '시작 예정' };
    } else if (now >= startTime && now <= endTime) {
      return { status: 'ongoing', text: '진행 중' };
    } else {
      return { status: 'ended', text: '종료됨' };
    }
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}. ${month}. ${day}. ${hours}:${minutes}`;
  };

  const formatEndTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const PageSkeleton = () => (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <GoalSidebar className="hidden lg:block lg:w-64 lg:flex-shrink-0 lg:self-start" />
          <div className="min-w-0 flex-1 animate-pulse space-y-12">
            <div className="space-y-4">
              <div className="h-6 w-40 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={`active-skeleton-${index}`} className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-6 flex flex-col sm:flex-row gap-6">
                    <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-slate-700 shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 w-2/5 rounded bg-gray-200 dark:bg-slate-700" />
                      <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-slate-700" />
                      <div className="flex gap-2">
                        <div className="h-6 w-14 rounded bg-gray-200 dark:bg-slate-700" />
                        <div className="h-6 w-16 rounded bg-gray-200 dark:bg-slate-700" />
                        <div className="h-6 w-20 rounded bg-gray-200 dark:bg-slate-700" />
                      </div>
                      <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-slate-700" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="h-6 w-32 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="h-12 bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700" />
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={`ended-skeleton-${index}`} className="px-6 py-4 grid grid-cols-[minmax(0,1fr)_220px_120px] gap-4">
                      <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-slate-700" />
                      <div className="h-4 w-4/5 rounded bg-gray-200 dark:bg-slate-700 justify-self-center" />
                      <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-700 justify-self-center" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <GoalSidebar className="hidden lg:block lg:w-64 lg:flex-shrink-0 lg:self-start" />
            <div className="min-w-0 flex-1 text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">오류가 발생했습니다</h1>
              <p className="text-gray-600 dark:text-slate-400">{(error as Error).message || '데이터를 불러오지 못했습니다.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeContests = (activeData?.data || []).sort(
    (a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const upcomingContests = (upcomingData?.data || []).sort(
    (a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const endedContests = endedData?.data || [];
  const endedTotalPages = endedData?.totalPages || 1;

  const ContestCard = ({ contest }: { contest: any }) => {
    const statusInfo = getContestStatus(contest);
    const startTime = new Date(contest.startTime);
    const endTime = new Date(contest.endTime);
    const durationMinutes = Math.floor(
      (endTime.getTime() - startTime.getTime()) / (1000 * 60),
    );

    const dateRange = `${formatDate(startTime)} ~ ${formatEndTime(endTime)}`;

    return (
      <div
        className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow cursor-pointer flex flex-col sm:flex-row gap-6 relative overflow-hidden"
        onClick={() => handleContestClick(contest.id)}
      >
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            C{String(contest.id).padStart(2, '0')}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col items-start gap-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 truncate">
                {contest.title}
              </h3>
              {contest.organization_name && (
                <div className="text-sm text-gray-500 dark:text-slate-400 font-medium">
                  - {contest.organization_name}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm">
              <span className="font-bold text-gray-700 dark:text-slate-300">
                {statusInfo.text}
              </span>
              <span className="text-gray-300 dark:text-slate-600">|</span>
              <div className="flex items-center gap-1 text-gray-500 dark:text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>참가자 ({contest.participants}명)</span>
              </div>
            </div>

            <div className="flex gap-2 mt-1">
              {(contest.languages && contest.languages.length > 0
                ? contest.languages
                : ['C', 'C++', 'Java', 'Python3']
              ).map((lang: string) => (
                <span key={lang} className="px-2.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs font-medium">
                  {lang}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{durationMinutes}분</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{dateRange}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <GoalSidebar className="hidden lg:block lg:w-64 lg:flex-shrink-0 lg:self-start" />

          <div className="min-w-0 flex-1">
            {activeContests.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">진행 중인 대회</h2>
                  <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-sm font-medium">{activeContests.length}</span>
                </div>
                <div className="flex flex-col gap-4">
                  {activeContests.map((contest: any) => (
                    <ContestCard key={contest.id} contest={contest} />
                  ))}
                </div>
              </div>
            )}

            {upcomingContests.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">예정된 대회</h2>
                </div>
                <div className="flex flex-col gap-4">
                  {upcomingContests.map((contest: any) => (
                    <ContestCard key={contest.id} contest={contest} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">종료된 대회</h2>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400">
                    <tr>
                      <th className="px-6 py-4 font-medium">대회명</th>
                      <th className="px-6 py-4 font-medium text-center w-56">일시</th>
                      <th className="px-6 py-4 font-medium text-center w-32">참가자</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {endedContests.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                          종료된 대회가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      endedContests.map((contest: any) => (
                        <tr
                          key={contest.id}
                          onClick={() => handleContestClick(contest.id)}
                          className="hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900 dark:text-slate-100">{contest.title}</div>
                            {contest.organization_name && (
                              <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">- {contest.organization_name}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">
                            {formatDate(new Date(contest.startTime))}
                          </td>
                          <td className="px-6 py-4 text-center text-gray-600 dark:text-slate-300">
                            {contest.participants}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6">
                <CommonPagination
                  page={endedPage}
                  pageSize={endedLimit}
                  totalPages={endedTotalPages}
                  totalItems={endedData?.total}
                  onChangePage={(nextPage) => setEndedPage(nextPage)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
