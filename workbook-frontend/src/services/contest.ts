import { apiUtils } from './api';

export interface Contest {
  id: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  ruleType: 'ACM' | 'OI';
  password?: string;
  isPublic: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  problemCount?: number;
  participantCount?: number;
}

export interface ContestCreate {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  ruleType: 'ACM' | 'OI';
  password?: string;
  isPublic: boolean;
}

export interface ContestUpdate {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  ruleType?: 'ACM' | 'OI';
  password?: string;
  isPublic?: boolean;
}

export interface ContestProblem {
  id: number;
  contestId: number;
  problemId: number;
  order: number;
  problem: {
    id: number;
    title: string;
    difficulty: string;
    tags: string[];
  };
}

export interface ContestRanking {
  rank: number;
  userId: number;
  username: string;
  totalScore: number;
  totalTime: number;
  problems: {
    problemId: number;
    score: number;
    time: number;
    status: string;
  }[];
}

export interface ContestAnnouncement {
  id: number;
  contestId: number;
  title: string;
  content: string;
  createdAt: string;
  createdBy: number;
}

export const contestApi = {
  // 컨테스트 목록 조회
  getContests: async (params?: {
    page?: number;
    limit?: number;
    status?: 'upcoming' | 'ongoing' | 'finished';
  }): Promise<{ results: Contest[]; count: number }> => {
    return await apiUtils.getOJ<{ results: Contest[]; count: number }>('/contests', params);
  },

  // 컨테스트 상세 조회
  getContest: async (id: number): Promise<Contest> => {
    return await apiUtils.getOJ<Contest>(`/contest?id=${id}`);
  },

  // 컨테스트 생성 (관리자)
  createContest: async (data: ContestCreate): Promise<Contest> => {
    return await apiUtils.postOJ<Contest>('/admin/contest', data);
  },

  // 컨테스트 수정 (관리자)
  updateContest: async (id: number, data: ContestUpdate): Promise<Contest> => {
    return await apiUtils.postOJ<Contest>(`/admin/contest?id=${id}`, data);
  },

  // 컨테스트 삭제 (관리자)
  deleteContest: async (id: number): Promise<void> => {
    await apiUtils.postOJ(`/admin/contest?id=${id}`, { _method: 'DELETE' });
  },

  // 컨테스트 참가
  joinContest: async (id: number, password?: string): Promise<void> => {
    await apiUtils.postOJ(`/contest/access`, { contest_id: id, password });
  },

  // 컨테스트 비밀번호 확인
  verifyContestPassword: async (id: number, password: string): Promise<boolean> => {
    const response = await apiUtils.postOJ<{ success: boolean }>('/contest/password', {
      contest_id: id,
      password,
    });
    return response.success;
  },

  // 컨테스트 문제 목록 조회
  getContestProblems: async (contestId: number): Promise<ContestProblem[]> => {
    return await apiUtils.getOJ<ContestProblem[]>(`/contest/problem?contest_id=${contestId}`);
  },

  // 컨테스트에 문제 추가 (관리자)
  addProblemToContest: async (
    contestId: number,
    problemId: number,
    order: number
  ): Promise<ContestProblem> => {
    return await apiUtils.postOJ<ContestProblem>('/admin/contest/problem', {
      contest_id: contestId,
      problem_id: problemId,
      order,
    });
  },

  // 컨테스트에서 문제 제거 (관리자)
  removeProblemFromContest: async (
    contestId: number,
    problemId: number
  ): Promise<void> => {
    await apiUtils.postOJ(`/admin/contest/problem`, {
      contest_id: contestId,
      problem_id: problemId,
      _method: 'DELETE',
    });
  },

  // 컨테스트 랭킹 조회
  getContestRanking: async (contestId: number): Promise<ContestRanking[]> => {
    return await apiUtils.getOJ<ContestRanking[]>(`/contest_rank?contest_id=${contestId}`);
  },

  // 컨테스트 공지사항 목록 조회
  getContestAnnouncements: async (contestId: number): Promise<ContestAnnouncement[]> => {
    return await apiUtils.getOJ<ContestAnnouncement[]>(`/contest/announcement?contest_id=${contestId}`);
  },

  // 컨테스트 공지사항 생성 (관리자)
  createContestAnnouncement: async (
    contestId: number,
    data: { title: string; content: string }
  ): Promise<ContestAnnouncement> => {
    return await apiUtils.postOJ<ContestAnnouncement>('/admin/contest/announcement', {
      contest_id: contestId,
      ...data,
    });
  },
};
