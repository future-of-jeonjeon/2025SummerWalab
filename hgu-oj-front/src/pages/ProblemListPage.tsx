import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProblems } from '../hooks/useProblems';
import { ProblemFilter } from '../types';
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

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setFilter({ search: query, page: 1 });
  };

  // 클라이언트 사이드 검색 필터링
  const filteredProblems = data?.data?.filter(problem => 
    problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (problem.description && problem.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const handleFilterChange = (newFilter: { difficulty?: string }) => {
    const difficulty = (newFilter.difficulty as ProblemFilter['difficulty']) || undefined;
    setFilter({
      ...newFilter,
      difficulty,
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 lg:ml-2">
              <span className="text-sm text-gray-500">전체 문제 수</span>
              <span className="text-2xl font-bold text-blue-600">{data?.total || 0}</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <SearchBar
                value={searchQuery}
                onChange={handleSearchChange}
                onSearch={handleSearchChange}
                placeholder="문제 검색..."
                className="w-full sm:w-64"
              />
              <select
                value={filter.difficulty || ''}
                onChange={(e) => handleFilterChange({ difficulty: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-40"
              >
                <option value="">전체 난이도</option>
                <option value="Low">Level1</option>
                <option value="Mid">Level2</option>
                <option value="High">Level3</option>
              </select>
            </div>
          </div>
        </div>

        <ProblemList
          problems={filteredProblems}
          onProblemClick={handleProblemClick}
          onSearch={handleSearchChange}
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
