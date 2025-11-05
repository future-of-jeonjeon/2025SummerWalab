import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContests } from '../hooks/useContests';
import { Button } from '../components/atoms/Button';
import { Card } from '../components/atoms/Card';

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
      return { status: 'upcoming', text: '시작 예정', color: 'text-blue-600 bg-blue-100' };
    } else if (now >= startTime && now <= endTime) {
      return { status: 'ongoing', text: '진행 중', color: 'text-green-600 bg-green-100' };
    } else {
      return { status: 'ended', text: '종료됨', color: 'text-gray-600 bg-gray-100' };
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return '-';
    }

    const format = (date: Date) => `${date.getMonth() + 1}월 ${date.getDate()}일`;
    return `${format(startDate)} ~ ${format(endDate)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 lg:ml-2">
              <span className="text-sm text-gray-500">전체 대회 수</span>
              <span className="text-2xl font-bold text-blue-600">{data?.total || 0}</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <form onSubmit={handleSearchSubmit} className="flex w-full sm:w-auto sm:min-w-[320px]">
                <label htmlFor="contest-search" className="sr-only">대회 검색</label>
                <input
                  id="contest-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="대회 검색..."
                  className="w-full rounded-l-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="min-w-[72px] rounded-r-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white text-center shadow-sm transition hover:bg-blue-700"
                >
                  검색
                </button>
              </form>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-40"
              >
                <option value="">전체</option>
                <option value="0">진행 중</option>
                <option value="1">시작 예정</option>
                <option value="-1">종료됨</option>
              </select>
            </div>
          </div>
        </div>


        {/* 대회 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {data?.data.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-600 text-lg mb-4">대회가 없습니다</div>
              <p className="text-gray-500">다른 검색어를 시도해보세요</p>
            </div>
          ) : (
            data?.data.map((contest) => {
              const statusInfo = getContestStatus(contest);
              return (
                <Card
                  key={contest.id}
                  className="mx-auto w-full max-w-[420px] p-4 hover:shadow-lg transition-shadow cursor-pointer h-56 flex flex-col"
                  onClick={() => handleContestClick(contest.id)}
                >
                  {/* 제목과 상태 */}
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="text-lg font-semibold text-gray-800 line-clamp-2 flex-1">
                      {contest.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {contest.contestType?.toLowerCase().includes('password') && (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">
                          비밀번호 필요
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                  </div>
                  
                  {/* 설명 */}
                  <div className="flex-1 mb-3">
                    <p className="text-gray-600 text-sm line-clamp-3 h-12 overflow-hidden">
                      {contest.description.replace(/<[^>]*>/g, '') || '설명이 없습니다.'}
                    </p>
                  </div>
                  
                  {/* 대회 정보 */}
                  <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                    <span className="truncate flex-1 mr-2">작성자: {contest.createdBy.username}</span>
                    <span className="whitespace-nowrap font-medium text-slate-600">
                      {formatDateRange(contest.startTime, contest.endTime)}
                    </span>
                  </div>
                  
                  {/* 버튼 */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContestClick(contest.id);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 mt-auto"
                  >
                    참가하기
                  </Button>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
