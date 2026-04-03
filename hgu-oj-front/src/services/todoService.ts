import { api, MS_API_BASE } from './api';

export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';
export type GoalType = 'SOLVE_COUNT' | 'ATTENDANCE' | 'TIER_SOLVE';
export type GoalDifficulty = 1 | 2 | 3 | 4 | 5;

export interface GoalRecommendation {
  id: string;
  label: string;
  type: GoalType;
  target: number;
  unit: string;
  difficulty?: GoalDifficulty | null;
  customDays?: number | null;
}

export interface RecommendationsResponse {
  daily: GoalRecommendation[];
  weekly: GoalRecommendation[];
  monthly: GoalRecommendation[];
}

export interface UserGoalInput {
  id?: string;
  period: GoalPeriod;
  type: GoalType;
  target: number;
  difficulty?: GoalDifficulty | null;
  customDays?: number | null;
}

export interface GoalProgress {
  current: number;
  percent: number;
}

export interface UserGoal extends UserGoalInput {
  id: string;
  count: number;
  unit: string;
  label: string;
  startDay: string;
  endDay: string;
  progress: GoalProgress;
}

export interface UserTodo {
  goals: UserGoal[];
}

export interface UserTodoUpdate {
  goals: UserGoalInput[];
}

export interface SolveCountStats {
  daily: number;
  weekly: number;
  monthly: number;
}

export interface AttendanceSyncResponse {
  checked: boolean;
  checked_on: string;
}

export interface DifficultyCount {
  difficulty: string;
  count: number;
}

export interface DifficultyStats {
  stats: DifficultyCount[];
}

interface ApiGoalRecommendation {
  id: string;
  label: string;
  type: GoalType;
  target: number;
  unit: string;
  difficulty?: GoalDifficulty | null;
  custom_days?: number | null;
}

interface ApiGoalProgress {
  current: number;
  percent: number;
}

interface ApiUserGoal {
  id: string;
  period: GoalPeriod;
  type: GoalType;
  target: number;
  count: number;
  unit: string;
  difficulty?: GoalDifficulty | null;
  custom_days?: number | null;
  start_day: string;
  end_day: string;
  label: string;
  progress: ApiGoalProgress;
}

interface ApiUserTodo {
  goals: ApiUserGoal[];
}

interface ApiUserGoalInput {
  id?: string;
  period: GoalPeriod;
  type: GoalType;
  target: number;
  difficulty?: GoalDifficulty | null;
  custom_days?: number | null;
}

const getUrl = (path: string) => `${MS_API_BASE}${path}`;

const toUserGoal = (goal: ApiUserGoal): UserGoal => ({
  id: goal.id,
  period: goal.period,
  type: goal.type,
  target: goal.target,
  count: goal.count,
  unit: goal.unit,
  difficulty: goal.difficulty ?? null,
  customDays: goal.custom_days ?? null,
  startDay: goal.start_day,
  endDay: goal.end_day,
  label: goal.label,
  progress: goal.progress,
});

const toApiGoalInput = (goal: UserGoalInput): ApiUserGoalInput => ({
  id: goal.id,
  period: goal.period,
  type: goal.type,
  target: goal.target,
  difficulty: goal.difficulty ?? null,
  custom_days: goal.customDays ?? null,
});

const toRecommendation = (goal: ApiGoalRecommendation): GoalRecommendation => ({
  ...goal,
  customDays: goal.custom_days ?? null,
});

export const todoService = {
  getMyTodo: async (): Promise<UserTodo> => {
    const { data } = await api.get<ApiUserTodo>(getUrl('/todo/my'));
    return {
      goals: (data?.goals ?? []).map(toUserGoal),
    };
  },

  setMyTodo: async (todo: UserTodoUpdate): Promise<UserTodo> => {
    const payload = {
      goals: todo.goals.map(toApiGoalInput),
    };
    const { data } = await api.post<ApiUserTodo>(getUrl('/todo/my'), payload);
    return {
      goals: (data?.goals ?? []).map(toUserGoal),
    };
  },

  syncAttendance: async (): Promise<AttendanceSyncResponse> => {
    const { data } = await api.post<AttendanceSyncResponse>(getUrl('/todo/attendance/sync'));
    return data;
  },

  getRecommendations: async (): Promise<RecommendationsResponse> => {
    const { data } = await api.get<{
      daily: ApiGoalRecommendation[];
      weekly: ApiGoalRecommendation[];
      monthly: ApiGoalRecommendation[];
    }>(getUrl('/todo/recommendations'));
    return {
      daily: (data?.daily ?? []).map(toRecommendation),
      weekly: (data?.weekly ?? []).map(toRecommendation),
      monthly: (data?.monthly ?? []).map(toRecommendation),
    };
  },

  getSolveCountStats: async (): Promise<SolveCountStats> => {
    const { data } = await api.get<SolveCountStats>(getUrl('/todo/stats/solve-count'));
    return data;
  },

  getDifficultyStats: async (): Promise<DifficultyStats> => {
    const { data } = await api.get<DifficultyStats>(getUrl('/todo/stats/difficulty'));
    return data;
  },
};
