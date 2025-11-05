import React from 'react';
import { Problem } from '../../types';
import { resolveProblemStatus } from '../../utils/problemStatus';
import { PROBLEM_STATUS_LABELS } from '../../constants/problemStatus';

interface ContestProblemListProps {
  problems: Problem[];
  onProblemClick?: (problem: Problem) => void;
  disabled?: boolean;
  statusOverrides?: Record<number, string>;
  onSortChange?: (field: 'number' | 'submission' | 'accuracy') => void;
  sortField?: 'number' | 'submission' | 'accuracy';
  sortOrder?: 'asc' | 'desc';
}

const getStatusBadge = (problem: Problem, overrideState?: string): { label: string; className: string } | null => {
  const state = resolveProblemStatus(problem, { override: overrideState });
  switch (state) {
    case PROBLEM_STATUS_LABELS.solved:
      return {
        label: PROBLEM_STATUS_LABELS.solved,
        className: 'bg-green-100 text-green-700 border border-green-200',
      };
    case PROBLEM_STATUS_LABELS.wrong:
      return {
        label: PROBLEM_STATUS_LABELS.wrong,
        className: 'bg-red-100 text-red-600 border border-red-200',
      };
    case 'attempted':
      return {
        label: PROBLEM_STATUS_LABELS.attempted,
        className: 'bg-amber-100 text-amber-700 border border-amber-200',
      };
    case PROBLEM_STATUS_LABELS.untouched:
      return null;
    default:
      return null;
  }
};

export const ContestProblemList: React.FC<ContestProblemListProps> = ({
  problems,
  onProblemClick,
  disabled = false,
  statusOverrides,
  onSortChange,
  sortField,
  sortOrder,
}) => {

  const renderSortableHeader = (label: string, field: 'number' | 'submission' | 'accuracy', align: 'left' | 'center' | 'right' = 'center') => {
    if (!onSortChange) {
      return (
        <span
          className={`inline-flex w-full items-center ${align === 'left' ? 'justify-start text-left' : align === 'right' ? 'justify-end text-right' : 'justify-center text-center'} text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-200`}
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
        className={`inline-flex w-full items-center ${alignmentClass} gap-1 rounded px-1 py-0.5 text-xs font-semibold uppercase tracking-wider focus:outline-none focus-visible:outline-none focus-visible:ring-0 active:outline-none ${isActive ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-slate-200'}`}
      >
        <span>{label}</span>
        <span className="flex flex-col leading-none text-[10px]">
          <span className={isAsc ? 'text-blue-600 dark:text-blue-300' : 'text-slate-300 dark:text-slate-600'}>▲</span>
          <span className={isDesc ? 'text-blue-600 dark:text-blue-300' : 'text-slate-300 dark:text-slate-600'}>▼</span>
        </span>
      </button>
    );
  };

  if (!problems.length) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 text-lg">표시할 문제가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 bg-slate-100 dark:bg-slate-800/70">
        <div className="grid grid-cols-[120px_minmax(0,1fr)_160px_120px_120px] items-center gap-3 text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-slate-200">
          <div className="flex justify-center">
            {renderSortableHeader('문제 번호', 'number')}
          </div>
          <div className="text-left">제목</div>
          <div className="flex justify-center">상태</div>
          <div className="flex justify-center">
            {renderSortableHeader('제출수', 'submission')}
          </div>
          <div className="flex justify-center">
            {renderSortableHeader('정답률', 'accuracy')}
          </div>
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {problems.map((problem) => {
          const submissions = problem.submissionNumber ?? 0;
          const accepted = problem.acceptedNumber ?? 0;
          const ratio = submissions > 0 ? `${Math.round((accepted / submissions) * 100)}%` : '0%';
          const overrideState = statusOverrides ? statusOverrides[problem.id] : undefined;
          const badge = getStatusBadge(problem, overrideState);

          return (
            <div
              key={problem.id}
              className={`px-5 py-3 transition-colors ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-gray-50'}`}
              onClick={() => {
                if (!disabled) {
                  onProblemClick?.(problem);
                }
              }}
              role={onProblemClick && !disabled ? 'button' : undefined}
              tabIndex={onProblemClick && !disabled ? 0 : -1}
              onKeyDown={(event) => {
                if (!disabled && onProblemClick && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  onProblemClick(problem);
                }
              }}
            >
              <div className="grid grid-cols-[120px_minmax(0,1fr)_160px_120px_120px] items-center gap-3">
                <div className="text-sm font-medium text-gray-900 text-center">
                  {problem.displayId ?? problem.id}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{problem.title}</div>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                    {problem.description?.replace(/<[^>]*>/g, '') || '설명이 없습니다.'}
                  </p>
                </div>
                <div className="flex justify-center">
                  {badge && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 text-center">
                  {submissions}회
                </div>
                <div className="text-sm text-gray-500 text-center">
                  {ratio}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
