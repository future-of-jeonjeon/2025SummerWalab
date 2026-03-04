import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { todoService, UserTodo, GoalRecommendation } from '../../services/todoService';
import { userService, DEPARTMENTS, UserDetail } from '../../services/userService';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../atoms/Button';

interface GoalConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTodo: UserTodo | null;
  initialUserData?: UserDetail | null;
  onUserUpdateSuccess?: () => void;
}

type TabType = 'daily' | 'weekly' | 'monthly' | 'custom';
type UserMenuTab = 'info' | 'language' | 'theme';

interface TabState {
  isActive: boolean;
  category: string;
  target: number;
  unit: string;
  label: string;
}

const EDITOR_LANGUAGE_ORDER_KEY = 'oj:editorLanguageOrder';
const EDITOR_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'go', label: 'Golang' },
];

const DEFAULT_EDITOR_LANGUAGE_ORDER = EDITOR_LANGUAGES.map((lang) => lang.value);

const normalizeEditorLanguageOrder = (input: string[] | null | undefined): string[] => {
  const valid = new Set(DEFAULT_EDITOR_LANGUAGE_ORDER);
  const unique: string[] = [];
  for (const lang of input ?? []) {
    if (valid.has(lang) && !unique.includes(lang)) {
      unique.push(lang);
    }
  }
  for (const lang of DEFAULT_EDITOR_LANGUAGE_ORDER) {
    if (!unique.includes(lang)) {
      unique.push(lang);
    }
  }
  return unique;
};

