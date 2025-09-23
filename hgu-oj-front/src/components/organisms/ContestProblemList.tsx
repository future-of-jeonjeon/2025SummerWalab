import React from 'react';
import { Problem } from '../../types';

interface ContestProblemListProps {
  problems: Problem[];
  onProblemClick?: (problem: Problem) => void;
  disabled?: boolean;
  statusOverrides?: Record<number, string>;
}

const resolveStatusState = (problem: Problem, override?: string) => {
  if (override) {
    const normalizedOverride = override.trim().toUpperCase();
    if (normalizedOverride === 'AC' || normalizedOverride === 'ACCEPTED') {
      return 'solved' as const;
    }
    if (normalizedOverride === 'TRIED' || normalizedOverride === 'ATTEMPTED') {
      return 'attempted' as const;
    }
    if (normalizedOverride === 'WA' || normalizedOverride === 'WRONG' || normalizedOverride === 'WRONG_ANSWER') {
      return 'wrong' as const;
    }
    if (normalizedOverride === 'UNATTEMPTED' || normalizedOverride === 'NONE') {
      return 'untouched' as const;
    }
  }

  const rawStatus = problem.myStatus ?? (problem as any).my_status;
  const normalized = (() => {
    if (rawStatus == null) return '';
    const value = String(rawStatus).trim();
    if (!value) return '';
    if (value === '0') return 'AC';
    return value.toUpperCase();
  })();

  if (problem.solved || normalized === 'AC' || normalized === 'ACCEPTED') {
    return 'solved' as const;
  }
  if (!normalized) {
    return 'untouched' as const;
  }
  if (normalized === '-1' || normalized === 'WA' || normalized === 'WRONG_ANSWER') {
    return 'wrong' as const;
  }
  return 'attempted' as const;
};

const getStatusBadge = (problem: Problem, overrideState?: string) => {
  const state = resolveStatusState(problem, overrideState);
  switch (state) {
    case 'solved':
      return {
        label: '정답',
        className: 'bg-green-100 text-green-700 border border-green-200',
      };
    case 'wrong':
      return {
        label: '틀림',
        className: 'bg-red-100 text-red-600 border border-red-200',
      };
    case 'attempted':
      return {
        label: '시도',
        className: 'bg-amber-100 text-amber-700 border border-amber-200',
      };
    case 'untouched':
    default:
      return {
        label: '미시도',
        className: 'bg-gray-100 text-gray-600 border border-gray-300',
      };
  }
};

export const ContestProblemList: React.FC<ContestProblemListProps> = ({ problems, onProblemClick, disabled = false, statusOverrides }) => {

  if (!problems.length) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 text-lg">공개된 문제가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 bg-slate-100 dark:bg-slate-800/70">
        <div className="grid grid-cols-12 gap-3 text-xs font-medium text-gray-600 dark:text-slate-200 uppercase tracking-wider">
          <div className="col-span-2 text-center">문제 번호</div>
          <div className="col-span-5">제목</div>
          <div className="col-span-3 text-center">상태</div>
          <div className="col-span-2 text-center">제출 / 정답률</div>
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
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-2 text-sm font-medium text-gray-900 text-center">
                  {problem.displayId ?? problem.id}
                </div>
                <div className="col-span-5">
                  <div className="text-sm font-medium text-gray-900">{problem.title}</div>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                    {problem.description?.replace(/<[^>]*>/g, '') || '설명이 없습니다.'}
                  </p>
                </div>
                <div className="col-span-3 flex justify-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="col-span-2 text-sm text-gray-500 text-center">
                  {submissions}회 / {ratio}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
