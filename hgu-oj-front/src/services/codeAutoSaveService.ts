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

export interface SolvedCodeFile {
  id: number;
  fileName: string;
  language: string;
  code: string;
}

export interface CustomCodeFile {
  fileName: string;
  code: string;
}

export const codeAutoSaveService = {
  async createCustomFile(fileName: string, code = ''): Promise<void> {
    if (!MS_API_BASE) {
      throw new Error('API base URL is not configured.');
    }
    await apiClient.post(`${MS_API_BASE}/code/file`, {
      file_name: fileName,
      code,
    });
  },

  async saveCustomFile(fileName: string, code: string): Promise<void> {
    if (!MS_API_BASE) {
      throw new Error('API base URL is not configured.');
    }
    await apiClient.post(`${MS_API_BASE}/code/file/${encodeURIComponent(fileName)}`, {
      file_name: fileName,
      code,
    });
  },

  async deleteCustomFile(fileName: string): Promise<void> {
    if (!MS_API_BASE) {
      throw new Error('API base URL is not configured.');
    }
    await apiClient.delete(`${MS_API_BASE}/code/file/${encodeURIComponent(fileName)}`);
  },

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

  async fetchSolvedFiles(page = 1, size = 250): Promise<{ items: SolvedCodeFile[]; total: number; page: number; size: number; }> {
    if (!MS_API_BASE) {
      throw new Error('API base URL is not configured.');
    }

    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });

    const response = await apiClient.get<any>(`${MS_API_BASE}/code/files?${params.toString()}`);
    const payload = response.data ?? {};
    const rawItems = Array.isArray(payload.items) ? payload.items : [];
    const items = rawItems.map((item: any) => ({
      id: Number(item?.id ?? item?.problem_id ?? item?.problemId ?? 0),
      fileName: String(item?.file_name ?? item?.fileName ?? ''),
      language: String(item?.language ?? ''),
      code: typeof item?.code === 'string' ? item.code : '',
    })).filter((item: SolvedCodeFile) => item.id > 0 && item.fileName.length > 0);

    return {
      items,
      total: Number(payload.total ?? items.length),
      page: Number(payload.page ?? page),
      size: Number(payload.size ?? size),
    };
  },

  async fetchCustomFiles(): Promise<CustomCodeFile[]> {
    if (!MS_API_BASE) {
      throw new Error('API base URL is not configured.');
    }

    const response = await apiClient.get<any>(`${MS_API_BASE}/code/custom-files`);
    const payload = response.data;
    const rawItems = Array.isArray(payload) ? payload : [];
    return rawItems.map((item: any) => ({
      fileName: String(item?.file_name ?? item?.fileName ?? ''),
      code: typeof item?.code === 'string' ? item.code : '',
    })).filter((item: CustomCodeFile) => item.fileName.length > 0);
  },
};
