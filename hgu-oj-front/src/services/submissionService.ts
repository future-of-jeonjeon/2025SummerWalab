import axios from 'axios';
import { api, MS_API_BASE } from './api';

export interface SubmitSolutionRequest {
  problemId: string | number;
  code: string;
  language: string;
  contestId?: number;
  share?: boolean;
}

export interface SubmitSolutionResponse {
  submissionId?: number | string;
  id?: number | string;
  status?: string;
  [key: string]: unknown;
}

export interface SubmissionDetail {
  id?: number | string;
  result?: number | string;
  status?: string;
  statistic_info?: Record<string, unknown> | null;
  problem?: number | string;
  problem_id?: number | string;
  problemId?: number | string;
  language?: string;
  language_name?: string;
  code?: string;
  user?: {
    id?: number;
    username?: string;
  };
  user_id?: number;
  userId?: number;
  username?: string;
  [key: string]: unknown;
}

export interface SubmissionListItem extends SubmissionDetail {
  create_time?: string;
  createTime?: string;
  execution_time?: number;
  executionTime?: number;
  memory?: number;
  memoryUsage?: number;
  submissionId?: number | string;
}

export interface SubmissionListResponse {
  items: SubmissionListItem[];
  total: number;
}

// Map editor language value to judge language identifier
const languageMap: Record<string, string> = {
  javascript: 'JavaScript',
  python: 'Python3',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
};

const extractSubmissionId = (payload: any): number | string | undefined => {
  if (!payload) return undefined;
  if (typeof payload === 'number') return payload;
  if (typeof payload === 'string') {
    const parsed = Number(payload);
    return Number.isFinite(parsed) ? parsed : payload;
  }
  if (typeof payload === 'object') {
    const candidates = [
      (payload as any).submission_id,
      (payload as any).submissionId,
      (payload as any).id,
      (payload as any).data,
    ];
    for (const candidate of candidates) {
      if (candidate == null) continue;
      if (typeof candidate === 'number') return candidate;
      if (typeof candidate === 'string') {
        const parsed = Number(candidate);
        return Number.isFinite(parsed) ? parsed : candidate;
      }
      if (typeof candidate === 'object') {
        const nested = extractSubmissionId(candidate);
        if (nested !== undefined) return nested;
      }
    }
  }
  return undefined;
};

const normalizeSubmissionList = (payload: any): SubmissionListResponse => {
  let items: SubmissionListItem[] = [];
  let total = 0;

  if (Array.isArray(payload)) {
    items = payload as SubmissionListItem[];
    total = payload.length;
  } else if (payload && Array.isArray(payload.results)) {
    items = payload.results as SubmissionListItem[];
    total = Number(payload.total ?? payload.count ?? payload.results.length);
  } else if (payload && Array.isArray(payload.data)) {
    items = payload.data as SubmissionListItem[];
    total = Number(payload.total ?? payload.count ?? payload.data.length);
  }

  return {
    items,
    total,
  };
};

const requestSubmissionList = async (path: string, params: Record<string, unknown>) => {
  const response = await api.get<any>(path, params);
  if (!response.success) {
    const message = response.message || '제출 목록을 불러오지 못했습니다.';
    throw new Error(message);
  }
  return normalizeSubmissionList(response.data);
};

export const submissionService = {
  submitSolution: async ({ problemId, code, language, contestId, share }: SubmitSolutionRequest): Promise<SubmitSolutionResponse> => {
    const judgeLanguage = languageMap[language] || language;

    const payload: Record<string, unknown> = {
      problem_id: String(problemId),
      language: judgeLanguage,
      code,
    };

    if (contestId != null) {
      payload.contest_id = contestId;
    }

    if (typeof share === 'boolean') {
      payload.share = share;
    }

    const response = await api.post<any>('/submission', payload);

    if (!response.success) {
      const message = response.message || '제출 요청에 실패했습니다.';
      throw new Error(message);
    }

    const data = response.data as SubmitSolutionResponse;
    const submissionId = extractSubmissionId(data);
    return {
      ...data,
      submissionId,
    };
  },
  getSubmission: async (submissionId: number | string): Promise<SubmissionDetail> => {
    const response = await api.get<SubmissionDetail>('/submission', { id: submissionId });
    if (!response.success) {
      const message = response.message || '제출 결과를 불러오지 못했습니다.';
      throw new Error(message);
    }
    return response.data;
  },
  getMySubmissions: async (
    problemId: number | string,
    options?: { limit?: number; offset?: number; page?: number; contestId?: number | string },
  ): Promise<SubmissionListResponse> => {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;
    const page = options?.page ?? Math.floor(offset / Math.max(limit, 1)) + 1;

    const params: Record<string, unknown> = {
      problem_id: String(problemId),
      limit,
      offset,
      page,
      myself: '1',
    };

    const basePath = options?.contestId != null ? '/contest_submissions' : '/submissions';
    if (options?.contestId != null) {
      params.contest_id = String(options.contestId);
    }

    return requestSubmissionList(basePath, params);
  },
  getRecentSubmissions: async (options?: { limit?: number }): Promise<SubmissionListResponse> => {
    const limit = Math.max(1, Math.min(options?.limit ?? 5, 50));
    const params: Record<string, unknown> = {
      limit,
      page: 1,
    };
    return requestSubmissionList('/submissions', params);
  },
  getContributionData: async (): Promise<{ date: string; count: number }[]> => {
    const baseUrl = MS_API_BASE.endsWith('/') ? MS_API_BASE.slice(0, -1) : MS_API_BASE;
    const response = await axios.get<{ date: string; count: number }[]>(`${baseUrl}/submission/contribution`, {
      withCredentials: true
    });
    // MS server might return data directly or wrapped. 
    // Assuming it returns the list directly based on previous instructions.
    return response.data;
  },
};

export default submissionService;
