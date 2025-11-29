import { apiClient, MS_API_BASE } from './api';

export interface AutoSavePayload {
  problemId: number;
  language: string;
  code: string;
}

export interface FetchCodeParams {
  problemId: number;
  language: string;
}

export const codeAutoSaveService = {
  async save({ problemId, language, code }: AutoSavePayload): Promise<void> {
    if (!MS_API_BASE) {
      throw new Error('API base URL is not configured.');
    }

    await apiClient.post(`${MS_API_BASE}/code/${problemId}`, {
      problem_id: problemId,
      language,
      code,
    });
  },

  async fetch({ problemId, language }: FetchCodeParams): Promise<string> {
    if (!MS_API_BASE) {
      throw new Error('API base URL is not configured.');
    }

    const params = new URLSearchParams({
      problem_id: String(problemId),
      language,
    });

    try {
      const response = await apiClient.get<any>(`${MS_API_BASE}/code/${problemId}?${params.toString()}`);
      const payload = response.data;
      if (typeof payload === 'string') {
        return payload;
      }
      if (payload && typeof payload === 'object' && typeof payload.code === 'string') {
        return payload.code;
      }
      return '';
    } catch (error) {
      return '';
    }
  },
};
