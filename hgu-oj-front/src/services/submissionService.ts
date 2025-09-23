import { api } from './api';

export interface SubmitSolutionRequest {
  problemId: number;
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
  [key: string]: unknown;
}

export interface SubmissionListItem extends SubmissionDetail {
  language?: string;
  create_time?: string;
  createTime?: string;
  execution_time?: number;
  executionTime?: number;
  memory?: number;
  memoryUsage?: number;
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

export const submissionService = {
  submitSolution: async ({ problemId, code, language, contestId, share }: SubmitSolutionRequest): Promise<SubmitSolutionResponse> => {
    const judgeLanguage = languageMap[language] || language;

    const payload: Record<string, unknown> = {
      problem_id: problemId,
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

    const response = await api.get<any>(basePath, params);
    if (!response.success) {
      const message = response.message || '제출 목록을 불러오지 못했습니다.';
      throw new Error(message);
    }

    const body = response.data;
    let items: SubmissionListItem[] = [];
    let total = 0;

    if (Array.isArray(body)) {
      items = body as SubmissionListItem[];
      total = body.length;
    } else if (body && Array.isArray(body.results)) {
      items = body.results as SubmissionListItem[];
      total = Number(body.total ?? body.count ?? body.results.length);
    } else if (body && Array.isArray(body.data)) {
      items = body.data as SubmissionListItem[];
      total = Number(body.total ?? body.count ?? body.data.length);
    }

    return {
      items,
      total,
    };
  },
};

export default submissionService;
