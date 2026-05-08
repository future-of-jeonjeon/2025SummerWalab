import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContests } from '../hooks/useContests';
import CommonPagination from '../components/common/CommonPagination';
import { ContestCard } from '../components/contests/ContestCard';
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

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}. ${month}. ${day}. ${hours}:${minutes}`;
  };

  const PageSkeleton = () => (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
  );

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="min-w-0 flex-1 text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">오류가 발생했습니다</h1>
              <p className="text-gray-600 dark:text-slate-400">{(error as Error).message || '데이터를 불러오지 못했습니다.'}</p>
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="min-w-0 flex-1">
            {activeContests.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">진행 중인 대회</h2>
                  <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-sm font-medium">{activeContests.length}</span>
                </div>
                <div className="flex flex-col gap-4">
                  {activeContests.map((contest: any) => (
                    <ContestCard key={contest.id} contest={contest} onClick={handleContestClick} />
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
                    <ContestCard key={contest.id} contest={contest} onClick={handleContestClick} />
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
  );
};
