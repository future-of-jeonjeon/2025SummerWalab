import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '../types';

// API 기본 설정
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const MS_API_BASE = (import.meta.env.VITE_MS_API_BASE as string | undefined) || 'http://localhost:9000/api';

// Axios 인스턴스 생성
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 쿠키 자동 포함
});

const getCsrfToken = () => {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
};

// 요청 인터셉터 (쿠키 자동 포함)
apiClient.interceptors.request.use(
  (config) => {
    // 쿠키는 자동으로 포함되므로 별도 설정 불필요
    const csrf = getCsrfToken();
    if (csrf) {
      config.headers = config.headers || {};
      if (!config.headers['X-CSRFToken']) {
        config.headers['X-CSRFToken'] = csrf;
      }
      if (!config.headers['X-CSRF-Token']) {
        config.headers['X-CSRF-Token'] = csrf;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (에러 처리)
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // OAuth 콜백 페이지에서는 401 에러를 직접 처리하도록 리다이렉트 방지
      if (window.location.pathname.startsWith('/oauth/callback')) {
        return Promise.reject(error);
      }

      // 토큰 만료 시 로그아웃 처리
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage'); // Zustand persist storage 제거
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API 메서드들 (백엔드 응답 형태 이중 지원)
// - 형태 A: { error: null, data: T }
// - 형태 B: T (plain payload)
const normalize = <T>(res: any) => {
  const body = res.data;
  const hasWrapper = body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'error');
  if (hasWrapper) {
    return {
      success: body.error === null,
      data: body.data as T,
      message: body.error ? String(body.data) : undefined,
    };
  }
  return {
    success: true,
    data: body as T,
  };
};
export const api = {
  // GET 요청
  get: <T>(url: string, params?: any): Promise<ApiResponse<T>> =>
    apiClient.get(url, { params }).then((res) => normalize<T>(res)),

  // POST 요청
  post: <T>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.post(url, data).then((res) => normalize<T>(res)),

  // PUT 요청
  put: <T>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.put(url, data).then((res) => normalize<T>(res)),

  // DELETE 요청
  delete: <T>(url: string): Promise<ApiResponse<T>> =>
    apiClient.delete(url).then((res) => normalize<T>(res)),

  // PATCH 요청
  patch: <T>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.patch(url, data).then((res) => normalize<T>(res)),
};

export { apiClient };
export default apiClient;
