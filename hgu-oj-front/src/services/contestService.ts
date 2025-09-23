import { api } from './api';
import { Contest, ContestAnnouncement, ContestAccess, ContestRankEntry, PaginatedResponse, Problem } from '../types';
import { mapProblem } from '../utils/problemMapper';

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
    const response = await api.get<{results: any[], total: number}>('/contests/', params);
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
    return mapContest(response.data);
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

  getContestProblems: async (contestId: number): Promise<Problem[]> => {
    const response = await api.get<any[]>('/contest/problem', { contest_id: contestId });
    if (!response.success) {
      throw new Error(response.message || '문제 목록을 불러오지 못했습니다.');
    }

    return (response.data || []).map(mapProblem);
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
    params?: { limit?: number; offset?: number },
  ): Promise<{ results: ContestRankEntry[]; total: number }> => {
    const query = {
      contest_id: contestId,
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    };

    const response = await api.get<{ results: any[]; total: number }>('/contest_rank', query);
    if (!response.success) {
      throw new Error(response.message || '랭크 정보를 불러오지 못했습니다.');
    }

    const data = response.data ?? { results: [], total: 0 };
    const entries = (data.results || []).map((raw) => ({
      id: raw.id,
      user: raw.user
        ? {
            id: raw.user.id,
            username: raw.user.username,
            realName: raw.user.real_name ?? raw.user.realName,
          }
        : { id: 0, username: '알 수 없음' },
      acceptedNumber: raw.accepted_number ?? raw.acceptedNumber,
      submissionNumber: raw.submission_number ?? raw.submissionNumber,
      totalTime: raw.total_time ?? raw.totalTime,
      totalScore: raw.total_score ?? raw.totalScore,
      submissionInfo: raw.submission_info ?? raw.submissionInfo,
    })) as ContestRankEntry[];

    return {
      results: entries,
      total: data.total ?? entries.length,
    };
  },

};
