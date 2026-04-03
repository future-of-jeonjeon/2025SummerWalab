import React from 'react';

import type { UserGoal } from '../../services/todoService';
import { formatGoalDateRange, formatGoalDifficulty, GOAL_PERIOD_LABELS, GOAL_PERIOD_TONES, GOAL_TYPE_LABELS } from '../../utils/goals';

interface UserGoalCardProps {
  goal: UserGoal;
  className?: string;
  compact?: boolean;
}

export const UserGoalCard: React.FC<UserGoalCardProps> = ({
  goal,
  className = '',
  compact = false,
}) => {
  const tone = GOAL_PERIOD_TONES[goal.period];
  const isComplete = goal.progress.percent >= 100;
  const remaining = Math.max(goal.target - goal.count, 0);
  const cardClassName = compact
    ? `rounded-2xl border border-gray-200/90 bg-white/88 p-4 shadow-none ring-0 ${tone.soft} dark:border-slate-700 dark:bg-slate-800/90`
    : `rounded-3xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ${tone.soft} dark:border-slate-700 dark:bg-slate-800`;
  const metricClassName = compact
    ? `shrink-0 rounded-xl px-2.5 py-1.5 text-right ${tone.badge}`
    : `shrink-0 rounded-2xl px-3 py-2 text-right ${tone.badge}`;

  return (
    <article className={`${cardClassName} ${className}`}>
      <div className={`flex items-start justify-between ${compact ? 'gap-3' : 'gap-4'}`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${tone.badge} ${tone.badgeText}`}>
              {GOAL_PERIOD_LABELS[goal.period]}
            </span>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:bg-slate-700 dark:text-slate-300">
              {GOAL_TYPE_LABELS[goal.type]}
            </span>
          </div>
          <h3 className={`mt-3 font-semibold leading-6 text-gray-900 dark:text-white ${compact ? 'text-sm' : 'text-base'}`}>
            {goal.label}
          </h3>
          {goal.type === 'TIER_SOLVE' && goal.difficulty && (
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              난이도: {formatGoalDifficulty(goal.difficulty)}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">{formatGoalDateRange(goal)}</p>
        </div>
        <div className={metricClassName}>
          <p className={`${compact ? 'text-base' : 'text-lg'} font-bold ${tone.badgeText}`}>{goal.progress.percent}%</p>
          <p className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
            {isComplete ? '완료' : '진행 중'}
          </p>
        </div>
      </div>

      <div className={`${compact ? 'mt-4' : 'mt-5'} flex items-center justify-between text-xs font-medium text-gray-500 dark:text-slate-400`}>
        <span>
          {goal.count} / {goal.target} {goal.unit}
        </span>
        <span className={tone.text}>
          {isComplete ? '목표 달성' : `${remaining} 남음`}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-slate-700">
        <div
          className={`${tone.progress} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${goal.progress.percent}%` }}
        />
      </div>
    </article>
  );
};
