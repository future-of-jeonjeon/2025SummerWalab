import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useUserGoals } from '../../hooks/useUserGoals';
import { todoService, type GoalPeriod, type GoalType, type UserGoal, type UserGoalInput } from '../../services/todoService';
import { useAuthStore } from '../../stores/authStore';
import {
  createEmptyGoalInput,
  createGoalDraftId,
  formatGoalDateRange,
  formatGoalDifficulty,
  getGoalLabel,
  getGoalResolvedTarget,
  getGoalUnit,
  GOAL_DIFFICULTY_OPTIONS,
  GOAL_PERIOD_LABELS,
  GOAL_PERIOD_TONES,
  GOAL_TYPE_LABELS,
  normalizeGoalInput,
  supportsAttendance,
  toEditableGoalInput,
} from '../../utils/goals';

const SUPPORTED_PATHS = new Set([
  '/',
  '/problems',
  '/workbooks',
  '/contests',
  '/organizations',
  '/contribution',
  '/ranking',
]);

const PERIOD_OPTIONS: GoalPeriod[] = ['daily', 'weekly', 'monthly', 'custom'];
const GOAL_TYPE_OPTIONS: GoalType[] = ['SOLVE_COUNT', 'ATTENDANCE', 'TIER_SOLVE'];
type PanelView = 'list' | 'form';

const GoalCard: React.FC<{
  goal: UserGoal;
  onEdit: () => void;
  onRemove: () => void;
}> = ({ goal, onEdit, onRemove }) => {
  const tone = GOAL_PERIOD_TONES[goal.period];
  const isComplete = goal.progress.percent >= 100;
  const remaining = Math.max(goal.target - goal.count, 0);

  return (
    <article className="rounded-2xl border border-gray-200 bg-gray-50/90 p-4 text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${tone.badge} ${tone.badgeText}`}>
              {GOAL_PERIOD_LABELS[goal.period]}
            </span>
            <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-gray-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
              {GOAL_TYPE_LABELS[goal.type]}
            </span>
          </div>
          <h3 className="mt-3 text-sm font-semibold leading-6 text-slate-900 dark:text-white">
            {goal.label}
          </h3>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            목표 수치 {goal.target} {goal.unit}
            {goal.type === 'TIER_SOLVE' && goal.difficulty ? ` · 난이도 ${formatGoalDifficulty(goal.difficulty)}` : ''}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{formatGoalDateRange(goal)}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            수정
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
          >
            삭제
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          {goal.count} / {goal.target} {goal.unit}
        </span>
        <span className={isComplete ? 'text-emerald-600 dark:text-emerald-300' : tone.text}>
          {isComplete ? '목표 달성' : `${remaining} 남음`}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-white/10">
        <div
          className={`${tone.progress} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${goal.progress.percent}%` }}
        />
      </div>
    </article>
  );
};

