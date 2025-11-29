import React, { useCallback, useMemo, useState } from 'react';
import { Problem } from '../../types';
import { Button } from '../atoms/Button';
import { resolveProblemStatus } from '../../utils/problemStatus';
import { PROBLEM_STATUS_LABELS } from '../../constants/problemStatus';
import TagChip from '../atoms/TagChip';
import { extractProblemTags } from '../../utils/problemTags';
import { getDifficultyMeta, mapDifficulty } from '../../lib/difficulty';
import { getTagColor } from '../../utils/tagColor';

interface ProblemListProps {
  problems: Problem[];
  onProblemClick: (problemKey: string) => void;
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
  onSortChange?: (field: 'number' | 'title' | 'submission' | 'accuracy') => void;
  sortField?: 'number' | 'title' | 'submission' | 'accuracy';
  sortOrder?: 'asc' | 'desc';
  primarySortField?: 'number' | 'title';
  getRowNumber?: (problem: Problem, index: number) => React.ReactNode;
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
  primarySortField = 'number',
  getRowNumber,
}) => {
  const renderSortableHeader = (
    label: string,
    field: 'number' | 'title' | 'submission' | 'accuracy',
    align: 'left' | 'center' | 'right' = 'center'
  ) => {
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

  const resolveStatusState = (problem: Problem) => (showStatus ? resolveProblemStatus(problem) : undefined);

  const getStatusBadge = (problem: Problem) => {
    if (!showStatus) return undefined;
    const state = resolveStatusState(problem);

    if (state === 'solved') {
      return {
        label: PROBLEM_STATUS_LABELS.solved,
        className: 'bg-green-100 text-green-700 border border-green-200',
      };
    }
    if (state === 'wrong') {
      return {
        label: PROBLEM_STATUS_LABELS.wrong,
        className: 'bg-red-100 text-red-600 border border-red-200',
      };
    }
    return undefined;
  };

  const [expandedTags, setExpandedTags] = useState<Record<number, boolean>>({});

  const toggleTagExpansion = useCallback((problemId: number) => {
    setExpandedTags((previous) => ({
      ...previous,
      [problemId]: !previous[problemId],
    }));
  }, []);

  const problemTagsMap = useMemo(() => {
    return problems.reduce<Record<number, string[]>>((acc, problem) => {
      acc[problem.id] = extractProblemTags(problem);
      return acc;
    }, {});
  }, [problems]);

  const renderTagChips = (problem: Problem) => {
    const tags = problemTagsMap[problem.id] ?? [];
    const isExpanded = Boolean(expandedTags[problem.id]);
    const visibleTags = isExpanded ? tags : tags.slice(0, 2);
    const hiddenCount = tags.length - visibleTags.length;

    if (tags.length === 0) {
      return <TagChip label="태그 없음" colorScheme={undefined} />;
    }

    return (
      <>
        {visibleTags.map((tag) => (
          <TagChip key={tag} label={tag} colorScheme={getTagColor(tag)} />
        ))}
        {hiddenCount > 0 && !isExpanded && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleTagExpansion(problem.id);
            }}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            +{hiddenCount}
          </button>
        )}
        {isExpanded && tags.length > 2 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleTagExpansion(problem.id);
            }}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            접기
          </button>
        )}
      </>
    );
  };

  const renderDifficultyBadge = (problem: Problem) => {
    const rawDifficulty =
      (problem as any).difficulty ??
      (problem as any).level ??
      (problem as any).difficulty_level ??
      (problem as any).difficultyLevel ??
      (problem as any).difficulty_name ??
      (problem as any).difficultyName;

    const label = mapDifficulty(rawDifficulty);
    if (label === '-') {
      return <span className="text-sm text-gray-400">-</span>;
    }

    const meta = getDifficultyMeta(rawDifficulty);
    const className = meta?.className ?? 'bg-blue-100 text-blue-700 border border-blue-200';

    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
        {label}
      </span>
    );
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
            <div className="grid grid-cols-[120px_minmax(0,1fr)_220px_110px_120px_120px] items-center gap-4">
              {primarySortField === 'title' ? (
                <>
                  <div className="flex h-full items-center justify-center text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    번호
                  </div>
                  <div className="flex h-full items-center">
                    {renderSortableHeader('제목', 'title', 'left')}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-full items-center justify-center">
                    {renderSortableHeader('번호', 'number')}
                  </div>
                  <div className="flex h-full items-center text-left text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    제목
                  </div>
                </>
              )}
              <div className="flex h-full items-center justify-end text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                태그
              </div>
              <div className="flex h-full items-center justify-end text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                난이도
              </div>
              <div className="flex h-full items-center justify-end">
                {renderSortableHeader('전체 제출수', 'submission', 'right')}
              </div>
              <div className="flex h-full items-center justify-end">
                {renderSortableHeader('정답률', 'accuracy', 'right')}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[150px_minmax(0,1fr)_220px_110px] items-center gap-4">
              {primarySortField === 'title' ? (
                <>
                  <div className="flex h-full items-center justify-center text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    번호
                  </div>
                  <div className="flex h-full items-center">
                    {renderSortableHeader('제목', 'title', 'left')}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-full items-center justify-center">
                    {renderSortableHeader('번호', 'number')}
                  </div>
                  <div className="flex h-full items-center text-left text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    제목
                  </div>
                </>
              )}
              <div className="flex h-full items-center justify-end text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                태그
              </div>
              <div className="flex h-full items-center justify-end text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                난이도
              </div>
            </div>
          )}
        </div>
        <div className="divide-y divide-gray-200">
          {problems.map((problem, index) => {
            const badge = getStatusBadge(problem);
            const resolvedNumber = getRowNumber
              ? getRowNumber(problem, index)
              : (showOriginalId ? problem._id ?? problem.displayId ?? problem.id : problem.displayId ?? problem.id);
            return (
              <div
                key={problem.id}
                className="px-6 py-4 transition-colors hover:bg-gray-50"
              >
                {showStats ? (
                  <div className="grid grid-cols-[120px_minmax(0,1fr)_220px_110px_120px_120px] items-center gap-4">
                    <div className="flex h-full items-center justify-center text-sm font-medium text-gray-900">
                      {resolvedNumber}
                    </div>
                    <div className="flex h-full items-center justify-start gap-2 text-left">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const keyCandidate = problem._id ?? problem.displayId ?? problem.id;
                          if (keyCandidate === null || keyCandidate === undefined) {
                            return;
                          }
                          const key = String(keyCandidate);
                          onProblemClick(key);
                        }}
                        className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                      >
                        {problem.title}
                      </button>
                      {badge && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <div className="flex min-h-[32px] flex-wrap items-center justify-end gap-1">
                      {renderTagChips(problem)}
                    </div>
                    <div className="flex h-full items-center justify-end">
                      {renderDifficultyBadge(problem)}
                    </div>
                    <div className="flex h-full items-center justify-end text-sm text-gray-500">
                      {problem.submissionNumber ?? 0}
                    </div>
                    <div className="flex h-full items-center justify-end text-sm text-gray-500">
                      {problem.acceptedNumber && problem.submissionNumber
                        ? `${Math.round((problem.acceptedNumber / problem.submissionNumber) * 100)}%`
                        : '0%'
                      }
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-[150px_minmax(0,1fr)_220px_110px] items-center gap-4">
                    <div className="flex h-full items-center justify-center text-sm font-medium text-gray-900">
                      {resolvedNumber}
                    </div>
                    <div className="flex h-full items-center justify-start gap-2 text-left">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const keyCandidate = problem._id ?? problem.displayId ?? problem.id;
                          if (keyCandidate === null || keyCandidate === undefined) {
                            return;
                          }
                          const key = String(keyCandidate);
                          onProblemClick(key);
                        }}
                        className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                      >
                        {problem.title}
                      </button>
                      {badge && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <div className="flex min-h-[32px] flex-wrap items-center justify-end gap-1">
                      {renderTagChips(problem)}
                    </div>
                    <div className="flex h-full items-center justify-end">
                      {renderDifficultyBadge(problem)}
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
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            className="px-4 py-2 rounded-lg text-white bg-slate-500 hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            처음
          </Button>
          <Button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-4 py-2 rounded-lg text-white bg-slate-500 hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            이전
          </Button>
          
          <div className="flex space-x-1">
            {(() => {
              const windowSize = Math.min(5, totalPages);
              const halfWindow = Math.floor(windowSize / 2);
              let start = currentPage - halfWindow;
              if (start < 1) {
                start = 1;
              }
              const end = Math.min(totalPages, start + windowSize - 1);
              if (end - start + 1 < windowSize) {
                start = Math.max(1, end - windowSize + 1);
              }
              return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
            })().map((page) => {
              return (
                <Button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`px-3 py-2 rounded-lg font-semibold ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-300 border border-slate-400 text-slate-800 hover:border-blue-500'
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
            className="px-4 py-2 rounded-lg text-white bg-slate-500 hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            다음
          </Button>
          <Button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 rounded-lg text-white bg-slate-500 hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            마지막
          </Button>
        </div>
      )}
    </div>
  );
};
