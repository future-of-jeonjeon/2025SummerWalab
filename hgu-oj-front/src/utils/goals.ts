import type { GoalDifficulty, GoalPeriod, GoalType, UserGoal, UserGoalInput } from '../services/todoService';

export const GOAL_PERIOD_LABELS: Record<GoalPeriod, string> = {
  daily: '일간',
  weekly: '주간',
  monthly: '월간',
};

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  SOLVE_COUNT: '문제 해결',
  STREAK: '연속 출석',
  TIER_SOLVE: '난이도 목표',
};

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
};

export const getGoalUnit = (type: GoalType) => (type === 'STREAK' ? 'day' : 'problem');

export const getGoalLabel = (goal: Pick<UserGoalInput, 'period' | 'type' | 'target' | 'difficulty'>) => {
  const periodLabel = GOAL_PERIOD_LABELS[goal.period];
  if (goal.type === 'STREAK') {
    return `${periodLabel} ${goal.target}일 연속 출석`;
  }
  if (goal.type === 'TIER_SOLVE') {
    return `${periodLabel} ${goal.difficulty ?? 'Bronze'} 문제 ${goal.target}개 해결`;
  }
  return `${periodLabel} ${goal.target}문제 해결`;
};

export const createEmptyGoalInput = (): UserGoalInput => ({
  period: 'daily',
  type: 'SOLVE_COUNT',
  target: 1,
  difficulty: null,
});

export const normalizeGoalInput = (goal: UserGoalInput): UserGoalInput => {
  const normalizedDifficulty: GoalDifficulty | null =
    goal.type === 'TIER_SOLVE' ? (goal.difficulty ?? 'Bronze') : null;

  return {
    id: goal.id,
    period: goal.period,
    type: goal.type,
    target: Math.max(1, Number(goal.target) || 1),
    difficulty: normalizedDifficulty,
  };
};

export const toEditableGoalInput = (goal: UserGoal | UserGoalInput): UserGoalInput => ({
  id: goal.id,
  period: goal.period,
  type: goal.type,
  target: goal.target,
  difficulty: goal.type === 'TIER_SOLVE' ? (goal.difficulty ?? 'Bronze') : null,
});

export const createGoalDraftId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};
