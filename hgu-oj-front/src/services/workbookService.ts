import { api } from './api';
import { Workbook, WorkbookDetail, PaginatedResponse } from '../types';

export const workbookService = {
  // 문제집 목록 조회
  getWorkbooks: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<Workbook>> => {
    const response = await api.get<PaginatedResponse<Workbook>>('/workbooks/', params);
    return response.data;
  },

  // 문제집 상세 조회
  getWorkbook: async (id: number): Promise<WorkbookDetail> => {
    const response = await api.get<WorkbookDetail>(`/workbooks/${id}/`);
    return response.data;
  },

  // 문제집의 문제 목록 조회
  getWorkbookProblems: async (id: number): Promise<{
    success: boolean;
    data: any[];
    workbook: Workbook;
  }> => {
    const response = await api.get<{
      success: boolean;
      data: any[];
      workbook: Workbook;
    }>(`/workbooks/${id}/problems/`);
    return response.data;
  },
};
