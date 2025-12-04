import { api, apiClient, MS_API_BASE } from './api';
import { Contest, ContestAnnouncement, ContestAccess, ContestRankEntry, PaginatedResponse, Problem } from '../types';
import { SubmissionListItem } from './submissionService';
import { mapProblem } from '../utils/problemMapper';

const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');
const MICRO_API_BASE = MS_API_BASE ? trimTrailingSlash(MS_API_BASE) : '';

type ContestProblemStat = {
  contest_id?: number;
  problem_id?: number;
  problemId?: number;
  display_id?: string | number;
  displayId?: string | number;
  submission_count?: number;
  submissionCount?: number;
  attempt_user_count?: number;
  attemptUserCount?: number;
  solved_user_count?: number;
  solvedUserCount?: number;
  accuracy?: number;
};



const fetchContestProblemCount = async (contestId: number): Promise<number | undefined> => {
  if (!MICRO_API_BASE) {
    return undefined;
  }
  try {
    const response = await apiClient.get<any>(`${MICRO_API_BASE}/problem/contest/${contestId}/count`);
    const data = response.data;
    const numeric = Number(
      data?.count ??
      data?.total ??
      data?.problem_count ??
      data?.problemCount ??
      data,
    );
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : undefined;
  } catch {
    return undefined;
  }
};

const fetchContestProblemStats = async (contestId: number, problemIds: number[]): Promise<Map<number, ContestProblemStat>> => {
  const result = new Map<number, ContestProblemStat>();
  if (!MICRO_API_BASE || contestId <= 0 || problemIds.length === 0) {
    return result;
  }
  try {
    const response = await apiClient.get<any>(`${MICRO_API_BASE}/submission/contest/${contestId}/problem-stats`, {
      params: { problem_ids: problemIds },
    });
    const payload = response.data;
    const statsArray: ContestProblemStat[] = Array.isArray(payload?.stats)
      ? payload.stats
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];
    statsArray.forEach((item) => {
      const keys = [
        item.problem_id,
        item.problemId,
        item.display_id,
        item.displayId,
      ];
      keys.forEach((k) => {
        const num = Number(k);
        if (Number.isFinite(num)) {
          result.set(num, item);
        }
      });
    });
  } catch (error) {
    console.error('Failed to fetch contest problem stats', error);
  }
  return result;
};



const mapContest = (raw: any): Contest => ({
  id: raw.id,
  title: raw.title,
  description: raw.description,
  startTime: raw.start_time ?? raw.startTime,
  endTime: raw.end_time ?? raw.endTime,
  createTime: raw.create_time ?? raw.createTime,
  ruleType: raw.rule_type ?? raw.ruleType,
  visible: raw.visible,
  createdBy: raw.created_by
    ? {
      id: raw.created_by.id,
      username: raw.created_by.username,
      realName: raw.created_by.real_name ?? raw.created_by.realName,
    }
    : raw.createdBy ?? {
      id: 0,
      username: '알 수 없음',
    },
  status: raw.status ?? raw.contest_status,
  contestType: raw.contest_type ?? raw.contestType,
  realTimeRank: raw.real_time_rank ?? raw.realTimeRank,
  now: raw.now,
  requiresApproval: raw.requires_approval ?? raw.requiresApproval,
  problemCount: (() => {
    const candidates = [
      raw.problem_count,
      raw.problemCount,
      raw.problem_number,
      raw.problemNumber,
      raw.total_problem,
      raw.totalProblem,
    ];
    for (const candidate of candidates) {
      const numeric = Number(candidate);
      if (Number.isFinite(numeric) && numeric >= 0) {
        return numeric;
      }
    }
    if (Array.isArray(raw.problems)) {
      return raw.problems.length;
    }
    return undefined;
  })(),
});

