import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { userService, DEPARTMENTS, UserDetail } from '../../services/userService';
import { GoalPeriod, GoalType, todoService, UserGoalInput, UserTodo } from '../../services/todoService';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../atoms/Button';
import {
  createEmptyGoalInput,
  createGoalDraftId,
  getGoalLabel,
  getGoalUnit,
  GOAL_PERIOD_LABELS,
  GOAL_PERIOD_TONES,
  GOAL_TYPE_LABELS,
  normalizeGoalInput,
  toEditableGoalInput,
} from '../../utils/goals';

interface GoalConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTodo: UserTodo | null;
  initialUserData?: UserDetail | null;
  onUserUpdateSuccess?: () => void;
  initialView?: 'profile' | 'goal';
}

type UserMenuTab = 'info' | 'language' | 'theme';
type GoalDraft = UserGoalInput & { id: string };

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
  initialView = 'profile',
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [activeGroup, setActiveGroup] = useState<'user' | 'goal'>('user');
  const [activeUserTab, setActiveUserTab] = useState<UserMenuTab>('info');

  const [goalDrafts, setGoalDrafts] = useState<GoalDraft[]>([]);
  const [goalForm, setGoalForm] = useState<UserGoalInput>(createEmptyGoalInput());
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalFormError, setGoalFormError] = useState<string | null>(null);
  const [goalSaveError, setGoalSaveError] = useState<string | null>(null);

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
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [editorLanguageOrder, setEditorLanguageOrder] = useState<string[]>(DEFAULT_EDITOR_LANGUAGE_ORDER);
  const [draggingLanguage, setDraggingLanguage] = useState<string | null>(null);
  const [dragOverLanguage, setDragOverLanguage] = useState<string | null>(null);

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
      if (typeof initialUserData.dark_mode_enabled === 'boolean') {
        setPreferredTheme(initialUserData.dark_mode_enabled ? 'dark' : 'light');
      }
    }
  }, [initialUserData]);

  useEffect(() => {
    if (!isOpen) return;

    const initialGoals = (currentTodo?.goals ?? []).map((goal) => ({
      ...(toEditableGoalInput(goal) as GoalDraft),
      id: goal.id,
    }));

    setGoalDrafts(initialGoals);
    setGoalForm(createEmptyGoalInput());
    setEditingGoalId(null);
    setGoalFormError(null);
    setGoalSaveError(null);
  }, [currentTodo, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialView === 'goal') {
      setActiveGroup('goal');
      return;
    }

    setActiveGroup('user');
    setActiveUserTab('info');
  }, [initialView, isOpen]);

  const goalMutation = useMutation({
    mutationFn: todoService.setMyTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo', 'my'] });
      onClose();
    },
    onError: (error: any) => {
      setGoalSaveError(error?.response?.data?.message || error?.message || '목표 저장에 실패했습니다.');
    },
  });

  const validateGoalForm = (goal: UserGoalInput) => {
    if (!Number.isFinite(goal.target) || goal.target < 1) {
      return '목표 수치는 1 이상이어야 합니다.';
    }
    if (goal.type === 'TIER_SOLVE' && !goal.difficulty) {
      return '난이도 목표는 난이도 선택이 필요합니다.';
    }
    return null;
  };

  const resetGoalForm = () => {
    setGoalForm(createEmptyGoalInput());
    setEditingGoalId(null);
    setGoalFormError(null);
  };

  const upsertGoalDraft = () => {
    const normalized = normalizeGoalInput(goalForm);
    const validationMessage = validateGoalForm(normalized);
    if (validationMessage) {
      setGoalFormError(validationMessage);
      return;
    }

    const nextGoal: GoalDraft = {
      ...normalized,
      id: editingGoalId ?? normalized.id ?? createGoalDraftId(),
    };

    setGoalDrafts((prev) => {
      if (!editingGoalId) {
        return [...prev, nextGoal];
      }
      return prev.map((goal) => (goal.id === editingGoalId ? nextGoal : goal));
    });

    resetGoalForm();
  };

  const startGoalEdit = (goal: GoalDraft) => {
    setActiveGroup('goal');
    setGoalForm(toEditableGoalInput(goal));
    setEditingGoalId(goal.id);
    setGoalFormError(null);
  };

  const removeGoalDraft = (goalId: string) => {
    setGoalDrafts((prev) => prev.filter((goal) => goal.id !== goalId));
    if (editingGoalId === goalId) {
      resetGoalForm();
    }
  };

  const handleSaveGoals = () => {
    setGoalSaveError(null);
    goalMutation.mutate({
      goals: goalDrafts.map((goal) => normalizeGoalInput(goal)),
    });
  };

  const handleSaveUserInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUserSaving(true);
    setUserError(null);

    const getErrorMessage = (err: any, fallback: string) =>
      err?.response?.data?.detail?.message ||
      err?.response?.data?.message ||
      err?.message ||
      fallback;

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
      setUserError(getErrorMessage(err, '정보 수정에 실패했습니다.'));
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

      if (payload.data === 'success' || payload.success || payload.file_path) {
        onUserUpdateSuccess?.();
      }
    } catch (err: any) {
      setAvatarUploadError(err.response?.data?.message || err.message || '업로드 중 오류 발생');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const applyTheme = async (theme: 'light' | 'dark') => {
    if (!user || themeSaving) return;

    const prevTheme = preferredTheme;
    setThemeError(null);
    setThemeSaving(true);
    setPreferredTheme(theme);
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');

    try {
      await userService.patchUserData({
        dark_mode_enabled: theme === 'dark',
      });
      onUserUpdateSuccess?.();
    } catch (err: any) {
      setPreferredTheme(prevTheme);
      localStorage.setItem('theme', prevTheme);
      document.documentElement.classList.toggle('dark', prevTheme === 'dark');
      setThemeError(err.response?.data?.message || err.message || '테마 저장에 실패했습니다.');
    } finally {
      setThemeSaving(false);
    }
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

  const renderGoalIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 h-screen w-screen overflow-hidden"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-[28px] w-full max-w-6xl shadow-2xl overflow-hidden flex h-[min(720px,calc(100vh-2rem))] relative border border-gray-100 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-72 bg-gray-50/70 dark:bg-slate-900 border-r border-gray-100 dark:border-slate-700 flex flex-col pt-8">
          <div className="px-6 mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-slate-500">MY PAGE</p>
            <h3 className="mt-2 text-xl font-bold text-gray-900 dark:text-white tracking-tight">설정 정리</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">프로필과 학습 목표를 한 화면에서 관리합니다.</p>
          </div>

          <div className="mx-4 mb-2 px-3 py-2 text-[13px] font-bold tracking-wide text-gray-500 dark:text-slate-400">
            프로필 설정
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
            학습 목표
          </div>
          <nav className="space-y-1 px-4">
            <button
              onClick={() => setActiveGroup('goal')}
              className={`w-full flex items-center gap-3 text-left rounded-xl px-4 py-2 text-sm ${activeGroup === 'goal'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold'
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
            >
              <span className={activeGroup === 'goal' ? 'text-blue-600' : 'text-gray-400'}>{renderGoalIcon()}</span>
              <span>목표 생성/관리</span>
            </button>
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
                      disabled={themeSaving}
                      className={`px-4 py-2 rounded-lg border ${preferredTheme === 'light' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-600'}`}
                    >
                      화이트 모드
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTheme('dark')}
                      disabled={themeSaving}
                      className={`px-4 py-2 rounded-lg border ${preferredTheme === 'dark' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-600'}`}
                    >
                      다크 모드
                    </button>
                  </div>
                  {themeError && <p className="text-sm text-red-600">{themeError}</p>}
                </section>
              )}

              {activeGroup === 'goal' && (
                <section className="space-y-6 border border-gray-100 dark:border-slate-700 rounded-2xl p-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h5 className="text-[15px] font-bold text-gray-900 dark:text-white">현재 목표 목록</h5>
                        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">편집하거나 삭제한 뒤 저장하면 전체 목표 구성이 갱신됩니다.</p>
                      </div>
                      <button
                        type="button"
                        onClick={resetGoalForm}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:text-blue-600 hover:border-blue-200 dark:border-slate-600 dark:text-slate-300 dark:hover:text-blue-300 dark:hover:border-blue-400"
                      >
                        새 목표 작성
                      </button>
                    </div>

                    {goalDrafts.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-gray-300 px-6 py-10 text-center dark:border-slate-600">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <h6 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">등록된 목표가 없습니다</h6>
                        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">아래 생성 폼에서 첫 번째 목표를 추가해보세요.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {goalDrafts.map((goal) => {
                          const tone = GOAL_PERIOD_TONES[goal.period];
                          return (
                            <div
                              key={goal.id}
                              className={`rounded-3xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ${tone.soft} dark:border-slate-700 dark:bg-slate-800`}
                            >
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${tone.badge} ${tone.badgeText}`}>
                                      {GOAL_PERIOD_LABELS[goal.period]}
                                    </span>
                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:bg-slate-700 dark:text-slate-300">
                                      {GOAL_TYPE_LABELS[goal.type]}
                                    </span>
                                  </div>
                                  <p className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
                                    {getGoalLabel(goal)}
                                  </p>
                                  <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                                    목표 수치: {goal.target} {getGoalUnit(goal.type)}
                                    {goal.type === 'TIER_SOLVE' && goal.difficulty ? ` · 난이도 ${goal.difficulty}` : ''}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => startGoalEdit(goal)}
                                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:border-blue-200 hover:text-blue-600 dark:border-slate-600 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                                  >
                                    수정
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeGoalDraft(goal.id)}
                                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
                                  >
                                    삭제
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h5 className="text-[15px] font-bold text-gray-900 dark:text-white">
                          {editingGoalId ? '목표 수정' : '새 목표 생성'}
                        </h5>
                        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">기간과 목표 유형을 정하고 원하는 만큼 추가할 수 있습니다.</p>
                      </div>
                      {editingGoalId && (
                        <button
                          type="button"
                          onClick={resetGoalForm}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:border-gray-300 dark:border-slate-600 dark:text-slate-300"
                        >
                          수정 취소
                        </button>
                      )}
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="space-y-5">
                        <div className="space-y-3">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">기간 선택</label>
                          <div className="flex flex-wrap gap-2">
                            {(['daily', 'weekly', 'monthly'] as GoalPeriod[]).map((period) => {
                              const selected = goalForm.period === period;
                              return (
                                <button
                                  key={period}
                                  type="button"
                                  onClick={() => setGoalForm((prev) => ({ ...prev, period }))}
                                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selected
                                    ? 'bg-gray-900 text-white dark:bg-white dark:text-slate-900'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                                    }`}
                                >
                                  {GOAL_PERIOD_LABELS[period]}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">목표 유형</label>
                          <div className="grid gap-3 md:grid-cols-3">
                            {(['SOLVE_COUNT', 'STREAK', 'TIER_SOLVE'] as GoalType[]).map((type) => {
                              const selected = goalForm.type === type;
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => setGoalForm((prev) => ({
                                    ...prev,
                                    type,
                                    difficulty: type === 'TIER_SOLVE' ? (prev.difficulty ?? 'Bronze') : null,
                                  }))}
                                  className={`rounded-2xl border p-4 text-left shadow-sm transition ${selected
                                    ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-100 dark:border-blue-400 dark:bg-blue-900/30 dark:ring-blue-900/40'
                                    : 'border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-blue-500 dark:hover:bg-slate-700'
                                    }`}
                                >
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{GOAL_TYPE_LABELS[type]}</p>
                                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                    {type === 'SOLVE_COUNT' && '해당 기간의 해결 문제 수를 목표로 설정합니다.'}
                                    {type === 'STREAK' && '연속 출석 일수를 목표로 설정합니다.'}
                                    {type === 'TIER_SOLVE' && '선택한 난이도의 해결 문제 수를 추적합니다.'}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {goalForm.type === 'TIER_SOLVE' && (
                          <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">난이도 선택</label>
                            <div className="flex flex-wrap gap-2">
                              {(['Bronze', 'Mid', 'Gold'] as const).map((difficulty) => {
                                const selected = goalForm.difficulty === difficulty;
                                return (
                                  <button
                                    key={difficulty}
                                    type="button"
                                    onClick={() => setGoalForm((prev) => ({ ...prev, difficulty }))}
                                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selected
                                      ? 'bg-gray-900 text-white dark:bg-white dark:text-slate-900'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                                      }`}
                                  >
                                    {difficulty}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">목표 수치</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min={1}
                              value={goalForm.target}
                              onChange={(e) => setGoalForm((prev) => ({ ...prev, target: Math.max(1, Number(e.target.value) || 1) }))}
                              className="w-28 rounded-xl border border-gray-200 bg-white px-4 py-2 text-lg font-bold text-blue-600 dark:border-slate-600 dark:bg-slate-700 dark:text-blue-300"
                            />
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600 dark:bg-slate-700 dark:text-slate-200">
                              {getGoalUnit(goalForm.type)}
                            </span>
                          </div>
                        </div>

                        {goalFormError && (
                          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                            {goalFormError}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-3xl border border-gray-200 bg-gray-50/70 p-5 dark:border-slate-700 dark:bg-slate-900/40">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">미리보기</p>
                          <h6 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{getGoalLabel(goalForm)}</h6>
                          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                            {GOAL_PERIOD_LABELS[goalForm.period]} · {GOAL_TYPE_LABELS[goalForm.type]}
                          </p>
                          <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
                            목표 수치 {goalForm.target} {getGoalUnit(goalForm.type)}
                            {goalForm.type === 'TIER_SOLVE' && goalForm.difficulty ? ` · 난이도 ${goalForm.difficulty}` : ''}
                          </p>
                        </div>

                        <div className="flex flex-col gap-3">
                          <Button
                            type="button"
                            onClick={upsertGoalDraft}
                            className="w-full rounded-2xl border border-blue-600 bg-blue-600 py-3 text-base font-bold text-white transition hover:bg-blue-700"
                          >
                            {editingGoalId ? '목표 수정 적용' : '목표 추가'}
                          </Button>
                          <button
                            type="button"
                            onClick={resetGoalForm}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                          >
                            폼 초기화
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {goalSaveError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                      {goalSaveError}
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
