import { api } from './api';
import { LoginForm, LoginResponse, UserProfile } from '../types';

const API_BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) || '').replace(/\/$/, '');
const MS_API_BASE = ((import.meta.env.VITE_MS_API_BASE as string | undefined) || '').replace(/\/$/, '');

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
    if (!MS_API_BASE) {
      throw new Error('API base URL is not configured.');
    }

    await fetch(`${MS_API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
  },

  // 사용자 프로필 조회
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get<any>('/profile');
    const raw = response.data;

    if (raw && typeof raw === 'object' && raw.user) {
      const { user, ...rest } = raw;
      return {
        id: user.id,
        username: user.username,
        real_name: rest.real_name ?? user.real_name,
        email: user.email,
        admin_type: user.admin_type,
        problem_permission: user.problem_permission,
        create_time: user.create_time,
        last_login: user.last_login,
        two_factor_auth: user.two_factor_auth,
        open_api: user.open_api,
        is_disabled: user.is_disabled,
        avatar: rest.avatar,
      } as UserProfile;
    }

    return raw as UserProfile;
  },

  // 로그아웃
  logout: async (): Promise<void> => {
    // Online Judge 로그아웃
    await api.get('/logout');

    // Micro-service 로그아웃
    if (!MS_API_BASE) {
      throw new Error('API base URL is not configured.');
    }

    await fetch(`${MS_API_BASE}/auth/logout`, {
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
