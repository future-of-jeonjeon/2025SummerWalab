import { api } from './api';
import { Problem, PaginatedResponse, ProblemFilter, ApiResponse } from '../types';

export const problemService = {
  // 문제 목록 조회
  getProblems: async (filter: ProblemFilter): Promise<PaginatedResponse<Problem>> => {
    const response = await api.get<{results: Problem[], total: number}>('/problem', filter);
    return {
      data: response.data.results,
      total: response.data.total,
      page: filter.page || 1,
      limit: filter.limit || 20,
      totalPages: Math.ceil(response.data.total / (filter.limit || 20))
    };
  },

  // 문제 상세 조회
  getProblem: async (id: number): Promise<Problem> => {
    const response = await api.get<Problem>(`/problem/${id}`);
    return response.data;
  },

  // 문제 생성 (관리자)
  createProblem: async (problem: Omit<Problem, 'id' | 'createdAt' | 'updatedAt'>): Promise<Problem> => {
    const response = await api.post<Problem>('/problem', problem);
    return response.data;
  },

  // 문제 수정 (관리자)
  updateProblem: async (id: number, problem: Partial<Problem>): Promise<Problem> => {
    const response = await api.put<Problem>(`/problem/${id}`, problem);
    return response.data;
  },

  // 문제 삭제 (관리자)
  deleteProblem: async (id: number): Promise<void> => {
    await api.delete(`/problem/${id}`);
  },

  // 문제 검색
  searchProblems: async (query: string, filter?: Omit<ProblemFilter, 'search'>): Promise<PaginatedResponse<Problem>> => {
    const response = await api.get<PaginatedResponse<Problem>>('/problem/search', {
      ...filter,
      search: query,
    });
    return response.data;
  },
};
