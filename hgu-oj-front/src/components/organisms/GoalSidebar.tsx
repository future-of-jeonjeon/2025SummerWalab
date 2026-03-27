import React from 'react';
import { Link } from 'react-router-dom';

import { useUserGoals } from '../../hooks/useUserGoals';
import { useAuthStore } from '../../stores/authStore';
import { UserGoalCard } from '../molecules/UserGoalCard';

interface GoalSidebarProps {
  className?: string;
  topOffsetClassName?: string;
  topOffsetPx?: number;
  sticky?: boolean;
}

export const GoalSidebar: React.FC<GoalSidebarProps> = ({
  className = '',
  topOffsetClassName = 'top-24',
  topOffsetPx,
  sticky = true,
}) => {
  const { isAuthenticated } = useAuthStore();
  const { goals, isLoading } = useUserGoals();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <aside
      className={`${className} ${sticky ? `${topOffsetPx === undefined ? `sticky ${topOffsetClassName}` : 'sticky'}` : ''}`.trim()}
      style={sticky && topOffsetPx !== undefined ? { top: `${topOffsetPx}px` } : undefined}
    >
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white/88 shadow-sm dark:border-slate-800 dark:bg-slate-900/88">
        <div className="border-b border-gray-100/90 px-4 py-3 dark:border-slate-800">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-400 dark:text-slate-500">Goals</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">학습 목표</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">진행 중인 목표만 표시됩니다</p>
            </div>
            <Link
              to="/mypage"
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 transition hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              관리
            </Link>
          </div>
        </div>

        <div className="px-3.5 py-3.5">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`goal-skeleton-${index}`} className="h-32 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800" />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-center dark:border-slate-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3A9 9 0 1112 3a9 9 0 019 9z" />
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">설정된 목표가 없습니다</h3>
              <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-slate-400">
                마이페이지에서 원하는 목표를 자유롭게 추가할 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => (
                <UserGoalCard key={goal.id} goal={goal} compact />
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
