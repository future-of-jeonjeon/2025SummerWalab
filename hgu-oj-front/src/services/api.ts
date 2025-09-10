import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '../types';

// API 기본 설정
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Axios 인스턴스 생성
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 쿠키 자동 포함
});

// 요청 인터셉터 (쿠키 자동 포함)
apiClient.interceptors.request.use(
  (config) => {
    // 쿠키는 자동으로 포함되므로 별도 설정 불필요
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
      // 토큰 만료 시 로그아웃 처리
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API 메서드들
export const api = {
  // GET 요청
  get: <T>(url: string, params?: any): Promise<ApiResponse<T>> =>
    apiClient.get(url, { params }).then((res) => {
      const response = res.data;
      if (response.error) {
        throw new Error(response.data || 'API Error');
      }
      return {
        success: true,
        data: response.data,
        message: response.error ? response.data : undefined
      };
    }),

  // POST 요청
  post: <T>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.post(url, data).then((res) => {
      const response = res.data;
      return {
        success: response.error === null,
        data: response.data,
        message: response.error ? response.data : undefined
      };
    }),

  // PUT 요청
  put: <T>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.put(url, data).then((res) => {
      const response = res.data;
      if (response.error) {
        throw new Error(response.data || 'API Error');
      }
      return {
        success: true,
        data: response.data,
        message: response.error ? response.data : undefined
      };
    }),

  // DELETE 요청
  delete: <T>(url: string): Promise<ApiResponse<T>> =>
    apiClient.delete(url).then((res) => {
      const response = res.data;
      if (response.error) {
        throw new Error(response.data || 'API Error');
      }
      return {
        success: true,
        data: response.data,
        message: response.error ? response.data : undefined
      };
    }),

  // PATCH 요청
  patch: <T>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.patch(url, data).then((res) => {
      const response = res.data;
      if (response.error) {
        throw new Error(response.data || 'API Error');
      }
      return {
        success: true,
        data: response.data,
        message: response.error ? response.data : undefined
      };
    }),
};

export { apiClient };
export default apiClient;
