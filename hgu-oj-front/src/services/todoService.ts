import { api, MS_API_BASE } from './api';

export type GoalPeriod = 'daily' | 'weekly' | 'monthly';
export type GoalType = 'SOLVE_COUNT' | 'STREAK' | 'TIER_SOLVE';
export type GoalDifficulty = 'Bronze' | 'Mid' | 'Gold';

export interface GoalRecommendation {
  id: string;
  label: string;
  type: GoalType;
  target: number;
  unit: string;
  difficulty?: GoalDifficulty | null;
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
}

export interface GoalProgress {
  current: number;
  percent: number;
}

export interface UserGoal extends UserGoalInput {
  id: string;
  unit: string;
  label: string;
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

export interface StreakStats {
  streak: number;
}

export interface DifficultyCount {
  difficulty: string;
  count: number;
}

export interface DifficultyStats {
  stats: DifficultyCount[];
}

const getUrl = (path: string) => `${MS_API_BASE}${path}`;

export const todoService = {
  getMyTodo: async (): Promise<UserTodo> => {
    const { data } = await api.get<UserTodo>(getUrl('/todo/my'));
    return data ?? { goals: [] };
  },

  setMyTodo: async (todo: UserTodoUpdate): Promise<UserTodo> => {
    const { data } = await api.post<UserTodo>(getUrl('/todo/my'), todo);
    return data;
  },

  getRecommendations: async (): Promise<RecommendationsResponse> => {
    const { data } = await api.get<RecommendationsResponse>(getUrl('/todo/recommendations'));
    return data;
  },

  getSolveCountStats: async (): Promise<SolveCountStats> => {
    const { data } = await api.get<SolveCountStats>(getUrl('/todo/stats/solve-count'));
    return data;
  },

  getStreakStats: async (): Promise<StreakStats> => {
    const { data } = await api.get<StreakStats>(getUrl('/todo/stats/streak'));
    return data;
  },

  getDifficultyStats: async (): Promise<DifficultyStats> => {
    const { data } = await api.get<DifficultyStats>(getUrl('/todo/stats/difficulty'));
    return data;
  },
};
