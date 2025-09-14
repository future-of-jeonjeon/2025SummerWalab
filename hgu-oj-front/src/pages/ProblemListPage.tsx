import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProblems } from '../hooks/useProblems';
import { ProblemList } from '../components/organisms/ProblemList';
import { useProblemStore } from '../stores/problemStore';
import { SearchBar } from '../components/molecules/SearchBar';

export const ProblemListPage: React.FC = () => {
  const navigate = useNavigate();
  const { filter, setFilter } = useProblemStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useProblems(filter);

  const handleProblemClick = (problemId: number) => {
    navigate(`/problems/${problemId}`);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilter({ search: query, page: 1 });
  };

  // 클라이언트 사이드 검색 필터링
  const filteredProblems = data?.data?.filter(problem => 
    problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (problem.description && problem.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const handleFilterChange = (newFilter: { difficulty?: string }) => {
    setFilter({
      ...newFilter,
      difficulty: (newFilter.difficulty as 'EASY' | 'MEDIUM' | 'HARD') || undefined,
      page: 1,
    });
  };

  const handlePageChange = (page: number) => {
    setFilter({ page });
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">오류가 발생했습니다</h1>
          <p className="text-gray-600">{error.message}</p>
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
              <div className="text-sm text-gray-500">전체 문제수</div>
              <div className="text-2xl font-bold text-blue-600">{data?.total || 0}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="max-w-md">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSearch={handleSearch}
                  placeholder="문제 검색..."
                />
              </div>
              <div>
                <select
                  value={filter.difficulty || ''}
                  onChange={(e) => handleFilterChange({ difficulty: e.target.value })}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All</option>
                  <option value="Low">Level1</option>
                  <option value="Mid">Level2</option>
                  <option value="High">Level3</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <ProblemList
          problems={filteredProblems}
          onProblemClick={handleProblemClick}
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          currentFilter={filter}
          isLoading={isLoading}
          totalPages={data?.totalPages || 1}
          currentPage={filter.page || 1}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
};
