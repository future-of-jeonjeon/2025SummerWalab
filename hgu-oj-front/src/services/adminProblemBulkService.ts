import type { AxiosError } from 'axios';
import { apiClient } from './api';

type WrappedResponse<T> = {
  error: unknown;
  data: T;
};

const ADMIN_PROBLEM_API_BASE = '/admin';

const buildAdminProblemUrl = (path: string) => `${ADMIN_PROBLEM_API_BASE}${path}`;

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

const parseContentDispositionFilename = (value: string | null | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const asciiMatch = value.match(/filename="?([^\";]+)"?/i);
  if (asciiMatch && asciiMatch[1]) {
    return asciiMatch[1];
  }

  return undefined;
};

const serializeParams = (params: Record<string, unknown>): string => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value
        .map((entry) => (entry === undefined || entry === null ? undefined : String(entry)))
        .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        .forEach((entry) => search.append(key, entry));
      return;
    }

    search.append(key, String(value));
  });

  return search.toString();
};

export type ImportProblemsResult = {
  import_count: number;
};

export type ExportProblemsResult = {
  blob: Blob;
  filename?: string;
};

export const adminProblemBulkService = {
  importProblems: async (file: File): Promise<ImportProblemsResult> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post(buildAdminProblemUrl('/import_problem/'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return unwrapResponse<ImportProblemsResult>(response.data);
    } catch (error) {
      const message = extractErrorMessage(error, '문제 대량 등록에 실패했습니다.');
      throw new Error(message);
    }
  },

  exportProblems: async (problemIds: number[]): Promise<ExportProblemsResult> => {
    try {
      const response = await apiClient.get<Blob>(buildAdminProblemUrl('/export_problem/'), {
        params: { problem_id: problemIds },
        paramsSerializer: (params) => serializeParams(params),
        responseType: 'blob',
      });

      const blob = response.data;
      const contentType = response.headers['content-type'] as string | undefined;

      if (contentType && contentType.includes('application/json')) {
        const payloadText = await blob.text();
        if (payloadText) {
          try {
            const parsed = JSON.parse(payloadText);
            if (isWrappedResponse(parsed) && parsed.error) {
              const detail = parsed.data;
              const message = typeof detail === 'string' && detail.trim().length > 0
                ? detail
                : '문제 내보내기에 실패했습니다.';
              throw new Error(message);
            }
          } catch (error) {
            // If parsing fails, rethrow with raw content
            throw new Error(payloadText);
          }
        }
      }

      const filename = parseContentDispositionFilename(response.headers['content-disposition'] as string | undefined);
      return {
        blob,
        filename,
      };
    } catch (error) {
      const message = extractErrorMessage(error, '문제 내보내기에 실패했습니다.');
      throw new Error(message);
    }
  },
};