export const GoalConfigModal: React.FC<GoalConfigModalProps> = ({
  isOpen,
  onClose,
  currentTodo,
  initialUserData,
  onUserUpdateSuccess,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [activeGroup, setActiveGroup] = useState<'user' | 'goal'>('user');
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [activeUserTab, setActiveUserTab] = useState<UserMenuTab>('info');

  const [daily, setDaily] = useState<TabState>({ isActive: true, category: 'SOLVE_COUNT', target: 1, unit: 'problem', label: '하루 1문제 풀기' });
  const [weekly, setWeekly] = useState<TabState>({ isActive: true, category: 'STREAK', target: 3, unit: 'day', label: '3일 연속 학습 유지' });
  const [monthly, setMonthly] = useState<TabState>({ isActive: true, category: 'TIER_SOLVE', target: 3, unit: 'problem', label: 'Bronze 문제 3개 풀기' });
  const [custom, setCustom] = useState<TabState & { startDate: string; endDate: string }>({
    isActive: true,
    category: 'PROBLEM_SOLVE',
    target: 10,
    unit: 'problem',
    label: '사용자 정의 목표',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
  });

  const [userForm, setUserForm] = useState({
    realName: '',
    studentId: '',
    department: '',
  });
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);

  const [preferredTheme, setPreferredTheme] = useState<'light' | 'dark'>('light');
  const [editorLanguageOrder, setEditorLanguageOrder] = useState<string[]>(DEFAULT_EDITOR_LANGUAGE_ORDER);
  const [draggingLanguage, setDraggingLanguage] = useState<string | null>(null);
  const [dragOverLanguage, setDragOverLanguage] = useState<string | null>(null);

  const { data: recommendations } = useQuery({
    queryKey: ['todo', 'recommendations'],
    queryFn: todoService.getRecommendations,
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;

    const savedTheme = localStorage.getItem('theme');
    const savedOrder = localStorage.getItem(EDITOR_LANGUAGE_ORDER_KEY);

    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder) as string[];
        setEditorLanguageOrder(normalizeEditorLanguageOrder(parsed));
      } catch {
        setEditorLanguageOrder(DEFAULT_EDITOR_LANGUAGE_ORDER);
      }
    } else {
      setEditorLanguageOrder(DEFAULT_EDITOR_LANGUAGE_ORDER);
    }

    if (savedTheme === 'dark' || savedTheme === 'light') {
      setPreferredTheme(savedTheme);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialUserData) {
      setUserForm({
        realName: initialUserData.name,
        studentId: initialUserData.student_id,
        department: DEPARTMENTS[initialUserData.major_id] || '',
      });
    }
  }, [initialUserData]);

  const parseGoal = (val: string | null | undefined, defaults: TabState, type: TabType): TabState => {
    if (!val) return { ...defaults, isActive: false };
    if (val.startsWith('CUSTOM:')) {
      const parts = val.split(':');
      const state = {
        isActive: true,
        category: parts[1],
        target: parseInt(parts[2]) || 1,
        unit: parts[3] || 'problem',
        label: parts[4] || '사용자 지정 목표',
      };
      if (type === 'custom' && parts[5] && parts[6]) {
        setTimeout(() => {
          setCustom((prev) => ({ ...prev, ...state, startDate: parts[5], endDate: parts[6] }));
        }, 0);
      }
      return state;
    }
    if (recommendations) {
      const pool = recommendations[type === 'custom' ? 'daily' : type] as GoalRecommendation[];
      const found = pool?.find((r) => r.id === val);
      if (found) {
        return {
          isActive: true,
          category: found.type,
          target: found.target,
          unit: found.unit,
          label: found.label,
        };
      }
    }
    return { ...defaults, isActive: true };
  };

  useEffect(() => {
    if (isOpen && currentTodo && recommendations) {
      setDaily(parseGoal(currentTodo.day_todo, daily, 'daily'));
      setWeekly(parseGoal(currentTodo.week_todo, weekly, 'weekly'));
      setMonthly(parseGoal(currentTodo.month_todo, monthly, 'monthly'));
      setCustom({ ...parseGoal(currentTodo.custom_todo, custom, 'custom'), startDate: custom.startDate, endDate: custom.endDate });
    }
  }, [currentTodo, isOpen, recommendations]);

  const goalMutation = useMutation({
    mutationFn: todoService.setMyTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo', 'my'] });
      onClose();
    },
  });

  const stringifyGoal = (state: TabState, type: TabType) => {
    if (!state.isActive) return '';
    let base = `CUSTOM:${state.category}:${state.target}:${state.unit}:${state.label}`;
    if (type === 'custom') {
      base += `:${custom.startDate}:${custom.endDate}`;
    }
    return base;
  };

  const handleSaveGoals = () => {
    goalMutation.mutate({
      day_todo: stringifyGoal(daily, 'daily'),
      week_todo: stringifyGoal(weekly, 'weekly'),
      month_todo: stringifyGoal(monthly, 'monthly'),
      custom_todo: stringifyGoal(custom, 'custom'),
    });
  };

  const handleSaveUserInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUserSaving(true);
    setUserError(null);

    try {
      const majorId = DEPARTMENTS.indexOf(userForm.department);
      if (majorId === -1) {
        throw new Error('학부를 선택해주세요.');
      }

      await userService.updateUserData({
        user_id: user.id,
        name: userForm.realName,
        student_id: userForm.studentId,
        major_id: majorId,
      });

      onUserUpdateSuccess?.();
    } catch (err: any) {
      setUserError(err.response?.data?.message || err.message || '정보 수정에 실패했습니다.');
    } finally {
      setUserSaving(false);
    }
  };

  const handleAvatarSelect = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size
    if (file.size > 2 * 1024 * 1024) {
      setAvatarUploadError('파일이 2MB를 초과할 수 없습니다.');
      e.target.value = '';
      return;
    }

    setAvatarUploading(true);
    setAvatarUploadError(null);

    try {
      const payload = await userService.uploadAvatar(file);
      if (!payload || payload.error) {
        throw new Error(payload?.error || '업로드 실패');
      }

      // Check if data is returned and successful
      if (payload.data === 'success' || payload.success || payload.file_path) {
        // Re-fetch auth token or profile to update UI if necessary
        // Auth interceptor normally does it, or we can reload
        onUserUpdateSuccess?.();
      }

    } catch (err: any) {
      setAvatarUploadError(err.response?.data?.message || err.message || '업로드 중 오류 발생');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const applyTheme = (theme: 'light' | 'dark') => {
    setPreferredTheme(theme);
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  };

  const moveEditorLanguage = (index: number, direction: 'up' | 'down') => {
    setEditorLanguageOrder((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return prev;
      }
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      localStorage.setItem(EDITOR_LANGUAGE_ORDER_KEY, JSON.stringify(next));
      return next;
    });
  };

  const reorderEditorLanguage = (fromLanguage: string, toLanguage: string) => {
    if (fromLanguage === toLanguage) return;
    setEditorLanguageOrder((prev) => {
      const fromIndex = prev.indexOf(fromLanguage);
      const toIndex = prev.indexOf(toLanguage);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      localStorage.setItem(EDITOR_LANGUAGE_ORDER_KEY, JSON.stringify(next));
      return next;
    });
  };

  const renderTabIcon = (type: TabType) => {
    switch (type) {
      case 'daily':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'weekly':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'monthly':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'custom':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
    }
  };

  const renderUserTabIcon = (type: UserMenuTab) => {
    switch (type) {
      case 'info':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'language':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7L3 12l5 5m8-10l5 5-5 5" />
          </svg>
        );
      case 'theme':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
          </svg>
        );
    }
  };

  const getState = (tab: TabType) => {
    if (tab === 'daily') return daily;
    if (tab === 'weekly') return weekly;
    if (tab === 'monthly') return monthly;
    return custom;
  };

  const updateState = (tab: TabType, val: Partial<TabState>) => {
    const updater = (prev: TabState) => {
      const next = { ...prev, ...val };

      if (val.target !== undefined || val.category !== undefined || val.unit !== undefined) {
        if (next.category === 'SOLVE_COUNT') {
          if (tab === 'daily') next.label = `하루 ${next.target}문제 풀기`;
          else if (tab === 'weekly') next.label = `주간 ${next.target}문제 해결`;
          else if (tab === 'monthly') next.label = `월간 ${next.target}문제 상향`;
          else next.label = `${next.target}문제 해결하기`;
        } else if (next.category === 'PROBLEM_SOLVE') {
          next.label = `${next.target}문제 목표 달성`;
        } else if (next.category === 'STREAK') {
          next.label = `${next.target}일 연속 학습 유지`;
        } else if (next.category === 'TIER_SOLVE') {
          const diff = next.label.split(' ')[0] || 'Bronze';
          next.label = `${diff} 문제 ${next.target}개 풀기`;
        }
      }
      return next;
    };

    if (tab === 'daily') setDaily(updater(daily));
    else if (tab === 'weekly') setWeekly(updater(weekly));
    else if (tab === 'monthly') setMonthly(updater(monthly));
    else {
      const nextCustom = updater(custom as TabState) as TabState & { startDate: string; endDate: string };
      setCustom({ ...custom, ...nextCustom });
    }
  };

  if (!isOpen) return null;

  const currentState = getState(activeTab);

  const modalContent = (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 h-screen w-screen overflow-hidden">
      <div className="bg-white dark:bg-slate-800 rounded-[28px] w-full max-w-5xl shadow-2xl overflow-hidden flex h-[680px] relative border border-gray-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
        <div className="w-64 bg-gray-50/50 dark:bg-slate-900 border-r border-gray-100 dark:border-slate-700 flex flex-col pt-8">
          <div className="px-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">유저 정보 수정</h3>
          </div>

          <div className="mx-4 mb-2 px-3 py-2 text-[13px] font-bold tracking-wide text-gray-500 dark:text-slate-400">
            유저 정보 수정
          </div>
          <nav className="space-y-1 px-4 mb-3">
            {(['info', 'language', 'theme'] as UserMenuTab[]).map((tab) => {
              const isCurrent = activeGroup === 'user' && activeUserTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveGroup('user');
                    setActiveUserTab(tab);
                  }}
                  className={`w-full flex items-center gap-3 text-left rounded-xl px-4 py-2 text-sm ${isCurrent
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                >
                  <span className={isCurrent ? 'text-blue-600' : 'text-gray-400'}>{renderUserTabIcon(tab)}</span>
                  <span>
                    {tab === 'info' && '정보 수정'}
                    {tab === 'language' && '선호 언어 수정'}
                    {tab === 'theme' && '테마 수정'}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mx-4 mb-2 px-3 py-2 text-[13px] font-bold tracking-wide text-gray-500 dark:text-slate-400">
            목표 설정
          </div>
          <nav className="space-y-1 px-4">
            {(['daily', 'weekly', 'monthly', 'custom'] as TabType[]).map((tab) => {
              const isCurrent = activeGroup === 'goal' && activeTab === tab;
              const state = getState(tab);

              return (
                <div
                  key={tab}
                  className={`group flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 ${isCurrent
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                >
                  <button
                    onClick={() => {
                      setActiveGroup('goal');
                      setActiveTab(tab);
                    }}
                    className="flex-1 flex items-center gap-3"
                  >
                    <div className={isCurrent ? 'text-blue-600' : 'text-gray-400'}>{renderTabIcon(tab)}</div>
                    <span className={`text-sm ${isCurrent ? 'font-bold' : 'font-medium'}`}>
                      {tab === 'daily' && '일간'}
                      {tab === 'weekly' && '주간'}
                      {tab === 'monthly' && '월간'}
                      {tab === 'custom' && '사용자 정의'}
                    </span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateState(tab, { isActive: !state.isActive });
                    }}
                    className={`w-11 h-6 rounded-full transition-all relative shrink-0 ml-2 ${state.isActive ? 'bg-[#31C48D]' : 'bg-gray-200 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${state.isActive ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 relative">
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            <div className="space-y-8">
              {activeGroup === 'user' && activeUserTab === 'info' && (
                <section className="space-y-4 border border-gray-100 dark:border-slate-700 rounded-2xl p-5">
                  <h4 className="text-[17px] font-bold text-gray-900 dark:text-white">정보 수정</h4>

                  <div className="flex flex-col items-center justify-center py-4 border-b border-gray-100 dark:border-slate-700 mb-4">
                    <div className="relative group cursor-pointer" onClick={handleAvatarSelect}>
                      <div className={`w-28 h-28 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-md bg-emerald-50 dark:bg-slate-700 ${avatarUploading ? 'opacity-50' : ''}`}>
                        {user?.avatar ? (
                          <img
                            src={user?.avatar}
                            alt="프로필 이미지"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-full h-full text-emerald-800/20 dark:text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        )}
                      </div>

                      {avatarUploading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white flex-col gap-1">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          <span className="text-[10px] font-bold">변경</span>
                        </div>
                      )}

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        accept="image/png, image/jpeg, image/jpg, image/gif, image/bmp"
                        className="hidden"
                      />
                    </div>
                    {avatarUploadError && <p className="mt-2 text-xs text-red-500 font-medium">{avatarUploadError}</p>}
                    <p className="mt-2 text-xs text-gray-400">클릭하여 2MB 이하의 이미지를 업로드하세요</p>
                  </div>

                  <form onSubmit={handleSaveUserInfo} className="space-y-4">
                    {userError && <div className="text-sm text-red-600">{userError}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">아이디</label>
                        <input type="text" readOnly value={user?.username || ''} className="w-full px-3 py-2 mt-1 text-gray-500 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">이름</label>
                        <input
                          type="text"
                          required
                          value={userForm.realName}
                          onChange={(e) => setUserForm((prev) => ({ ...prev, realName: e.target.value }))}
                          className="w-full px-3 py-2 mt-1 text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">학번</label>
                        <input
                          type="text"
                          required={!initialUserData}
                          readOnly={!!initialUserData}
                          value={userForm.studentId}
                          onChange={(e) => {
                            if (!initialUserData) {
                              setUserForm((prev) => ({ ...prev, studentId: e.target.value }));
                            }
                          }}
                          className={`w-full px-3 py-2 mt-1 border rounded-lg ${initialUserData
                            ? 'text-gray-500 bg-gray-100 border-gray-200 cursor-not-allowed'
                            : 'text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600'
                            }`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">학부</label>
                        <select
                          required
                          value={userForm.department}
                          onChange={(e) => setUserForm((prev) => ({ ...prev, department: e.target.value }))}
                          className="w-full px-3 py-2 mt-1 text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
                        >
                          <option value="" disabled>
                            학부를 선택해주세요
                          </option>
                          {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={userSaving} className="px-5">
                        {userSaving ? '저장 중...' : '유저 정보 저장'}
                      </Button>
                    </div>
                  </form>
                </section>
              )}

              {activeGroup === 'user' && activeUserTab === 'language' && (
                <section className="space-y-4 border border-gray-100 dark:border-slate-700 rounded-2xl p-5">
                  <h4 className="text-[17px] font-bold text-gray-900 dark:text-white">선호 언어 수정</h4>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    위에서부터 에디터 드롭다운에 표시됩니다. 맨 위 언어가 기본값으로 사용됩니다.
                  </p>
                  <div className="space-y-2">
                    {editorLanguageOrder.map((language, index) => {
                      const languageMeta = EDITOR_LANGUAGES.find((item) => item.value === language);
                      if (!languageMeta) return null;
                      const isFirst = index === 0;
                      return (
                        <div
                          key={language}
                          draggable
                          onDragStart={(e) => {
                            setDraggingLanguage(language);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', language);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            setDragOverLanguage(language);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const from = e.dataTransfer.getData('text/plain') || draggingLanguage;
                            if (from) {
                              reorderEditorLanguage(from, language);
                            }
                            setDraggingLanguage(null);
                            setDragOverLanguage(null);
                          }}
                          onDragEnd={() => {
                            setDraggingLanguage(null);
                            setDragOverLanguage(null);
                          }}
                          className={`flex items-center justify-between rounded-xl border bg-white dark:bg-slate-700 px-4 py-2 cursor-grab active:cursor-grabbing ${dragOverLanguage === language ? 'border-blue-400 dark:border-blue-400' : 'border-gray-200 dark:border-slate-600'
                            } ${draggingLanguage === language ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400 text-xs select-none">⋮⋮</span>
                            <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">{languageMeta.label}</span>
                            {isFirst && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                기본값
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => moveEditorLanguage(index, 'up')}
                              disabled={index === 0}
                              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-500 text-gray-600 dark:text-slate-200 disabled:opacity-40"
                              title="위로"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveEditorLanguage(index, 'down')}
                              disabled={index === editorLanguageOrder.length - 1}
                              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-500 text-gray-600 dark:text-slate-200 disabled:opacity-40"
                              title="아래로"
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {activeGroup === 'user' && activeUserTab === 'theme' && (
                <section className="space-y-4 border border-gray-100 dark:border-slate-700 rounded-2xl p-5">
                  <h4 className="text-[17px] font-bold text-gray-900 dark:text-white">테마 수정</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => applyTheme('light')}
                      className={`px-4 py-2 rounded-lg border ${preferredTheme === 'light' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-600'}`}
                    >
                      화이트 모드
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTheme('dark')}
                      className={`px-4 py-2 rounded-lg border ${preferredTheme === 'dark' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-600'}`}
                    >
                      다크 모드
                    </button>
                  </div>
                </section>
              )}

              {activeGroup === 'goal' && (
                <section className="space-y-6 border border-gray-100 dark:border-slate-700 rounded-2xl p-5">
                  <h4 className="text-[17px] font-bold text-gray-900 dark:text-white">목표 상세 설정</h4>

                  {activeTab === 'custom' && (
                    <div className="space-y-4">
                      <h5 className="text-[15px] font-bold text-gray-900 dark:text-white">기간 설정</h5>
                      <div className="flex items-center gap-4">
                        <input
                          type="date"
                          value={custom.startDate}
                          onChange={(e) => setCustom({ ...custom, startDate: e.target.value })}
                          className="w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm"
                        />
                        <span className="text-gray-300">~</span>
                        <input
                          type="date"
                          value={custom.endDate}
                          onChange={(e) => setCustom({ ...custom, endDate: e.target.value })}
                          className="w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h5 className="text-[15px] font-bold text-gray-900 dark:text-white">1. 주요 목표 선택</h5>
                    <select
                      value={currentState.category}
                      onChange={(e) => updateState(activeTab, { category: e.target.value })}
                      className="w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm"
                    >
                      <option value="SOLVE_COUNT">문제 해결</option>
                      {activeTab !== 'daily' && <option value="STREAK">연속 출석</option>}
                      <option value="TIER_SOLVE">난이도 목표</option>
                      {activeTab === 'custom' && <option value="PROBLEM_SOLVE">기타 과제</option>}
                    </select>
                  </div>

                  {currentState.category === 'TIER_SOLVE' && (
                    <div className="space-y-4">
                      <label className="text-[15px] font-bold text-gray-700 dark:text-gray-300">난이도 선택</label>
                      <select
                        value={currentState.label.split(' ')[0]}
                        onChange={(e) => updateState(activeTab, { label: `${e.target.value} 문제 ${currentState.target}개 풀기` })}
                        className="w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm"
                      >
                        <option value="Bronze">Bronze</option>
                        <option value="Mid">Mid</option>
                        <option value="Gold">Gold</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h5 className="text-[15px] font-bold text-gray-900 dark:text-white">2. 세부 목표 설정</h5>
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 flex items-center gap-5">
                      <input
                        type="number"
                        value={currentState.target === 0 ? '' : currentState.target}
                        onChange={(e) => updateState(activeTab, { target: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                        className="w-20 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-lg font-bold text-center text-blue-600"
                        placeholder="0"
                      />
                      <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300 leading-tight">
                        {currentState.category === 'STREAK' ? '일 동안 학습을 진행하겠습니다.' : '문제를 해결하겠습니다.'}
                      </span>
                    </div>
                  </div>

                  {activeTab !== 'custom' && recommendations && (
                    <div className="space-y-4">
                      <label className="text-[15px] font-bold text-gray-700 dark:text-gray-300 block">권장 목표 (빠른 선택)</label>
                      <div className="grid grid-cols-1 gap-2.5">
                        {recommendations[activeTab]?.map((goal) => (
                          <button
                            key={goal.id}
                            onClick={() => {
                              updateState(activeTab, {
                                isActive: true,
                                category: goal.type,
                                target: goal.target,
                                unit: goal.unit,
                                label: goal.label,
                              });
                            }}
                            className={`flex items-center justify-between p-4 px-6 rounded-2xl border-2 transition-all duration-200 ${currentState.target === goal.target && currentState.category === goal.type && currentState.label === goal.label
                              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm'
                              : 'border-gray-50 dark:border-slate-800 hover:border-gray-100 dark:hover:border-slate-700'
                              }`}
                          >
                            <div className="text-left">
                              <p className="text-[14px] font-bold text-gray-900 dark:text-white">{goal.label}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>

          <div className="p-8 pb-10 flex justify-end items-center gap-6 border-t border-gray-50 dark:border-slate-700 bg-white dark:bg-slate-800">
            <button onClick={onClose} className="text-[15px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              닫기
            </button>
            {activeGroup === 'goal' && (
              <Button
                onClick={handleSaveGoals}
                disabled={goalMutation.isPending}
                className="bg-[#667EEA] hover:bg-[#5A67D8] text-white rounded-2xl px-8 py-2.5 shadow-[0_4px_12px_rgba(102,126,234,0.25)] transition-all text-[15px] font-bold"
              >
                {goalMutation.isPending ? '목표 저장 중...' : '목표 저장하기'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
