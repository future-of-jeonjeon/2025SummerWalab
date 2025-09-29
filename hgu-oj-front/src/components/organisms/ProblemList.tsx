import React from 'react';
import { Problem } from '../../types';
import { Button } from '../atoms/Button';
import { resolveProblemStatus } from '../../utils/problemStatus';

interface ProblemListProps {
  problems: Problem[];
  onProblemClick: (problemId: number) => void;
  onSearch?: (query: string) => void;
  onFilterChange?: (filter: { difficulty?: string }) => void;
  currentFilter?: { difficulty?: string };
  isLoading?: boolean;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  showStats?: boolean;
  showStatus?: boolean;
  showOriginalId?: boolean;
  onSortChange?: (field: 'number' | 'submission' | 'accuracy') => void;
  sortField?: 'number' | 'submission' | 'accuracy';
  sortOrder?: 'asc' | 'desc';
}

export const ProblemList: React.FC<ProblemListProps> = ({
  problems,
  onProblemClick,
  onSearch: _onSearch = () => {},
  onFilterChange: _onFilterChange = () => {},
  currentFilter: _currentFilter = {},
  isLoading = false,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  showStats = true,
  showStatus = false,
  showOriginalId = false,
  onSortChange,
  sortField,
  sortOrder,
}) => {
  const renderSortableHeader = (label: string, field: 'number' | 'submission' | 'accuracy', align: 'left' | 'center' | 'right' = 'center') => {
    if (!onSortChange) {
      return (
        <span
          className={`text-sm font-medium uppercase tracking-wider ${align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center'} text-gray-500 dark:text-slate-400`}
        >
          {label}
        </span>
      );
    }

    const isActive = sortField === field;
    const isAsc = isActive && sortOrder === 'asc';
    const isDesc = isActive && sortOrder === 'desc';
    const alignmentClass = align === 'left' ? 'justify-start text-left' : align === 'right' ? 'justify-end text-right' : 'justify-center text-center';

    return (
      <button
        type="button"
        onClick={() => onSortChange(field)}
        aria-pressed={isActive}
        className={`inline-flex w-full items-center ${alignmentClass} gap-1 rounded px-1 py-0.5 text-sm font-semibold uppercase tracking-wider focus:outline-none focus-visible:outline-none focus-visible:ring-0 active:outline-none ${isActive ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-slate-400'}`}
      >
        <span>{label}</span>
        <span className="flex flex-col leading-none text-[11px]">
          <span className={isAsc ? 'text-blue-600 dark:text-blue-300' : 'text-slate-300 dark:text-slate-600'}>▲</span>
          <span className={isDesc ? 'text-blue-600 dark:text-blue-300' : 'text-slate-300 dark:text-slate-600'}>▼</span>
        </span>
      </button>
    );
  };

  const resolveStatusState = (problem: Problem) => resolveProblemStatus(problem);

  const getStatusBadge = (problem: Problem) => {
    const state = resolveStatusState(problem);
    if (!showStatus && state !== 'solved' && state !== 'wrong') {
      return undefined;
    }

    if (state === 'solved') {
      return {
        label: '정답',
        className: 'bg-green-100 text-green-700 border border-green-200',
      };
    }
    if (state === 'wrong') {
      return {
        label: '오답',
        className: 'bg-red-100 text-red-600 border border-red-200',
      };
    }
    return undefined;
  };

  const renderTags = (tags?: string[]) => {
    if (!tags || tags.length === 0) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-400">태그 없음</span>;
    }

    return tags.map((tag) => (
      <span
        key={tag}
        className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600"
      >
        {tag}
      </span>
    ));
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

      {/* 문제 목록 테이블 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          {showStats ? (
            <div className="grid grid-cols-[120px_minmax(0,1fr)_200px_120px_120px] items-center gap-4">
              <div className="flex justify-center">
                {renderSortableHeader('번호', 'number')}
              </div>
              <div className="text-center text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                제목
              </div>
              <div className="text-center text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                태그
              </div>
              <div className="flex justify-center">
                {renderSortableHeader('전체 제출수', 'submission')}
              </div>
              <div className="flex justify-center">
                {renderSortableHeader('정답률', 'accuracy')}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[150px_minmax(0,1fr)_200px] items-center gap-4">
              <div className="flex justify-center">
                {renderSortableHeader('번호', 'number')}
              </div>
              <div className="text-center text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                제목
              </div>
              <div className="text-center text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                태그
              </div>
            </div>
          )}
        </div>
        <div className="divide-y divide-gray-200">
          {problems.map((problem) => {
            const badge = getStatusBadge(problem);
            const statusState = resolveStatusState(problem);
            return (
              <div
                key={problem.id}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onProblemClick(problem.id)}
              >
                {showStats ? (
                  <div className="grid grid-cols-[120px_minmax(0,1fr)_200px_120px_120px] items-center gap-4">
                    <div className="text-sm font-medium text-gray-900 text-center">
                      {showOriginalId ? problem._id ?? problem.displayId ?? problem.id : problem.displayId ?? problem.id}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-center">
                      <div className="text-sm font-medium text-gray-900 hover:text-blue-600">
                        {problem.title}
                      </div>
                      {statusState === 'untouched' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                          미시도
                        </span>
                      )}
                      {badge && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-center flex-wrap gap-1">
                      {renderTags(problem.tags)}
                    </div>
                    <div className="text-sm text-gray-500 text-center">
                      {problem.submissionNumber ?? 0}
                    </div>
                    <div className="text-sm text-gray-500 text-center">
                      {problem.acceptedNumber && problem.submissionNumber
                        ? `${Math.round((problem.acceptedNumber / problem.submissionNumber) * 100)}%`
                        : '0%'
                      }
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-[150px_minmax(0,1fr)_200px] items-center gap-4">
                    <div className="text-sm font-medium text-gray-900 text-center">
                      {showOriginalId ? problem._id ?? problem.displayId ?? problem.id : problem.displayId ?? problem.id}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-center">
                      <div className="text-sm font-medium text-gray-900 hover:text-blue-600">
                        {problem.title}
                      </div>
                      {statusState === 'untouched' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                          미시도
                        </span>
                      )}
                      {badge && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-center flex-wrap gap-1">
                      {renderTags(problem.tags)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && onPageChange && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <Button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-gray-900"
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
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
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
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-gray-900"
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
};
