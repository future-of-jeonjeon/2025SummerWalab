import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProblems } from '../hooks/useProblems';
import { ProblemList } from '../components/organisms/ProblemList';
import { useProblemStore } from '../stores/problemStore';

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">PROBLEM</h1>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{data?.total || 0}</div>
              <div className="text-sm text-gray-500">Total Problems</div>
            </div>
          </div>
        </div>

        <ProblemList
          problems={data?.data || []}
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
