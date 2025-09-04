import { apiUtils } from './api';

export interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface TokenRefreshRequest {
  refresh_token: string;
}

export const authApi = {
  // 로그인
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiUtils.post<AuthResponse>('/auth/login', data);
    
    // 토큰 저장
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    
    return response;
  },

  // 회원가입
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiUtils.post<AuthResponse>('/auth/register', data);
    
    // 토큰 저장
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    
    return response;
  },

  // 로그아웃
  logout: async (): Promise<void> => {
    try {
      await apiUtils.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // 토큰 제거
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },

  // 토큰 갱신
  refreshToken: async (): Promise<AuthResponse> => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiUtils.post<AuthResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });

    // 새 토큰 저장
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);

    return response;
  },

  // 현재 사용자 정보 조회
  getCurrentUser: async (): Promise<User> => {
    return await apiUtils.get<User>('/auth/me');
  },

  // 토큰 유효성 검사
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('access_token');
    return !!token;
  },

  // 관리자 권한 확인
  isAdmin: async (): Promise<boolean> => {
    try {
      const user = await authApi.getCurrentUser();
      return user.isAdmin;
    } catch (error) {
      return false;
    }
  },
};
