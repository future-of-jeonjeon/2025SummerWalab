import { api } from './api';
import { LoginForm, LoginResponse, SSOTokenResponse, UserProfile } from '../types';

export const authService = {
  // Online Judge 로그인
  login: async (credentials: LoginForm): Promise<LoginResponse> => {
    const response = await api.post<string>('/login', credentials);
    console.log('Login API Response:', response);
    
    const result = {
      success: response.success && response.data === "Succeeded",
      data: response.data,
      message: response.message
    };
    
    console.log('Login Service Result:', result);
    return result;
  },

  // SSO 토큰 발급
  getSSOToken: async (): Promise<string> => {
    const response = await api.get<{token: string}>('/sso');
    return response.data.token;
  },

  // Micro-service 로그인
  loginToMicroService: async (token: string): Promise<void> => {
    await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
  },

  // 사용자 프로필 조회
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get<UserProfile>('/profile');
    return response.data;
  },

  // 로그아웃
  logout: async (): Promise<void> => {
    // Online Judge 로그아웃
    await api.get('/logout');
    
    // Micro-service 로그아웃
    await fetch('http://localhost:8000/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  },

  // 인증 상태 확인
  checkAuth: async (): Promise<boolean> => {
    try {
      const response = await api.get('/profile');
      return response.success && !!response.data;
    } catch (error) {
      return false;
    }
  },
};
