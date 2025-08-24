import axios from 'axios';

// 타입 정의
interface Workbook {
  id: number;
  title: string;
  description?: string;
  category?: string;
  is_public: boolean;
  created_by_id: number;
  created_at: string;
  updated_at: string;
}

interface WorkbookCreate {
  title: string;
  description?: string;
  category?: string;
  is_public?: boolean;
}

interface WorkbookUpdate {
  title?: string;
  description?: string;
  category?: string;
  is_public?: boolean;
}

interface WorkbookProblem {
  id: number;
  workbook_id: number;
  problem_id: number;
  order: number;
  added_time: string;
}

interface WorkbookProblemCreate {
  problem_id: number;
  order: number;
}

interface Problem {
  id: number;
  title: string;
  description: string;
}

interface WorkbookProblemUpdate {
  problems: number[]; // 문제 ID 배열
}

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const workbookApi = {
  // 문제집 목록 조회
  getWorkbooks: async (): Promise<Workbook[]> => {
    const response = await api.get('/api/workbook/');
    return response.data;
  },

  // 특정 문제집 조회
  getWorkbook: async (id: number): Promise<Workbook> => {
    const response = await api.get(`/api/workbook/${id}`);
    return response.data;
  },

  // 문제집 생성
  createWorkbook: async (workbook: WorkbookCreate): Promise<Workbook> => {
    const response = await api.post('/api/workbook/', workbook);
    return response.data;
  },

  // 문제집 수정
  updateWorkbook: async (id: number, workbook: WorkbookUpdate): Promise<Workbook> => {
    const response = await api.put(`/api/workbook/${id}`, workbook);
    return response.data;
  },

  // 문제집 삭제
  deleteWorkbook: async (id: number): Promise<void> => {
    await api.delete(`/api/workbook/${id}`);
  },

  // 문제집에 포함된 문제들 조회
  getWorkbookProblems: async (workbookId: number): Promise<WorkbookProblem[]> => {
    const response = await api.get(`/api/workbook/${workbookId}/problems`);
    return response.data;
  },

  // 문제집에 문제 추가
  addProblemToWorkbook: async (workbookId: number, problem: WorkbookProblemCreate): Promise<WorkbookProblem> => {
    const response = await api.post(`/api/workbook/${workbookId}/problems`, problem);
    return response.data;
  },

  // 문제집에서 문제 제거
  removeProblemFromWorkbook: async (workbookId: number, problemId: number): Promise<void> => {
    await api.delete(`/api/workbook/${workbookId}/problems/${problemId}`);
  },

  // 모든 문제 목록 조회
  getAllProblems: async (): Promise<Problem[]> => {
    const response = await api.get('/api/problem/');
    return response.data;
  },

  // 문제집 문제 일괄 업데이트
  updateWorkbookProblems: async (workbookId: number, problems: number[]): Promise<void> => {
    await api.put(`/api/workbook/${workbookId}/problems`, { problems });
  },
};

// 타입들을 export
export type { Workbook, WorkbookCreate, WorkbookUpdate, WorkbookProblem, WorkbookProblemCreate, Problem, WorkbookProblemUpdate };
