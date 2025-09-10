import React from 'react';
import { Problem } from '../../types';
import { SearchBar } from '../molecules/SearchBar';
import { Button } from '../atoms/Button';

interface ProblemListProps {
  problems: Problem[];
  onProblemClick: (problemId: number) => void;
  onSearch: (query: string) => void;
  onFilterChange: (filter: { difficulty?: string }) => void;
  currentFilter?: { difficulty?: string };
  isLoading?: boolean;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export const ProblemList: React.FC<ProblemListProps> = ({
  problems,
  onProblemClick,
  onSearch,
  onFilterChange,
  currentFilter = {},
  isLoading = false,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
}) => {
  const difficultyOptions = [
    { value: '', label: 'All' },
    { value: 'Low', label: 'Level1' },
    { value: 'Mid', label: 'Level2' },
    { value: 'High', label: 'Level3' },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Low':
        return 'text-green-600 bg-green-100';
      case 'Mid':
        return 'text-yellow-600 bg-yellow-100';
      case 'High':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'Low':
        return 'Level1';
      case 'Mid':
        return 'Level2';
      case 'High':
        return 'Level3';
      default:
        return difficulty;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b">
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 border-b last:border-b-0">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 text-lg mb-4">문제가 없습니다</div>
        <p className="text-gray-500">다른 검색어를 시도해보세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 검색 및 필터 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchBar
            value=""
            onChange={onSearch}
            placeholder="문제 검색..."
          />
        </div>
        <div className="flex gap-2">
          {difficultyOptions.map((option) => (
            <Button
              key={option.value}
              onClick={() => onFilterChange({ difficulty: option.value })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentFilter.difficulty === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 문제 목록 테이블 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-6">Title</div>
            <div className="col-span-2 text-center">Level</div>
            <div className="col-span-1 text-center">Submission</div>
            <div className="col-span-2 text-center">Success Rate</div>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {problems.map((problem, index) => (
            <div
              key={problem.id}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onProblemClick(problem.id)}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-1 text-sm font-medium text-gray-900 text-center">
                  {problem.id}
                </div>
                <div className="col-span-6">
                  <div className="text-sm font-medium text-gray-900 hover:text-blue-600">
                    {problem.title}
                  </div>
                </div>
                <div className="col-span-2 text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(problem.difficulty)}`}>
                    {getDifficultyText(problem.difficulty)}
                  </span>
                </div>
                <div className="col-span-1 text-sm text-gray-500 text-center">
                  {problem.submissionNumber || 0}
                </div>
                <div className="col-span-2 text-sm text-gray-500 text-center">
                  {problem.acceptedNumber && problem.submissionNumber 
                    ? `${Math.round((problem.acceptedNumber / problem.submissionNumber) * 100)}%`
                    : '0%'
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && onPageChange && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <Button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            이전
          </Button>
          
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`px-3 py-2 rounded-lg ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {page}
                </Button>
              );
            })}
          </div>
          
          <Button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
};