import { api } from './api';
import { Workbook, WorkbookDetail, PaginatedResponse } from '../types';

export const workbookService = {
  // 문제집 목록 조회 (micro-service API 사용)
  getWorkbooks: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<Workbook[]> => {
    const response = await fetch('http://localhost:8000/api/workbook/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const workbooks = await response.json();
    return workbooks;
  },

  // 문제집 상세 조회 (micro-service 사용)
  getWorkbook: async (id: number): Promise<Workbook> => {
    const response = await fetch(`http://localhost:8000/api/workbook/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const workbook = await response.json();
    return workbook;
  },

  // 문제집의 문제 목록 조회 (micro-service 사용)
  getWorkbookProblems: async (id: number): Promise<{
    success: boolean;
    data: any[];
    workbook: Workbook;
  }> => {
    const response = await fetch(`http://localhost:8000/api/workbook/${id}/problems`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const problems = await response.json();
    
    // 문제집 정보도 함께 가져오기
    const workbook = await workbookService.getWorkbook(id);
    
    return {
      success: true,
      data: problems,
      workbook: workbook
    };
  },
};
