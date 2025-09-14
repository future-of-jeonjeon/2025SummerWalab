import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContests } from '../hooks/useContests';
import { SearchBar } from '../components/molecules/SearchBar';
import { Button } from '../components/atoms/Button';
import { Card } from '../components/atoms/Card';

export const ContestListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error } = useContests({
    keyword: searchQuery,
    status: statusFilter,
    limit: 20
  });

  const handleContestClick = (contestId: number) => {
    navigate(`/contests/${contestId}`);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4 ml-2">
              <div className="text-sm text-gray-500">전체 대회 수</div>
              <div className="text-2xl font-bold text-blue-600">{data?.total || 0}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="max-w-md">
                <SearchBar
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="대회 검색..."
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">전체</option>
                  <option value="ongoing">진행 중</option>
                  <option value="upcoming">시작 예정</option>
                  <option value="ended">종료됨</option>
                </select>
              </div>
            </div>
          </div>
        </div>


        {/* 대회 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  className="p-4 hover:shadow-lg transition-shadow cursor-pointer h-64 flex flex-col"
                  onClick={() => handleContestClick(contest.id)}
                >
                  {/* 제목과 상태 */}
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 line-clamp-2 flex-1 pr-2">
                      {contest.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusInfo.color}`}>
                      {statusInfo.text}
                    </span>
                  </div>
                  
                  {/* 설명 */}
                  <div className="flex-1 mb-3">
                    <p className="text-gray-600 text-sm line-clamp-2 h-8 overflow-hidden">
                      {contest.description.replace(/<[^>]*>/g, '') || '설명이 없습니다.'}
                    </p>
                  </div>
                  
                  {/* 대회 정보 */}
                  <div className="text-xs text-gray-500 mb-3">
                    <div className="mb-1">
                      <span className="font-medium">시작:</span> {formatDate(contest.startTime)}
                    </div>
                    <div className="mb-1">
                      <span className="font-medium">종료:</span> {formatDate(contest.endTime)}
                    </div>
                    <div className="mb-1">
                      <span className="font-medium">규칙:</span> {contest.ruleType}
                    </div>
                    <div>
                      <span className="font-medium">작성자:</span> {contest.createdBy.username}
                    </div>
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
