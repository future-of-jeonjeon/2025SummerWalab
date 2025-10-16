import { apiClient } from './api';

interface UploadResponse {
  success?: boolean;
  msg?: string;
  file_path?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';
const stripApiSuffix = (input: string): string => input.replace(/\/api\/?$/, '');

const resolveApiOrigin = (): string => {
  if (!API_BASE_URL) {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.host}`;
    }
    return '';
  }
  try {
    const url = new URL(API_BASE_URL, typeof window !== 'undefined' ? window.location.origin : undefined);
    return stripApiSuffix(url.origin + (url.pathname === '/' ? '' : url.pathname));
  } catch {
    if (typeof window !== 'undefined' && API_BASE_URL.startsWith('/')) {
      return `${window.location.protocol}//${window.location.host}${stripApiSuffix(API_BASE_URL)}`;
    }
    return stripApiSuffix(API_BASE_URL);
  }
};

const API_FILE_ORIGIN = resolveApiOrigin();

export const uploadService = {
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post<UploadResponse>('/admin/upload_image/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const body = response.data as UploadResponse;
    if (!body?.success || !body.file_path) {
      throw new Error(body?.msg ?? '이미지 업로드 실패');
    }
    const rawPath = body.file_path.trim();
    if (!rawPath) {
      throw new Error('이미지 경로를 확인할 수 없습니다.');
    }

    if (/^https?:\/\//i.test(rawPath)) {
      return rawPath;
    }

    let normalizedPath = rawPath.replace(/\\/g, '/').trim();
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = `/${normalizedPath}`;
    }

    if (API_FILE_ORIGIN) {
      return `${API_FILE_ORIGIN}${normalizedPath}`;
    }

    return normalizedPath;
  },
};

export default uploadService;
