import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { todoService, UserTodo } from '../../services/todoService';
import { Button } from '../atoms/Button';

interface GoalConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTodo: UserTodo | null;
}

export const GoalConfigModal: React.FC<GoalConfigModalProps> = ({ isOpen, onClose, currentTodo }) => {
    const queryClient = useQueryClient();
    const [dayTodo, setDayTodo] = useState<string>('');
    const [weekTodo, setWeekTodo] = useState<string>('');
    const [monthTodo, setMonthTodo] = useState<string>('');

    const { data: recommendations } = useQuery({
        queryKey: ['todo', 'recommendations'],
        queryFn: todoService.getRecommendations,
        enabled: isOpen,
    });

    useEffect(() => {
        if (currentTodo) {
            setDayTodo(currentTodo.day_todo || '');
            setWeekTodo(currentTodo.week_todo || '');
            setMonthTodo(currentTodo.month_todo || '');
        } else if (recommendations) {
            // Default to first option if nothing set? Or keep empty.
        }
    }, [currentTodo, isOpen]);

    const mutation = useMutation({
        mutationFn: todoService.setMyTodo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['todo', 'my'] });
            onClose();
        },
    });

    const handleSave = () => {
        mutation.mutate({
            day_todo: dayTodo,
            week_todo: weekTodo,
            month_todo: monthTodo,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">학습 목표 설정</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Daily */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            일간 목표 (Daily Goal)
                        </label>
                        <select
                            value={dayTodo}
                            onChange={(e) => setDayTodo(e.target.value)}
                            className="w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        >
                            <option value="">목표를 선택하세요</option>
                            {recommendations?.daily.map((goal) => (
                                <option key={goal.id} value={goal.id}>
                                    {goal.label} (Target: {goal.target} {goal.unit})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Weekly */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            주간 목표 (Weekly Goal)
                        </label>
                        <select
                            value={weekTodo}
                            onChange={(e) => setWeekTodo(e.target.value)}
                            className="w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        >
                            <option value="">목표를 선택하세요</option>
                            {recommendations?.weekly.map((goal) => (
                                <option key={goal.id} value={goal.id}>
                                    {goal.label} (Target: {goal.target} {goal.unit})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Monthly */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            월간 목표 (Monthly Goal)
                        </label>
                        <select
                            value={monthTodo}
                            onChange={(e) => setMonthTodo(e.target.value)}
                            className="w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        >
                            <option value="">목표를 선택하세요</option>
                            {recommendations?.monthly.map((goal) => (
                                <option key={goal.id} value={goal.id}>
                                    {goal.label} (Target: {goal.target} {goal.unit})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-slate-700/30 px-6 py-4 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>취소</Button>
                    <Button onClick={handleSave} disabled={mutation.isPending}>
                        {mutation.isPending ? '저장 중...' : '저장하기'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
