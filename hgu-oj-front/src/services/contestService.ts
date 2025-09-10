import { api } from './api';
import { Contest, PaginatedResponse } from '../types';

export const contestService = {
  // 대회 목록 조회
  getContests: async (params?: {
    page?: number;
    limit?: number;
    keyword?: string;
    ruleType?: string;
    status?: string;
  }): Promise<PaginatedResponse<Contest>> => {
    const response = await api.get<{results: Contest[], total: number}>('/contests/', params);
    return {
      data: response.data.results,
      total: response.data.total,
      page: params?.page || 1,
      limit: params?.limit || 20,
      totalPages: Math.ceil(response.data.total / (params?.limit || 20))
    };
  },

  // 대회 상세 조회
  getContest: async (id: number): Promise<Contest> => {
    const response = await api.get<Contest>('/contest/', { id });
    return response.data;
  },
};