export const GoalFloatingWidget: React.FC = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { data: currentTodo, goals, isLoading } = useUserGoals();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<PanelView>('list');
  const [goalForm, setGoalForm] = useState<UserGoalInput>(createEmptyGoalInput());
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalFormError, setGoalFormError] = useState<string | null>(null);
  const [goalSaveError, setGoalSaveError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isVisible = isAuthenticated && SUPPORTED_PATHS.has(location.pathname);

  useEffect(() => {
    setIsOpen(false);
    setView('list');
    setGoalForm(createEmptyGoalInput());
    setEditingGoalId(null);
    setGoalFormError(null);
    setGoalSaveError(null);
  }, [location.pathname]);

  useEffect(() => {
    if (!isVisible) {
      setIsOpen(false);
      setView('list');
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
      setView('list');
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setView('list');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const goalMutation = useMutation({
    mutationFn: todoService.setMyTodo,
    onSuccess: (data) => {
      queryClient.setQueryData(['todo', 'my'], data);
      queryClient.invalidateQueries({ queryKey: ['todo', 'my'] });
      setView('list');
      setGoalForm(createEmptyGoalInput());
      setEditingGoalId(null);
      setGoalFormError(null);
      setGoalSaveError(null);
    },
    onError: (error: any) => {
      setGoalSaveError(error?.response?.data?.message || error?.message || '목표 저장에 실패했습니다.');
    },
  });

  if (!isVisible) {
    return null;
  }

  const validateGoalForm = (goal: UserGoalInput) => {
    if (goal.period === 'custom' && (!goal.customDays || goal.customDays < 1)) {
      return '커스텀 기간은 1일 이상이어야 합니다.';
    }
    if (goal.type === 'ATTENDANCE' && !supportsAttendance(goal.period)) {
      return '출석 목표는 일간 기간에서 설정할 수 없습니다.';
    }
    if (goal.type !== 'ATTENDANCE' && (!Number.isFinite(goal.target) || goal.target < 1)) {
      return '목표 수치는 1 이상이어야 합니다.';
    }
    if (goal.type === 'TIER_SOLVE' && !goal.difficulty) {
      return '난이도를 선택해주세요.';
    }
    return null;
  };

  const openCreateView = () => {
    setGoalForm(createEmptyGoalInput());
    setEditingGoalId(null);
    setGoalFormError(null);
    setGoalSaveError(null);
    setView('form');
    setIsOpen(true);
  };

  const openEditView = (goal: UserGoal) => {
    setGoalForm(toEditableGoalInput(goal));
    setEditingGoalId(goal.id);
    setGoalFormError(null);
    setGoalSaveError(null);
    setView('form');
    setIsOpen(true);
  };

  const goBackToList = () => {
    setView('list');
    setGoalForm(createEmptyGoalInput());
    setEditingGoalId(null);
    setGoalFormError(null);
    setGoalSaveError(null);
  };

  const handleSaveForm = () => {
    const normalized = normalizeGoalInput(goalForm);
    const validationMessage = validateGoalForm(normalized);
    if (validationMessage) {
      setGoalFormError(validationMessage);
      return;
    }

    const currentGoalInputs = (currentTodo?.goals ?? goals).map((goal) => toEditableGoalInput(goal));
    const nextGoal: UserGoalInput = {
      ...normalized,
      id: editingGoalId ?? normalized.id ?? createGoalDraftId(),
    };

    const nextGoals = editingGoalId
      ? currentGoalInputs.map((goal) => (goal.id === editingGoalId ? nextGoal : goal))
      : [...currentGoalInputs, nextGoal];

    setGoalSaveError(null);
    goalMutation.mutate({ goals: nextGoals });
  };

  const handleRemoveGoal = (goalId: string) => {
    const nextGoals = (currentTodo?.goals ?? goals)
      .filter((goal) => goal.id !== goalId)
      .map((goal) => toEditableGoalInput(goal));

    setGoalSaveError(null);
    goalMutation.mutate({ goals: nextGoals });
  };

  return (
    <>
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-4 z-[100000] flex w-[min(26rem,calc(100vw-1.5rem))] max-h-[min(42rem,calc(100vh-7.5rem))] flex-col overflow-hidden rounded-[30px] border border-gray-200 bg-white/95 text-slate-900 shadow-[0_26px_60px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-slate-700 dark:bg-[#2b2f38]/95 dark:text-white dark:shadow-[0_26px_60px_rgba(15,23,42,0.42)] sm:right-6"
        >
          {view === 'list' ? (
            <>
              <div className="border-b border-gray-200 px-5 py-4 dark:border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-400">Goals</p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">학습 목표</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">현재 목표를 빠르게 확인하고 수정할 수 있습니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-2xl border border-gray-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label="학습 목표 패널 닫기"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <section className="rounded-[26px] border border-gray-200 bg-slate-50/90 p-4 dark:border-white/8 dark:bg-black/10">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">현재 목표</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{goals.length}개 설정됨</p>
                    </div>
                    <button
                      type="button"
                      onClick={openCreateView}
                      className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                    >
                      추가
                    </button>
                  </div>

                  {goalSaveError && (
                    <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">
                      {goalSaveError}
                    </div>
                  )}

                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <div key={`floating-goal-skeleton-${index}`} className="h-28 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/5" />
                      ))}
                    </div>
                  ) : goals.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-center dark:border-white/15">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-gray-200 dark:bg-white/5 dark:text-slate-300 dark:ring-0">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">아직 목표가 없습니다</p>
                      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">추가 버튼을 눌러 목표를 바로 만들어보세요.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {goals.map((goal) => (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          onEdit={() => openEditView(goal)}
                          onRemove={() => handleRemoveGoal(goal.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-gray-200 px-4 py-3 dark:border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={goBackToList}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 19l-7-7 7-7" />
                    </svg>
                    뒤로가기
                  </button>
                  <div className="text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Goal Form</p>
                    <h2 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                      {editingGoalId ? '목표 수정' : '새 목표 등록'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveForm}
                    disabled={goalMutation.isPending}
                    className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    {goalMutation.isPending ? '저장 중' : '저장'}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <section className="rounded-[26px] border border-gray-200 bg-slate-50/90 p-4 dark:border-white/8 dark:bg-black/10">
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">기간</p>
                      <div className="grid grid-cols-2 gap-2">
                        {PERIOD_OPTIONS.map((period) => {
                          const selected = goalForm.period === period;
                          return (
                            <button
                              key={period}
                              type="button"
                              onClick={() => setGoalForm((prev) => ({
                                ...prev,
                                period,
                                type: period === 'daily' && prev.type === 'ATTENDANCE' ? 'SOLVE_COUNT' : prev.type,
                                customDays: period === 'custom' ? (prev.customDays ?? 1) : null,
                              }))}
                              className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                                selected
                                  ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/70 dark:bg-blue-500/20 dark:text-blue-100'
                                  : 'border-gray-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                              }`}
                            >
                              {GOAL_PERIOD_LABELS[period]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">목표 유형</p>
                      <div className="grid gap-2">
                        {GOAL_TYPE_OPTIONS.map((type) => {
                          const selected = goalForm.type === type;
                          const disabled = type === 'ATTENDANCE' && !supportsAttendance(goalForm.period);
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                if (disabled) return;
                                setGoalForm((prev) => ({
                                  ...prev,
                                  type,
                                  difficulty: type === 'TIER_SOLVE' ? (prev.difficulty ?? 1) : null,
                                }));
                              }}
                              disabled={disabled}
                              className={`rounded-2xl border px-4 py-3 text-left transition ${
                                selected
                                  ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/70 dark:bg-blue-500/20 dark:text-blue-50'
                                  : 'border-gray-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10'
                              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                              <p className="text-sm font-semibold">{GOAL_TYPE_LABELS[type]}</p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {type === 'SOLVE_COUNT'
                                  ? '해당 기간의 해결 문제 수를 목표로 설정합니다.'
                                  : type === 'ATTENDANCE'
                                    ? '기간 동안 출석한 일수를 자동 목표로 추적합니다.'
                                    : '선택한 난이도의 해결 문제 수를 추적합니다.'}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {goalForm.period === 'custom' && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">커스텀 기간</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={goalForm.customDays ?? 1}
                            onChange={(event) => setGoalForm((prev) => ({ ...prev, customDays: Math.max(1, Number(event.target.value) || 1) }))}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-blue-400/80 dark:focus:bg-white/10"
                          />
                          <span className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                            day
                          </span>
                        </div>
                      </div>
                    )}

                    {goalForm.type === 'TIER_SOLVE' && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">난이도</p>
                        <div className="grid grid-cols-3 gap-2">
                          {GOAL_DIFFICULTY_OPTIONS.map((difficulty) => {
                            const selected = goalForm.difficulty === difficulty;
                            return (
                              <button
                                key={difficulty}
                                type="button"
                                onClick={() => setGoalForm((prev) => ({ ...prev, difficulty }))}
                                className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                                  selected
                                    ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/70 dark:bg-violet-500/20 dark:text-violet-100'
                                    : 'border-gray-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                                }`}
                              >
                                {formatGoalDifficulty(difficulty)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {goalForm.type === 'ATTENDANCE' ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                        출석 목표는 기간 길이에 맞춰 자동 설정됩니다. 현재 목표: {getGoalResolvedTarget(goalForm)} day
                      </div>
                    ) : (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">목표 수치</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            value={goalForm.target}
                            onChange={(event) => setGoalForm((prev) => ({ ...prev, target: Math.max(1, Number(event.target.value) || 1) }))}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-blue-400/80 dark:focus:bg-white/10"
                          />
                          <span className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                            {getGoalUnit(goalForm.type)}
                          </span>
                        </div>
                      </div>
                    )}

                    {goalFormError && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">
                        {goalFormError}
                      </div>
                    )}

                    {goalSaveError && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">
                        {goalSaveError}
                      </div>
                    )}

                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-white/8 dark:bg-white/5">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">미리보기</p>
                      <h4 className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{getGoalLabel(goalForm)}</h4>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        목표 수치 {getGoalResolvedTarget(goalForm)} {getGoalUnit(goalForm.type)}
                        {goalForm.type === 'TIER_SOLVE' && goalForm.difficulty ? ` · 난이도 ${formatGoalDifficulty(goalForm.difficulty)}` : ''}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) {
            setView('list');
            setGoalSaveError(null);
          }
        }}
        className="fixed bottom-5 right-4 z-[100001] flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-900 shadow-[0_18px_38px_rgba(15,23,42,0.22)] transition hover:scale-[1.02] hover:bg-slate-50 dark:border-slate-700 dark:bg-[#2f333b] dark:text-white dark:shadow-[0_18px_38px_rgba(15,23,42,0.45)] dark:hover:bg-[#383d47] sm:bottom-6 sm:right-6"
        aria-label={isOpen ? '학습 목표 패널 닫기' : '학습 목표 패널 열기'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 17v-2.586a1 1 0 00-.293-.707L5.414 10.414A2 2 0 015 9V5a2 2 0 012-2h10a2 2 0 012 2v4a2 2 0 01-.414 1.414l-3.293 3.293a1 1 0 00-.293.707V17m-6 0h6m-6 0a2 2 0 002 2h2a2 2 0 002-2" />
            </svg>
            {goals.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[11px] font-bold text-white">
                {goals.length}
              </span>
            )}
          </>
        )}
      </button>
    </>
  );
};
