import { apiUtils } from './api';

export interface Workbook {
  id: number;
  title: string;
  description: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  problemCount?: number;
}

export interface WorkbookCreate {
  title: string;
  description: string;
  isPublic: boolean;
}

export interface WorkbookUpdate {
  title?: string;
  description?: string;
  isPublic?: boolean;
}

export interface WorkbookProblem {
  id: number;
  workbookId: number;
  problemId: number;
  order: number;
  problem: {
    id: number;
    title: string;
    difficulty: string;
    tags: string[];
  };
}

export interface WorkbookProblemCreate {
  problemId: number;
  order: number;
}

export const workbookApi = {
  // 문제집 목록 조회 (사용자)
  getUserWorkbooks: async (): Promise<Workbook[]> => {
    return await apiUtils.get<Workbook[]>('/workbooks');
  },

  // 공개 문제집 목록 조회
  getPublicWorkbooks: async (): Promise<Workbook[]> => {
    return await apiUtils.get<Workbook[]>('/workbooks/public');
  },

  // 문제집 상세 조회
  getWorkbook: async (id: number): Promise<Workbook> => {
    return await apiUtils.get<Workbook>(`/workbooks/${id}`);
  },

  // 문제집 생성
  createWorkbook: async (data: WorkbookCreate): Promise<Workbook> => {
    return await apiUtils.post<Workbook>('/workbooks', data);
  },

  // 문제집 수정
  updateWorkbook: async (id: number, data: WorkbookUpdate): Promise<Workbook> => {
    return await apiUtils.put<Workbook>(`/workbooks/${id}`, data);
  },

  // 문제집 삭제
  deleteWorkbook: async (id: number): Promise<void> => {
    await apiUtils.delete(`/workbooks/${id}`);
  },

  // 문제집에 포함된 문제들 조회
  getWorkbookProblems: async (workbookId: number): Promise<WorkbookProblem[]> => {
    return await apiUtils.get<WorkbookProblem[]>(`/workbooks/${workbookId}/problems`);
  },

  // 문제집에 문제 추가
  addProblemToWorkbook: async (
    workbookId: number,
    data: WorkbookProblemCreate
  ): Promise<WorkbookProblem> => {
    return await apiUtils.post<WorkbookProblem>(
      `/workbooks/${workbookId}/problems`,
      data
    );
  },

  // 문제집에서 문제 제거
  removeProblemFromWorkbook: async (
    workbookId: number,
    problemId: number
  ): Promise<void> => {
    await apiUtils.delete(`/workbooks/${workbookId}/problems/${problemId}`);
  },

  // 문제집 문제 순서 업데이트
  updateWorkbookProblems: async (
    workbookId: number,
    problems: WorkbookProblemCreate[]
  ): Promise<void> => {
    await apiUtils.put(`/workbooks/${workbookId}/problems`, { problems });
  },
};
