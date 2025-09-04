import { apiUtils } from './api';

export interface Problem {
  id: number;
  title: string;
  description: string;
  inputDescription: string;
  outputDescription: string;
  sampleInput: string;
  sampleOutput: string;
  timeLimit: number;
  memoryLimit: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  submissionCount?: number;
  acceptedCount?: number;
}

export interface ProblemCreate {
  title: string;
  description: string;
  inputDescription: string;
  outputDescription: string;
  sampleInput: string;
  sampleOutput: string;
  timeLimit: number;
  memoryLimit: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  isPublic: boolean;
}

export interface ProblemUpdate {
  title?: string;
  description?: string;
  inputDescription?: string;
  outputDescription?: string;
  sampleInput?: string;
  sampleOutput?: string;
  timeLimit?: number;
  memoryLimit?: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  tags?: string[];
  isPublic?: boolean;
}

export interface ProblemTag {
  id: number;
  name: string;
  color: string;
}

export interface Submission {
  id: number;
  problemId: number;
  userId: number;
  language: string;
  code: string;
  status: 'Pending' | 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Memory Limit Exceeded' | 'Runtime Error' | 'Compile Error';
  timeUsed: number;
  memoryUsed: number;
  createdAt: string;
}

export interface SubmissionCreate {
  problemId: number;
  language: string;
  code: string;
}

export const problemApi = {
  // 문제 목록 조회
  getProblems: async (params?: {
    page?: number;
    limit?: number;
    difficulty?: string;
    tags?: string[];
    search?: string;
  }): Promise<{ results: Problem[]; count: number }> => {
    return await apiUtils.getOJ<{ results: Problem[]; count: number }>('/problem', params);
  },

  // 문제 상세 조회
  getProblem: async (id: number): Promise<Problem> => {
    return await apiUtils.getOJ<Problem>(`/problem?id=${id}`);
  },

  // 문제 생성 (관리자)
  createProblem: async (data: ProblemCreate): Promise<Problem> => {
    return await apiUtils.postOJ<Problem>('/admin/problem', data);
  },

  // 문제 수정 (관리자)
  updateProblem: async (id: number, data: ProblemUpdate): Promise<Problem> => {
    return await apiUtils.postOJ<Problem>(`/admin/problem?id=${id}`, data);
  },

  // 문제 삭제 (관리자)
  deleteProblem: async (id: number): Promise<void> => {
    await apiUtils.postOJ(`/admin/problem?id=${id}`, { _method: 'DELETE' });
  },

  // 문제 태그 목록 조회
  getProblemTags: async (): Promise<ProblemTag[]> => {
    return await apiUtils.getOJ<ProblemTag[]>('/problem/tags');
  },

  // 문제 제출
  submitSolution: async (data: SubmissionCreate): Promise<Submission> => {
    return await apiUtils.postOJ<Submission>('/submission', data);
  },

  // 제출 내역 조회
  getSubmissions: async (params?: {
    problemId?: number;
    userId?: number;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ results: Submission[]; count: number }> => {
    return await apiUtils.getOJ<{ results: Submission[]; count: number }>('/submissions', params);
  },

  // 제출 상세 조회
  getSubmission: async (id: number): Promise<Submission> => {
    return await apiUtils.getOJ<Submission>(`/submission?id=${id}`);
  },

  // 랜덤 문제 추천
  getRandomProblem: async (): Promise<Problem> => {
    return await apiUtils.getOJ<Problem>('/pickone');
  },
};
