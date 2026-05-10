import type { AxiosError } from 'axios';
import { apiClient } from './api';

type WrappedResponse<T> = {
  error: unknown;
  data: T;
};

const isWrappedResponse = <T>(payload: unknown): payload is WrappedResponse<T> =>
  Boolean(
    payload &&
    typeof payload === 'object' &&
    Object.prototype.hasOwnProperty.call(payload, 'error') &&
    Object.prototype.hasOwnProperty.call(payload, 'data')
  );

const unwrapResponse = <T>(payload: unknown): T => {
  if (isWrappedResponse<T>(payload)) {
    if (payload.error !== undefined && payload.error !== null) {
      const detail = payload.data;
      const message = typeof detail === 'string' ? detail : '요청이 실패했습니다.';
      throw new Error(message);
    }
    return payload.data;
  }
  return payload as T;
};

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (!error) {
    return fallback;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  const maybeAxios = error as Partial<AxiosError> & { isAxiosError?: boolean };
  if (maybeAxios && typeof maybeAxios === 'object' && maybeAxios.isAxiosError) {
    const responseData = maybeAxios.response?.data;
    if (responseData) {
      if (typeof responseData === 'string' && responseData.trim().length > 0) {
        return responseData;
      }
      if (isWrappedResponse<any>(responseData) && responseData.error) {
        const detail = responseData.data;
        if (typeof detail === 'string' && detail.trim().length > 0) {
          return detail;
        }
      }
    }
  }

  return fallback;
};

const serializeParams = (params: Record<string, unknown>): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          search.append(key, String(item));
        }
      });
      return;
    }
    search.append(key, String(value));
  });
  return search.toString();
};


export type ImportProblemsResult = {
  polling_key: string;
};

export type ProblemImportPollingStatus = {
  status: string;
  processed_problem?: number;
  imported_problem?: number;
  left_problem: number;
  all_problem: number;
  message?: string;
  error_code?: string | number;
  error_message?: string;
  problem_id?: number | string;
};

export type ExportProblemsResult = {
  blob: Blob;
  filename?: string;
};

export const adminProblemBulkService = {
  importProblems: async (file: File): Promise<ImportProblemsResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const MS_API_BASE = ((import.meta.env.VITE_MS_API_BASE as string | undefined) || '').replace(/\/$/, '');

    if (!MS_API_BASE) {
      throw new Error('Microservice API base URL is not configured.');
    }

    try {
      const response = await apiClient.post(`${MS_API_BASE}/problem/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = response.data;
      if (data && typeof data.polling_key === 'string') {
        return { polling_key: data.polling_key };
      }

      const unwrapped = unwrapResponse<any>(data);
      if (unwrapped && typeof unwrapped.polling_key === 'string') {
        return { polling_key: unwrapped.polling_key };
      }

      throw new Error('Polling key not received from server.');

    } catch (error) {
      const message = extractErrorMessage(error, '문제 대량 등록 요청에 실패했습니다.');
      throw new Error(message);
    }
  },

  getImportPollingStatus: async (pollingKey: string): Promise<ProblemImportPollingStatus> => {
    const MS_API_BASE = ((import.meta.env.VITE_MS_API_BASE as string | undefined) || '').replace(/\/$/, '');
    if (!MS_API_BASE) {
      throw new Error('Microservice API base URL is not configured.');
    }

    try {
      const response = await apiClient.get(`${MS_API_BASE}/problem/polling`, {
        params: { key: pollingKey },
      });
      return response.data as ProblemImportPollingStatus;
    } catch (error) {
      const message = extractErrorMessage(error, '상태 조회에 실패했습니다.');
      throw new Error(message);
    }
  },

  exportProblems: async (problemIds: number[]): Promise<ExportProblemsResult> => {
    if (!Array.isArray(problemIds) || problemIds.length === 0) {
      throw new Error('내보낼 문제를 선택하세요.');
    }
    const MS_API_BASE = ((import.meta.env.VITE_MS_API_BASE as string | undefined) || '').replace(/\/$/, '');
    if (!MS_API_BASE) {
      throw new Error('Microservice API base URL is not configured.');
    }

    try {
      const response = await apiClient.get<Blob>(`${MS_API_BASE}/problem/export/zip`, {
        params: { problem_id: problemIds },
        paramsSerializer: (params) => serializeParams(params as Record<string, unknown>),
        responseType: 'blob',
      });
      const blob = response.data;
      return {
        blob,
        filename: problemIds.length > 1 ? 'problem-export.zip' : `problem-${problemIds[0]}.zip`,
      };
    } catch (error) {
      const message = extractErrorMessage(error, '문제 내보내기에 실패했습니다.');
      throw new Error(message);
    }
  },
};