export const contestService = {
  // 대회 목록 조회
  getContests: async (params?: {
    page?: number;
    limit?: number;
    keyword?: string;
    ruleType?: string;
    status?: string;
  }): Promise<PaginatedResponse<Contest>> => {
    const response = await api.get<{ results: any[], total: number }>('/contests/', params);
    return {
      data: response.data.results.map(mapContest),
      total: response.data.total,
      page: params?.page || 1,
      limit: params?.limit || 20,
      totalPages: Math.ceil(response.data.total / (params?.limit || 20))
    };
  },

  // 대회 상세 조회
  getContest: async (id: number): Promise<Contest> => {
    const response = await api.get<any>('/contest/', { id });
    const contest = mapContest(response.data);
    if (contest.problemCount == null) {
      const microCount = await fetchContestProblemCount(id);
      if (microCount !== undefined) {
        contest.problemCount = microCount;
      }
    }
    return contest;
  },

  getContestAnnouncements: async (contestId: number): Promise<ContestAnnouncement[]> => {
    const response = await api.get<any[]>('/contest/announcement', { contest_id: contestId });
    if (!response.success) {
      throw new Error(response.message || '공지사항을 불러오지 못했습니다.');
    }

    return (response.data || []).map((raw) => ({
      id: raw.id,
      contestId: typeof raw.contest === 'object' && raw.contest !== null ? raw.contest.id : raw.contest,
      title: raw.title,
      content: raw.content,
      visible: raw.visible,
      createdAt: raw.create_time ?? raw.created_at ?? raw.createdAt,
      createdBy: raw.created_by
        ? {
          id: raw.created_by.id,
          username: raw.created_by.username,
          realName: raw.created_by.real_name ?? raw.created_by.realName,
        }
        : raw.createdBy,
    }));
  },

  createContestAnnouncement: async (payload: { contestId: number; title: string; content: string; visible: boolean }): Promise<ContestAnnouncement> => {
    const response = await api.post<ContestAnnouncement>('/admin/contest/announcement', {
      contest_id: payload.contestId,
      title: payload.title,
      content: payload.content,
      visible: payload.visible,
    });
    if (!response.success) {
      throw new Error(response.message || '공지사항을 추가하지 못했습니다.');
    }
    return response.data;
  },

  updateContestAnnouncement: async (payload: { id: number; title?: string; content?: string; visible?: boolean }): Promise<ContestAnnouncement> => {
    const response = await api.put<ContestAnnouncement>('/admin/contest/announcement', {
      id: payload.id,
      title: payload.title,
      content: payload.content,
      visible: payload.visible,
    });
    if (!response.success) {
      throw new Error(response.message || '공지사항을 수정하지 못했습니다.');
    }
    return response.data;
  },

  deleteContestAnnouncement: async (id: number): Promise<void> => {
    const response = await api.delete(`/admin/contest/announcement?id=${id}`);
    if (!response.success) {
      throw new Error(response.message || '공지사항을 삭제하지 못했습니다.');
    }
  },

  getContestProblems: async (contestId: number): Promise<Problem[]> => {
    const response = await api.get<any[]>('/contest/problem', { contest_id: contestId });
    if (!response.success) {
      throw new Error(response.message || '문제 목록을 불러오지 못했습니다.');
    }

    const problems = (response.data || []).map(mapProblem);
    const problemIds = problems
      .map((item) => {
        const candidates = [item.id, (item as any)._id, item.displayId];
        for (const candidate of candidates) {
          const num = Number(candidate);
          if (Number.isFinite(num)) return num;
        }
        return null;
      })
      .filter((value): value is number => Number.isFinite(value));

    const statMap = await fetchContestProblemStats(contestId, problemIds);

    return problems.map((problem) => {
      const statKeyCandidates = [
        problem.id,
        Number((problem as any)._id),
        Number(problem.displayId),
      ].filter((v) => Number.isFinite(v)) as number[];
      const stat =
        statKeyCandidates
          .map((key) => statMap.get(key))
          .find((entry) => entry !== undefined);
      if (!stat) {
        return problem;
      }
      const submissionCountRaw =
        stat.submission_count ??
        stat.submissionCount ??
        problem.submissionNumber ??
        0;
      const solvedUsersRaw =
        stat.solved_user_count ??
        stat.solvedUserCount ??
        problem.acceptedNumber ??
        0;
      const attemptUsersRaw =
        stat.attempt_user_count ??
        stat.attemptUserCount ??
        0;

      const submissionCount = Number.isFinite(Number(submissionCountRaw)) ? Number(submissionCountRaw) : 0;
      const solvedUsers = Number.isFinite(Number(solvedUsersRaw)) ? Number(solvedUsersRaw) : 0;
      const attemptUsers = Number.isFinite(Number(attemptUsersRaw)) ? Number(attemptUsersRaw) : 0;

      const accuracyFromPayload = Number(stat.accuracy);
      const accuracy = Number.isFinite(accuracyFromPayload)
        ? accuracyFromPayload
        : (attemptUsers > 0 ? solvedUsers / attemptUsers : 0);

      return {
        ...problem,
        submissionNumber: submissionCount,
        acceptedNumber: solvedUsers,
        contestSubmissionNumber: submissionCount,
        contestAttemptUserNumber: attemptUsers,
        contestSolvedUserNumber: solvedUsers,
        contestAccuracy: accuracy,
      };
    });
  },

  verifyContestPassword: async (contestId: number, password: string): Promise<boolean> => {
    const response = await api.post<boolean>('/contest/password', {
      contest_id: contestId,
      password,
    });

    if (!response.success) {
      throw new Error(response.message || '비밀번호가 올바르지 않습니다.');
    }

    return true;
  },

  checkContestAccess: async (contestId: number): Promise<ContestAccess> => {
    const response = await api.get<ContestAccess>('/contest/access', { contest_id: contestId });
    if (!response.success) {
      throw new Error(response.message || '접근 권한을 확인하지 못했습니다.');
    }

    return response.data;
  },
  getContestRank: async (
    contestId: number,
    params?: { limit?: number; offset?: number; isAdmin?: boolean },
  ): Promise<{ results: ContestRankEntry[]; total: number }> => {
    if (!MICRO_API_BASE) {
      throw new Error('Microservice API base URL is not configured.');
    }

    const endpoint = params?.isAdmin ? '/contest/rank/all' : '/contest/rank';
    const response = await apiClient.get<ContestRankEntry[]>(`${MICRO_API_BASE}${endpoint}`, {
      params: { contest_id: contestId },
    });

    const data = response.data || [];

    // The MS returns a list, so we map it directly. 
    // Note: The MS currently returns the full list, pagination might be handled on the client side or added to MS later.
    // For now, we return the full list as 'results' and length as 'total'.

    const entries = data.map((raw: any) => ({
      id: raw.user.id, // Using user ID as the entry ID for now, or generate one if needed
      user: {
        id: raw.user.id,
        username: raw.user.username,
        realName: raw.user.real_name ?? raw.user.realName,
      },
      acceptedNumber: raw.accepted_number ?? raw.acceptedNumber,
      submissionNumber: raw.submission_number ?? raw.submissionNumber, // MS DTO doesn't have submission_number yet, might need to add it or default to 0
      totalTime: raw.total_time ?? raw.totalTime,
      totalScore: raw.total_score ?? raw.totalScore,
      submissionInfo: raw.submission_info ?? raw.submissionInfo,
    })) as ContestRankEntry[];

    return {
      results: entries,
      total: entries.length,
    };
  },

  getContestSubmissions: async (
    contestId: number,
    params?: { limit?: number; offset?: number; userId?: number; username?: string; problemId?: number | string },
  ): Promise<{ data: SubmissionListItem[]; total: number }> => {
    const limit = params?.limit && params.limit > 0 ? params.limit : 500;
    const offset = params?.offset && params.offset >= 0 ? params.offset : 0;
    const query: Record<string, unknown> = {
      contest_id: contestId,
      limit,
      offset,
    };
    if (params?.userId != null) {
      query.user_id = params.userId;
    }
    if (params?.username) {
      query.username = params.username;
    }
    if (params?.problemId != null) {
      query.problem_id = params.problemId;
    }

    const response = await api.get<any>('/contest_submissions', query);
    if (!response.success) {
      throw new Error(response.message || '제출 기록을 불러오지 못했습니다.');
    }

    const payload = response.data;
    let items: SubmissionListItem[] = [];
    let total = 0;
    if (Array.isArray(payload)) {
      items = payload as SubmissionListItem[];
      total = payload.length;
    } else if (payload && Array.isArray(payload.results)) {
      items = payload.results as SubmissionListItem[];
      total = Number(payload.total ?? payload.count ?? items.length);
    } else if (payload && Array.isArray(payload.data)) {
      items = payload.data as SubmissionListItem[];
      total = Number(payload.total ?? payload.count ?? items.length);
    }

    return {
      data: items,
      total,
    };
  },

};
