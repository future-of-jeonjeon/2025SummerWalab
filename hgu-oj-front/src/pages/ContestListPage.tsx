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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">대회</h1>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{data?.total || 0}</div>
              <div className="text-sm text-gray-500">Total Contests</div>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="대회 검색..."
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setStatusFilter('')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              전체
            </Button>
            <Button
              onClick={() => setStatusFilter('ongoing')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'ongoing'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              진행 중
            </Button>
            <Button
              onClick={() => setStatusFilter('upcoming')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'upcoming'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              시작 예정
            </Button>
          </div>
        </div>

        {/* 대회 목록 */}
        <div className="space-y-4">
          {data?.data.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-600 text-lg mb-4">대회가 없습니다</div>
              <p className="text-gray-500">다른 검색어를 시도해보세요</p>
            </div>
          ) : (
            data?.data.map((contest) => {
              const statusInfo = getContestStatus(contest);
              return (
                <Card
                  key={contest.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleContestClick(contest.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {contest.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-4 text-sm line-clamp-2">
                        {contest.description.replace(/<[^>]*>/g, '')}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
                        <div>
                          <span className="font-medium text-gray-700">시작:</span><br />
                          {formatDate(contest.startTime)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">종료:</span><br />
                          {formatDate(contest.endTime)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">규칙:</span><br />
                          {contest.ruleType}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">작성자:</span><br />
                          {contest.createdBy.username}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm">
                        참가하기
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
