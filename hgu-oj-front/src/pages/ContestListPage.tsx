import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContests } from '../hooks/useContests';

export const ContestListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error } = useContests({
    keyword: searchQuery,
    status: statusFilter,
    limit: 20,
  });

  const handleContestClick = (contestId: number) => {
    navigate(`/contests/${contestId}`);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery((prev) => prev.trim());
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-8">
          <div className="animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
              <div className="flex items-center gap-3 lg:ml-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-8 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <div className="h-10 bg-gray-200 rounded w-full sm:w-[320px]"></div>
                <div className="h-10 bg-gray-200 rounded w-full sm:w-40"></div>
              </div>
            </div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="mx-auto w-full max-w-[420px] p-4 h-56 flex flex-col bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="flex-1 mb-3 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="h-9 bg-gray-200 rounded w-full mt-auto"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">오류가 발생했습니다</h1>
            <p className="text-gray-600">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const activeContests =
    data?.data
      .filter((contest: any) => {
        const status = getContestStatus(contest).status;
        return status === 'ongoing' || status === 'upcoming';
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      ) || [];

  const endedContests =
    data?.data
      .filter((contest: any) => {
        const status = getContestStatus(contest).status;
        return status === 'ended';
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      ) || [];

  const ContestCard = ({ contest }: { contest: any }) => {
    const statusInfo = getContestStatus(contest);
    const startTime = new Date(contest.startTime);
    const endTime = new Date(contest.endTime);
    const durationMinutes = Math.floor(
      (endTime.getTime() - startTime.getTime()) / (1000 * 60),
    );

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

    const dateRange = `${formatDate(startTime)} ~ ${formatEndTime(endTime)}`;

    return (
      <div
        className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer flex flex-col sm:flex-row gap-6"
        onClick={() => handleContestClick(contest.id)}
      >
        {/* ID Box */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            C{String(contest.id).padStart(2, '0')}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-bold text-gray-900 truncate">
                {contest.title}
              </h3>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <span
                className={`font-bold ${
                  statusInfo.status === 'ongoing'
                    ? 'text-red-500'
                    : statusInfo.status === 'upcoming'
                    ? 'text-blue-500'
                    : 'text-gray-500'
                }`}
              >
                {statusInfo.text}
              </span>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-1 text-gray-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span>참가자 (0명)</span>
              </div>
            </div>

            <div className="flex gap-2 mt-1">
              {['C++', 'Java', 'Python'].map((lang) => (
                <span
                  key={lang}
                  className="px-2.5 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-medium"
                >
                  {lang}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{durationMinutes}분</span>
              </div>
              <div className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">대회</h1>
          <p className="text-gray-600">
            진행 중인 대회에 참여하거나 지난 대회를 확인하세요.
          </p>
        </div>

        {/* Active Contests Section */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <h2 className="text-lg font-bold text-gray-900">진행 중 / 예정</h2>
          </div>
          <div className="flex flex-col gap-4">
            {activeContests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <div className="text-gray-600">
                  진행 중이거나 예정된 대회가 없습니다.
                </div>
              </div>
            ) : (
              activeContests.map((contest: any) => (
                <ContestCard key={contest.id} contest={contest} />
              ))
            )}
          </div>
        </div>

        {/* Ended Contests Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
            <h2 className="text-lg font-bold text-gray-900">종료된 대회</h2>
          </div>
          <div className="flex flex-col gap-4">
            {endedContests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <div className="text-gray-600">종료된 대회가 없습니다.</div>
              </div>
            ) : (
              endedContests.map((contest: any) => (
                <ContestCard key={contest.id} contest={contest} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};