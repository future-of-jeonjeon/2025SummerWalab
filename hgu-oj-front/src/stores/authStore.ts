import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile } from '../types';
import { authService } from '../services/authService';
import { queryClient } from '../hooks/useQueryClient';
import { useProblemStore } from './problemStore';

const invalidateUserScopedQueries = () => {
  const userScopedKeys = new Set<string>([
    'problems',
    'problem',
    'contest-problems',
    'contest-problem',
    'contest-problem-list',
    'contest-rank-progress',
    'contest-rank',
    'workbook-problems',
    'workbook-problem-list',
    'workbook',
    'mypage',
  ]);

  queryClient.invalidateQueries({
    predicate: (query) => {
      const rootKey = Array.isArray(query.queryKey) ? query.queryKey[0] : undefined;
      return typeof rootKey === 'string' && userScopedKeys.has(rootKey);
    },
    refetchType: 'all',
  });
  queryClient.removeQueries({
    predicate: (query) => {
      const rootKey = Array.isArray(query.queryKey) ? query.queryKey[0] : undefined;
      return typeof rootKey === 'string' && userScopedKeys.has(rootKey);
    },
  });
};

const clearOjStorage = () => {
  if (typeof window === 'undefined') {
    return;
  }
  const prefixes = ['oj:'];
  const storages: Array<Storage> = [];
  try {
    if (window.localStorage) storages.push(window.localStorage);
  } catch (err) {
    console.warn('localStorage 접근 불가', err);
  }
  try {
    if (window.sessionStorage) storages.push(window.sessionStorage);
  } catch (err) {
    console.warn('sessionStorage 접근 불가', err);
  }
  storages.forEach((storage) => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key) continue;
      if (prefixes.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      try {
        storage.removeItem(key);
      } catch (err) {
        console.warn('스토리지 항목 제거 실패', key, err);
      }
    });
  });
};

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (username: string, password: string, tfaCode?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (username: string, password: string, tfaCode?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // 1. Online Judge 로그인
          console.log('Starting login process...');
          const loginResponse = await authService.login({
            username,
            password,
            tfa_code: tfaCode,
          });

          console.log('Login response received:', loginResponse);
          if (!loginResponse.success) {
            console.log('Login failed:', loginResponse.message);
            set({ error: loginResponse.message || '로그인에 실패했습니다.', isLoading: false });
            return false;
          }

          // 2. SSO 토큰 발급
          const ssoToken = await authService.getSSOToken();

          // 3. Micro-service 로그인
          await authService.loginToMicroService(ssoToken);

          // 4. 사용자 프로필 조회
          const user = await authService.getProfile();

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          invalidateUserScopedQueries();

          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
          set({ error: errorMessage, isLoading: false });
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          await authService.logout();
        } catch (error) {
          console.error('로그아웃 중 오류:', error);
        } finally {
          clearOjStorage();
          invalidateUserScopedQueries();
          queryClient.clear();
          const problemStore = useProblemStore.getState();
          problemStore.setProblems([]);
          problemStore.setCurrentProblem(null);
          problemStore.setTotalCount(0);
          problemStore.setFilter({
            page: 1,
            limit: 20,
            searchField: 'title',
            sortField: 'title',
            sortOrder: 'asc',
            statusFilter: 'all',
          });
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      checkAuth: async () => {
        const { isAuthenticated } = get();
        
        // 이미 인증되지 않은 상태라면 확인하지 않음
        if (!isAuthenticated) {
          return;
        }
        
        set({ isLoading: true });
        
        try {
          const isStillAuthenticated = await authService.checkAuth();
          if (isStillAuthenticated) {
            const user = await authService.getProfile();
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch (error) {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      setUser: (user: UserProfile | null) => {
        set({ user, isAuthenticated: !!user });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
