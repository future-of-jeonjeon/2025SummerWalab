import type { GoalDifficulty, GoalPeriod, GoalType, UserGoal, UserGoalInput } from '../services/todoService';

export const GOAL_PERIOD_LABELS: Record<GoalPeriod, string> = {
  daily: '일간',
  weekly: '주간',
  monthly: '월간',
  custom: '커스텀',
};

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  SOLVE_COUNT: '문제 해결',
  ATTENDANCE: '출석',
  TIER_SOLVE: '난이도 목표',
};

export const GOAL_DIFFICULTY_OPTIONS: GoalDifficulty[] = [1, 2, 3, 4, 5];

export const GOAL_PERIOD_TONES: Record<GoalPeriod, {
  badge: string;
  badgeText: string;
  progress: string;
  soft: string;
  text: string;
}> = {
  daily: {
    badge: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    progress: 'bg-emerald-500',
    soft: 'ring-emerald-100 dark:ring-emerald-900/60',
    text: 'text-emerald-600 dark:text-emerald-300',
  },
  weekly: {
    badge: 'bg-blue-50 dark:bg-blue-950/40',
    badgeText: 'text-blue-700 dark:text-blue-300',
    progress: 'bg-blue-500',
    soft: 'ring-blue-100 dark:ring-blue-900/60',
    text: 'text-blue-600 dark:text-blue-300',
  },
  monthly: {
    badge: 'bg-violet-50 dark:bg-violet-950/40',
    badgeText: 'text-violet-700 dark:text-violet-300',
    progress: 'bg-violet-500',
    soft: 'ring-violet-100 dark:ring-violet-900/60',
    text: 'text-violet-600 dark:text-violet-300',
  },
  custom: {
    badge: 'bg-amber-50 dark:bg-amber-950/40',
    badgeText: 'text-amber-700 dark:text-amber-300',
    progress: 'bg-amber-500',
    soft: 'ring-amber-100 dark:ring-amber-900/60',
    text: 'text-amber-600 dark:text-amber-300',
  },
};

const GOAL_PERIOD_DAYS: Record<Exclude<GoalPeriod, 'custom'>, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

export const supportsAttendance = (period: GoalPeriod) => period !== 'daily';

export const getGoalDurationDays = (period: GoalPeriod, customDays?: number | null) => {
  if (period === 'custom') {
    return Math.max(1, Number(customDays) || 1);
  }
  return GOAL_PERIOD_DAYS[period];
};

export const getGoalResolvedTarget = (goal: Pick<UserGoalInput, 'period' | 'type' | 'target' | 'customDays'>) => {
  if (goal.type === 'ATTENDANCE') {
    return getGoalDurationDays(goal.period, goal.customDays);
  }
  return Math.max(1, Number(goal.target) || 1);
};

export const getGoalUnit = (type: GoalType) => (type === 'ATTENDANCE' ? 'day' : 'problem');

export const formatGoalDifficulty = (difficulty: GoalDifficulty | null | undefined) => `Lv.${difficulty ?? 1}`;

const getPeriodText = (period: GoalPeriod, customDays?: number | null) => {
  if (period !== 'custom') {
    return GOAL_PERIOD_LABELS[period];
  }
  return `커스텀 ${getGoalDurationDays(period, customDays)}일`;
};

export const getGoalLabel = (goal: Pick<UserGoalInput, 'period' | 'type' | 'target' | 'difficulty' | 'customDays'>) => {
  const periodLabel = getPeriodText(goal.period, goal.customDays);
  if (goal.type === 'ATTENDANCE') {
    return `${periodLabel} 출석`;
  }
  if (goal.type === 'TIER_SOLVE') {
    return `${periodLabel} ${formatGoalDifficulty(goal.difficulty)} 문제 ${getGoalResolvedTarget(goal)}개 해결`;
  }
  return `${periodLabel} ${getGoalResolvedTarget(goal)}문제 해결`;
};

export const createEmptyGoalInput = (): UserGoalInput => ({
  period: 'daily',
  type: 'SOLVE_COUNT',
  target: 1,
  difficulty: null,
  customDays: null,
});

export const normalizeGoalInput = (goal: UserGoalInput): UserGoalInput => {
  const normalizedCustomDays = goal.period === 'custom'
    ? Math.max(1, Number(goal.customDays) || 1)
    : null;
  const normalizedDifficulty: GoalDifficulty | null =
    goal.type === 'TIER_SOLVE'
      ? ((goal.difficulty ?? 1) as GoalDifficulty)
      : null;
  const normalizedTarget = goal.type === 'ATTENDANCE'
    ? getGoalDurationDays(goal.period, normalizedCustomDays)
    : Math.max(1, Number(goal.target) || 1);

  return {
    id: goal.id,
    period: goal.period,
    type: goal.type,
    target: normalizedTarget,
    difficulty: normalizedDifficulty,
    customDays: normalizedCustomDays,
  };
};

export const toEditableGoalInput = (goal: UserGoal | UserGoalInput): UserGoalInput => ({
  id: goal.id,
  period: goal.period,
  type: goal.type,
  target: goal.target,
  difficulty: goal.type === 'TIER_SOLVE' ? (goal.difficulty ?? 1) : null,
  customDays: goal.period === 'custom' ? (goal.customDays ?? 1) : null,
});

export const formatGoalDateRange = (goal: Pick<UserGoal, 'startDay' | 'endDay'>) => `${goal.startDay} ~ ${goal.endDay}`;

export const createGoalDraftId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};
