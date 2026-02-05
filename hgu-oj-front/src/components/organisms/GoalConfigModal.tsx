import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { todoService, UserTodo, GoalRecommendation } from '../../services/todoService';
import { Button } from '../atoms/Button';

interface GoalConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTodo: UserTodo | null;
}

type TabType = 'daily' | 'weekly' | 'monthly' | 'custom';

interface TabState {
    isActive: boolean;
    category: string;
    target: number;
    unit: string;
    label: string;
}

export const GoalConfigModal: React.FC<GoalConfigModalProps> = ({ isOpen, onClose, currentTodo }) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabType>('daily');

    // States for each period
    const [daily, setDaily] = useState<TabState>({ isActive: true, category: 'SOLVE_COUNT', target: 1, unit: 'problem', label: '하루 1문제 풀기' });
    const [weekly, setWeekly] = useState<TabState>({ isActive: true, category: 'STREAK', target: 3, unit: 'day', label: '3일 연속 학습 유지' });
    const [monthly, setMonthly] = useState<TabState>({ isActive: true, category: 'TIER_SOLVE', target: 3, unit: 'problem', label: 'Bronze 문제 3개 풀기' });
    const [custom, setCustom] = useState<TabState & { startDate: string, endDate: string }>({
        isActive: true, category: 'PROBLEM_SOLVE', target: 10, unit: 'problem', label: '사용자 정의 목표',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
    });

    const { data: recommendations } = useQuery({
        queryKey: ['todo', 'recommendations'],
        queryFn: todoService.getRecommendations,
        enabled: isOpen,
    });

    const parseGoal = (val: string | null | undefined, defaults: TabState, type: TabType): TabState => {
        if (!val) return { ...defaults, isActive: false };
        if (val.startsWith('CUSTOM:')) {
            const parts = val.split(':');
            const state = {
                isActive: true,
                category: parts[1],
                target: parseInt(parts[2]) || 1,
                unit: parts[3] || 'problem',
                label: parts[4] || '사용자 지정 목표'
            };
            if (type === 'custom' && parts[5] && parts[6]) {
                setTimeout(() => {
                    setCustom(prev => ({ ...prev, ...state, startDate: parts[5], endDate: parts[6] }));
                }, 0);
            }
            return state;
        }
        if (recommendations) {
            const pool = recommendations[type === 'custom' ? 'daily' : type] as GoalRecommendation[];
            const found = pool?.find(r => r.id === val);
            if (found) {
                return {
                    isActive: true,
                    category: found.type,
                    target: found.target,
                    unit: found.unit,
                    label: found.label
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

    const mutation = useMutation({
        mutationFn: todoService.setMyTodo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['todo', 'my'] });
            onClose();
        },
    });

    const stringifyGoal = (state: TabState, type: TabType) => {
        if (!state.isActive) return "";
        let base = `CUSTOM:${state.category}:${state.target}:${state.unit}:${state.label}`;
        if (type === 'custom') {
            base += `:${custom.startDate}:${custom.endDate}`;
        }
        return base;
    };

    const handleSave = () => {
        mutation.mutate({
            day_todo: stringifyGoal(daily, 'daily'),
            week_todo: stringifyGoal(weekly, 'weekly'),
            month_todo: stringifyGoal(monthly, 'monthly'),
            custom_todo: stringifyGoal(custom, 'custom'),
        });
    };

    if (!isOpen) return null;

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
            const nextCustom = updater(custom as TabState) as TabState & { startDate: string, endDate: string };
            setCustom({ ...custom, ...nextCustom });
        }
    };

    const currentState = getState(activeTab);

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 h-screen w-screen overflow-hidden">
            <div
                className="bg-white dark:bg-slate-800 rounded-[28px] w-full max-w-4xl shadow-2xl overflow-hidden flex h-[620px] relative border border-gray-100 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button - Clean and prominent */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all z-[100] p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"
                    title="닫기"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                {/* Left Sidebar */}
                <div className="w-64 bg-gray-50/50 dark:bg-slate-900 border-r border-gray-100 dark:border-slate-700 flex flex-col pt-8">
                    <div className="px-6 mb-10">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">학습 목표 설정</h3>
                    </div>

                    <nav className="flex-1 space-y-2 px-4">
                        {(['daily', 'weekly', 'monthly', 'custom'] as TabType[]).map((tab) => {
                            const isActive = activeTab === tab;
                            const state = getState(tab);

                            return (
                                <div
                                    key={tab}
                                    className={`group flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 ${isActive
                                        ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-slate-700'
                                        : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100/50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <button
                                        onClick={() => setActiveTab(tab)}
                                        className="flex-1 flex items-center gap-4"
                                    >
                                        <div className={`${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                                            {renderTabIcon(tab)}
                                        </div>
                                        <span className={`text-[15px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                                            {tab === 'daily' && '일간'}
                                            {tab === 'weekly' && '주간'}
                                            {tab === 'monthly' && '월간'}
                                            {tab === 'custom' && '사용자 정의'}
                                        </span>
                                    </button>

                                    {/* Toggle Switch */}
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

                {/* Right Content */}
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 relative">
                    <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                        <div className="space-y-10">
                            {/* Date Range (Custom only) */}
                            {activeTab === 'custom' && (
                                <div className="space-y-4">
                                    <h4 className="text-[17px] font-bold text-gray-900 dark:text-white">기간 설정</h4>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 relative">
                                            <input
                                                type="date"
                                                value={custom.startDate}
                                                onChange={(e) => setCustom({ ...custom, startDate: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-5 py-2 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm pl-12"
                                            />
                                            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <span className="text-gray-300">~</span>
                                        <div className="flex-1 relative">
                                            <input
                                                type="date"
                                                value={custom.endDate}
                                                onChange={(e) => setCustom({ ...custom, endDate: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-5 py-2 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm pl-12"
                                            />
                                            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Category Selection */}
                            <div className="space-y-4">
                                <h4 className="text-[17px] font-bold text-gray-900 dark:text-white">1. 주요 목표 선택</h4>
                                <div className="relative">
                                    <select
                                        value={currentState.category}
                                        onChange={(e) => updateState(activeTab, { category: e.target.value })}
                                        className="w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-5 py-2 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none cursor-pointer"
                                    >
                                        <option value="SOLVE_COUNT">문제 해결</option>
                                        {activeTab !== 'daily' && <option value="STREAK">연속 출석</option>}
                                        <option value="TIER_SOLVE">난이도 목표</option>
                                        {activeTab === 'custom' && <option value="PROBLEM_SOLVE">기타 과제</option>}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Difficulty Selection */}
                            {currentState.category === 'TIER_SOLVE' && (
                                <div className="space-y-4 animate-fadeIn">
                                    <label className="text-[15px] font-bold text-gray-700 dark:text-gray-300">난이도 선택</label>
                                    <select
                                        value={currentState.label.split(' ')[0]}
                                        onChange={(e) => updateState(activeTab, { label: e.target.value + ' 문제 ' + currentState.target + '개 풀기' })}
                                        className="w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-5 py-2 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm"
                                    >
                                        <option value="Bronze">Bronze</option>
                                        <option value="Mid">Mid</option>
                                        <option value="Gold">Gold</option>
                                    </select>
                                </div>
                            )}

                            {/* Number Setting */}
                            <div className="space-y-4">
                                <h4 className="text-[17px] font-bold text-gray-900 dark:text-white">2. 세부 목표 설정</h4>
                                <div className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 flex items-center gap-5">
                                    <input
                                        type="number"
                                        value={currentState.target === 0 ? '' : currentState.target}
                                        onChange={(e) => updateState(activeTab, { target: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                                        className="w-20 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-lg font-bold text-center text-blue-600 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="0"
                                    />
                                    <span className="text-[15px] font-bold text-gray-700 dark:text-gray-300 leading-tight">
                                        {currentState.category === 'STREAK' ? '일 동안 학습을 진행하겠습니다.' : '문제를 해결하겠습니다.'}
                                    </span>
                                </div>
                            </div>


                            {/* Recommended Goals List */}
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
                                                        label: goal.label
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
                                                {currentState.target === goal.target && currentState.category === goal.type && currentState.label === goal.label && (
                                                    <div className="text-blue-600">
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 pb-10 flex justify-end items-center gap-6 border-t border-gray-50 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <button
                            onClick={onClose}
                            className="text-[15px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                            취소
                        </button>
                        <Button
                            onClick={handleSave}
                            disabled={mutation.isPending}
                            className="bg-[#667EEA] hover:bg-[#5A67D8] text-white rounded-2xl px-8 py-2.5 shadow-[0_4px_12px_rgba(102,126,234,0.25)] active:transform active:scale-95 transition-all text-[15px] font-bold"
                        >
                            {mutation.isPending ? '저장 중...' : '저장하기'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
