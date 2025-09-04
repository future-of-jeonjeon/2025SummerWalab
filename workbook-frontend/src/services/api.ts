import axios from 'axios';

// API 기본 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const OJ_API_BASE_URL = import.meta.env.VITE_OJ_API_BASE_URL || 'http://localhost:8001';

// Micro-service API 클라이언트
export const microServiceApi = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// OnlineJudge API 클라이언트
export const ojApi = axios.create({
  baseURL: `${OJ_API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 추가
microServiceApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

ojApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
const handleResponseError = (error: any) => {
  if (error.response?.status === 401) {
    // 토큰 만료 또는 인증 실패
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  }
  return Promise.reject(error);
};

microServiceApi.interceptors.response.use(
  (response) => response,
  handleResponseError
);

ojApi.interceptors.response.use(
  (response) => response,
  handleResponseError
);

// API 응답 타입
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

// 에러 응답 타입
export interface ApiError {
  detail: string;
  status: number;
}

// 페이지네이션 타입
export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

// 공통 API 함수들
export const apiUtils = {
  // GET 요청
  get: async <T>(url: string, params?: any): Promise<T> => {
    const response = await microServiceApi.get(url, { params });
    return response.data;
  },

  // POST 요청
  post: async <T>(url: string, data?: any): Promise<T> => {
    const response = await microServiceApi.post(url, data);
    return response.data;
  },

  // PUT 요청
  put: async <T>(url: string, data?: any): Promise<T> => {
    const response = await microServiceApi.put(url, data);
    return response.data;
  },

  // DELETE 요청
  delete: async <T>(url: string): Promise<T> => {
    const response = await microServiceApi.delete(url);
    return response.data;
  },

  // OJ API GET 요청
  getOJ: async <T>(url: string, params?: any): Promise<T> => {
    const response = await ojApi.get(url, { params });
    return response.data;
  },

  // OJ API POST 요청
  postOJ: async <T>(url: string, data?: any): Promise<T> => {
    const response = await ojApi.post(url, data);
    return response.data;
  },
};

export default apiUtils;
