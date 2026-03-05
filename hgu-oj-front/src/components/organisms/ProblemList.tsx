import React from 'react';
import { Problem } from '../../types';
import { resolveProblemStatus } from '../../utils/problemStatus';
import { PROBLEM_STATUS_LABELS } from '../../constants/problemStatus';

interface ProblemListProps {
  problems: Problem[];
  onProblemClick: (problemKey: string) => void;
  onTagClick?: (tag: string) => void;
  isLoading?: boolean;
  onSortChange?: (field: 'number' | 'title' | 'submission' | 'accuracy') => void;
  sortField?: 'number' | 'title' | 'submission' | 'accuracy';
  sortOrder?: 'asc' | 'desc';
  showStatus?: boolean;
  showStats?: boolean;
  getRowNumber?: (problem: Problem, index: number) => number;
}

export const ProblemList: React.FC<ProblemListProps> = ({
  problems,
  onProblemClick,
  onTagClick,
  isLoading = false,
  onSortChange,
  sortField,
  sortOrder,
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

  const getStatusBadge = (problem: Problem) => {
    // Show status implicitly via colors or ignored? 
    // The previous code had `showStatus` prop. User wanted "Problem Status" removed from detail page HEADER, but maybe kept in list?
    // The image shows "해결" column with numbers, but no "Solved/Wrong" badge on title? 
    // The image doesn't show a badge next to title.
    // I will keep logic but maybe not render it if not requested? 
    // Wait, the previous code rendered it next to title. The image doesn't show it.
    // I will checking `resolveProblemStatus` but only return if needed. 
    // Actually, I'll keep the badge logic but maybe make it subtle or just render it, as it's useful info. 
    // But the updated `renderDifficultyBadge` is the main request.
    const state = resolveProblemStatus(problem);

    if (state === 'solved') {
      return {
        label: PROBLEM_STATUS_LABELS.solved,
        className: 'rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
      };
    }
    if (state === 'wrong') {
      return {
        label: PROBLEM_STATUS_LABELS.wrong,
        className: 'rounded-md border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
      };
    }
    if (state === 'attempted') {
      return {
        label: PROBLEM_STATUS_LABELS.wrong,
        className: 'rounded-md border border-rose-200/80 bg-rose-50/70 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300',
      };
    }
    return undefined;
  };

  const renderDifficultyBadge = (problem: Problem) => {
    const rawDifficulty =
      (problem as any).difficulty ??
      (problem as any).level ??
      (problem as any).difficulty_level ??
      (problem as any).difficultyLevel ??
      (problem as any).difficulty_name ??
      (problem as any).difficultyName;

    // Display raw number if available, otherwise '-'
    if (rawDifficulty === undefined || rawDifficulty === null || rawDifficulty === '') {
      return <span className="text-sm text-gray-400 dark:text-slate-500">-</span>;
    }

    const displayDifficulty = String(rawDifficulty).replace(/^Lv\.\s*/i, '');
    const level = Number(displayDifficulty);
    let badgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100 dark:ring-1 dark:ring-slate-500/60'; // Default

    if (!Number.isNaN(level)) {
      if (level === 1) badgeClass = 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300';
      else if (level === 2) badgeClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
      else if (level === 3) badgeClass = 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
      else if (level === 4) badgeClass = 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300';
      else if (level >= 5) badgeClass = 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300';
    }

    return (
      <span className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs font-bold ${badgeClass}`}>
        Lv.{displayDifficulty}
      </span>
    );
  };

  const getDisplayTags = (problem: Problem): string[] => {
    const tags = [
      ...(Array.isArray((problem as any).tags) ? (problem as any).tags : []),
      ...(Array.isArray((problem as any).tagNames) ? (problem as any).tagNames : []),
      ...(Array.isArray((problem as any).tag_list) ? (problem as any).tag_list : []),
    ]
      .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
      .filter((tag) => tag.length > 0);

    return Array.from(new Set(tags));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded mb-4"></div>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 border-b border-gray-200 dark:border-slate-700 last:border-b-0">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/6"></div>
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
        <div className="text-gray-600 dark:text-slate-400 text-lg mb-4">문제가 없습니다</div>
        <p className="text-gray-500 dark:text-slate-400">다른 검색어를 시도해보세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <div className="grid grid-cols-[minmax(0,1fr)_100px_100px] items-center gap-4">
            <div className="flex h-full items-center">
              {renderSortableHeader('제목', 'title', 'left')}
            </div>
            <div className="flex h-full items-center justify-center text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
              난이도
            </div>
            <div className="flex h-full items-center justify-end">
              {renderSortableHeader('정답률', 'accuracy', 'right')}
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-slate-700">
          {problems.map((problem) => {
            const badge = getStatusBadge(problem);
            const tags = getDisplayTags(problem);
            const problemKey = String(problem.displayId ?? problem.id);

            return (
              <div
                key={problem.id}
                className="px-6 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 hover:shadow-sm"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_100px_100px] items-center gap-4">
                  <div className="flex h-full flex-col items-start justify-center gap-2 text-left">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onProblemClick(problemKey);
                        }}
                        className="text-base font-semibold text-gray-800 dark:text-slate-100 hover:text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        {problem.title}
                      </button>
                      {badge && (
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-tight uppercase ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => onTagClick?.(tag)}
                            className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex h-full items-center justify-center">
                    {renderDifficultyBadge(problem)}
                  </div>
                  <div className="flex h-full items-center justify-end text-sm text-gray-600 dark:text-slate-300 font-medium">
                    {problem.acceptedNumber && problem.submissionNumber
                      ? `${Math.round((problem.acceptedNumber / problem.submissionNumber) * 100)}%`
                      : '0%'
                    }
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
