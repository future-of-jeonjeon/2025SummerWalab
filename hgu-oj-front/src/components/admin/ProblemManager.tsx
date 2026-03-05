import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { ProblemRegistrationModal } from '../../features/contribution/components/ProblemRegistrationModal';
import { ProblemListTable } from '../../features/contribution/components/ProblemListTable';
import { adminService } from '../../services/adminService';
import { Problem } from '../../types';
import CommonPagination from '../common/CommonPagination';

export const ProblemManager: React.FC = () => {
    const [problemList, setProblemList] = useState<Problem[]>([]);
    const [problemListLoading, setProblemListLoading] = useState(false);
    const [problemListError, setProblemListError] = useState<string | null>(null);
    const [problemPage, setProblemPage] = useState(1);
    const [problemTotal, setProblemTotal] = useState(0);
    const [problemSearchKeyword, setProblemSearchKeyword] = useState('');
    const problemSearchTimerRef = useRef<number | null>(null);
    const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
    const [editingProblemId, setEditingProblemId] = useState<number | undefined>(undefined);

    const fetchProblems = useCallback(async (page: number = 1, keyword: string = '') => {
        setProblemListLoading(true);
        setProblemListError(null);
        try {
            const { results, total } = await adminService.getAdminProblemList({
                keyword,
                limit: 20,
                offset: (page - 1) * 20,
            });
            setProblemList(results);
            setProblemTotal(total);
            setProblemPage(page);
        } catch {
            setProblemListError('문제 목록을 불러오지 못했습니다.');
        } finally {
            setProblemListLoading(false);
        }
    }, []);

    const handleProblemSearchChange = (value: string) => {
        setProblemSearchKeyword(value);
        if (problemSearchTimerRef.current) clearTimeout(problemSearchTimerRef.current);
        problemSearchTimerRef.current = window.setTimeout(() => {
            fetchProblems(1, value);
        }, 300);
    };

    const handleOpenProblemModal = (mode: 'create' | 'edit', problemId?: number) => {
        if (mode === 'edit' && problemId) {
            setEditingProblemId(problemId);
        } else {
            setEditingProblemId(undefined);
        }
        setIsProblemModalOpen(true);
    };

    const handleDeleteProblem = async (id: number, title: string) => {
        if (!window.confirm(`'${title}' 문제를 삭제하시겠습니까?`)) return;
        try {
            await adminService.deleteProblem(id);
            fetchProblems(problemPage, problemSearchKeyword);
        } catch (error) {
            alert(error instanceof Error ? error.message : '삭제 실패');
        }
    };

    useEffect(() => {
        fetchProblems(1, problemSearchKeyword);
    }, [fetchProblems]);

    return (
        <Card padding="lg">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 dark:text-slate-100">문제 목록</h2>
                    </div>
                    <Button
                        onClick={() => handleOpenProblemModal('create')}
                    >
                        <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        문제 등록
                    </Button>
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="문제 검색 (ID, 제목)"
                        value={problemSearchKeyword}
                        onChange={(e) => handleProblemSearchChange(e.target.value)}
                    />
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    {problemListLoading ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">로딩 중...</div>
                    ) : problemListError ? (
                        <div className="px-4 py-8 text-center text-sm text-red-600">{problemListError}</div>
                    ) : (
                        <>
                            <ProblemListTable
                                showHeader={false}
                                problems={problemList}
                                onEdit={(problem) => handleOpenProblemModal('edit', problem.id)}
                                onDelete={(problemId) => {
                                    const target = problemList.find((problem) => problem.id === problemId);
                                    if (target) {
                                        void handleDeleteProblem(problemId, target.title);
                                    }
                                }}
                            />
                            <div className="px-4 py-4 border-t border-gray-200 dark:border-slate-700">
                                <CommonPagination
                                    page={problemPage}
                                    pageSize={20}
                                    totalItems={problemTotal}
                                    onChangePage={(nextPage) => fetchProblems(nextPage, problemSearchKeyword)}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
            <ProblemRegistrationModal
                isOpen={isProblemModalOpen}
                onClose={() => {
                    setIsProblemModalOpen(false);
                    setEditingProblemId(undefined);
                }}
                onSuccess={() => fetchProblems(problemPage, problemSearchKeyword)}
                editProblemId={editingProblemId}
            />
        </Card>
    );
};
