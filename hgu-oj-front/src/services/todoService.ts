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

export interface GoalHistoryHeatmapEntry {
  date: string;
  count: number;
}

export interface GoalHistorySummary {
  totalLogged: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  averageProgress: number;
}

export interface GoalHistoryEntry {
  id: string;
  period: GoalPeriod;
  type: GoalType;
  target: number;
  count: number;
  unit: string;
  difficulty?: GoalDifficulty | null;
  customDays?: number | null;
  startDay: string;
  endDay: string;
  label: string;
  isSuccess: boolean;
  percent: number;
  archivedAt: string;
}

export interface GoalHistoryGroupSummary {
  key: string;
  period: GoalPeriod;
  type: GoalType;
  target: number;
  difficulty?: GoalDifficulty | null;
  customDays?: number | null;
  label: string;
  totalLogged: number;
  successCount: number;
  failureCount: number;
  latestArchivedAt: string;
}

export interface GoalHistoryOverviewResponse {
  heatmap: GoalHistoryHeatmapEntry[];
  summary: GoalHistorySummary;
  groups: GoalHistoryGroupSummary[];
}

export interface GoalHistoryPageResponse {
  items: GoalHistoryEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

interface ApiGoalHistorySummary {
  total_logged: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  average_progress: number;
}

interface ApiGoalHistoryEntry {
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
  is_success: boolean;
  percent: number;
  archived_at: string;
}

interface ApiGoalHistoryGroupSummary {
  key: string;
  period: GoalPeriod;
  type: GoalType;
  target: number;
  difficulty?: GoalDifficulty | null;
  custom_days?: number | null;
  label: string;
  total_logged: number;
  success_count: number;
  failure_count: number;
  latest_archived_at: string;
}

interface ApiGoalHistoryOverviewResponse {
  heatmap: GoalHistoryHeatmapEntry[];
  summary: ApiGoalHistorySummary;
  groups: ApiGoalHistoryGroupSummary[];
}

interface ApiGoalHistoryPageResponse {
  items: ApiGoalHistoryEntry[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
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

const toGoalHistoryEntry = (entry: ApiGoalHistoryEntry): GoalHistoryEntry => ({
  id: entry.id,
  period: entry.period,
  type: entry.type,
  target: entry.target,
  count: entry.count,
  unit: entry.unit,
  difficulty: entry.difficulty ?? null,
  customDays: entry.custom_days ?? null,
  startDay: entry.start_day,
  endDay: entry.end_day,
  label: entry.label,
  isSuccess: entry.is_success,
  percent: entry.percent,
  archivedAt: entry.archived_at,
});

const toGoalHistoryGroupSummary = (group: ApiGoalHistoryGroupSummary): GoalHistoryGroupSummary => ({
  key: group.key,
  period: group.period,
  type: group.type,
  target: group.target,
  difficulty: group.difficulty ?? null,
  customDays: group.custom_days ?? null,
  label: group.label,
  totalLogged: group.total_logged,
  successCount: group.success_count,
  failureCount: group.failure_count,
  latestArchivedAt: group.latest_archived_at,
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

  getGoalHistoryOverview: async (): Promise<GoalHistoryOverviewResponse> => {
    const { data } = await api.get<ApiGoalHistoryOverviewResponse>(getUrl('/todo/history'));
    return {
      heatmap: data?.heatmap ?? [],
      summary: {
        totalLogged: data?.summary?.total_logged ?? 0,
        successCount: data?.summary?.success_count ?? 0,
        failureCount: data?.summary?.failure_count ?? 0,
        successRate: data?.summary?.success_rate ?? 0,
        averageProgress: data?.summary?.average_progress ?? 0,
      },
      groups: (data?.groups ?? []).map(toGoalHistoryGroupSummary),
    };
  },

  getGoalHistoryGroupPage: async (params: {
    period: GoalPeriod;
    type: GoalType;
    target: number;
    difficulty?: GoalDifficulty | null;
    customDays?: number | null;
    page?: number;
    pageSize?: number;
    startDayFrom?: string;
    endDayTo?: string;
    status?: 'all' | 'success' | 'failure';
  }): Promise<GoalHistoryPageResponse> => {
    const { data } = await api.get<ApiGoalHistoryPageResponse>(getUrl('/todo/history/group'), {
      period: params.period,
      type: params.type,
      target: params.target,
      difficulty: params.difficulty ?? undefined,
      custom_days: params.customDays ?? undefined,
      page: params.page ?? 1,
      page_size: params.pageSize ?? 5,
      start_day_from: params.startDayFrom || undefined,
      end_day_to: params.endDayTo || undefined,
      status: params.status && params.status !== 'all' ? params.status : undefined,
    });
    return {
      items: (data?.items ?? []).map(toGoalHistoryEntry),
      totalCount: data?.total_count ?? 0,
      page: data?.page ?? 1,
      pageSize: data?.page_size ?? 5,
      totalPages: data?.total_pages ?? 1,
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
