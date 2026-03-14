import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProblemRegistrationModal } from '../features/contribution/components/ProblemRegistrationModal';
import { WorkbookRegistrationModal } from '../features/contribution/components/WorkbookRegistrationModal';
import { useAuthStore } from '../stores/authStore';
import { contributionService } from '../services/contributionService';
import { adminService } from '../services/adminService';
import { Problem, Workbook } from '../types';
import { ProblemListTable } from '../features/contribution/components/ProblemListTable';
import { WorkbookListTable } from '../features/contribution/components/WorkbookListTable';
import CommonPagination from '../components/common/CommonPagination';
import { pendingService } from '../services/pendingService';

export const ContributionPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'problems' | 'workbooks'>('problems');
    const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
    const [isWorkbookModalOpen, setIsWorkbookModalOpen] = useState(false);
    const { isAuthenticated } = useAuthStore();

    React.useEffect(() => {
        if (!isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const [problems, setProblems] = useState<Problem[]>([]);
    const [workbooks, setWorkbooks] = useState<Workbook[]>([]);
    const [selectedProblem, setSelectedProblem] = useState<Problem | undefined>(undefined);
    const [selectedWorkbook, setSelectedWorkbook] = useState<Workbook | undefined>(undefined);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 20;
    const [isLoading, setIsLoading] = useState(true);

    const fetchProblems = async () => {
        setIsLoading(true);
        try {
            const [data, statusMap] = await Promise.all([
                contributionService.getContributedProblems(page, pageSize),
                pendingService.getProblemStatuses().catch(() => ({} as Record<number, any>)),
            ]);

            const mergedProblems = (data.data || []).map((problem) => {
                const pending = statusMap[problem.id];
                return {
                    ...problem,
                    approvalStatus: pending?.status ?? 'approved',
                    approvalReason: pending?.reason ?? null,
                };
            });

            setProblems(mergedProblems);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error('Failed to fetch problems:', error);

        } finally {
            setIsLoading(false);
        }
    };

    const fetchWorkbooks = async () => {
        setIsLoading(true);
        try {
            const [data, statusMap] = await Promise.all([
                contributionService.getContributedWorkbooks(page, pageSize),
                pendingService.getWorkbookStatuses().catch(() => ({} as Record<number, any>)),
            ]);

            const mergedWorkbooks = (data.data || []).map((workbook) => {
                const pending = statusMap[workbook.id];
                return {
                    ...workbook,
                    approvalStatus: pending?.status ?? 'approved',
                    approvalReason: pending?.reason ?? null,
                };
            });

            setWorkbooks(mergedWorkbooks);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error('Failed to fetch workbooks:', error);

        } finally {
            setIsLoading(false);
        }
    };

    const handleEditWorkbook = (workbook: Workbook) => {
        setSelectedWorkbook(workbook);
        setIsWorkbookModalOpen(true);
    };

    const handleEditProblem = (problem: Problem) => {
        setSelectedProblem(problem);
        setIsProblemModalOpen(true);
    };

    const handleDeleteProblem = async (problemId: number) => {
        if (!window.confirm('정말로 이 문제를 삭제하시겠습니까?')) return;

        try {
            await adminService.deleteProblem(problemId);
            fetchProblems();
        } catch (error) {
            console.error('Failed to delete problem:', error);
            alert('문제 삭제에 실패했습니다.');
        }
    };

    const handleDeleteWorkbook = async (workbookId: number) => {
        if (!window.confirm('정말로 이 문제집을 삭제하시겠습니까?')) return;

        try {
            await adminService.deleteWorkbook(workbookId);
            fetchWorkbooks();
        } catch (error) {
            console.error('Failed to delete workbook:', error);
            alert('문제집 삭제에 실패했습니다.');
        }
    };

    React.useEffect(() => {
        if (isAuthenticated) {
            if (activeTab === 'problems') {
                fetchProblems();
            } else {
                fetchWorkbooks();
            }
        }
    }, [isAuthenticated, activeTab, page]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-screen-2xl 2xl:px-10 py-8 flex flex-col md:flex-row gap-8">

                {/* Mobile Nav Placeholder */}
                <div className="md:hidden mb-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="font-bold">기여</span>
                </div>

                {/* Sidebar */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 dark:border-slate-800 overflow-hidden sticky top-24">
                        <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">기여</h2>
                        </div>
                        <nav className="p-2 space-y-1">
                            <button
                                onClick={() => setActiveTab('problems')}
                                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'problems'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-sky-900/30 dark:text-sky-300'
                                    : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                                문제 목록
                            </button>
                            <button
                                onClick={() => setActiveTab('workbooks')}
                                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'workbooks'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-sky-900/30 dark:text-sky-300'
                                    : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                문제집 목록
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    <div className="mb-10">
                        <nav className="flex text-sm text-gray-500 dark:text-slate-400 dark:text-slate-400 mb-2">
                            <span className="cursor-pointer hover:text-gray-900 dark:hover:text-slate-100" onClick={() => navigate('/contribution')}>Contribute</span>
                            <span className="mx-2">/</span>
                            <span className="font-medium text-gray-900 dark:text-slate-100">{activeTab === 'problems' ? 'Problem' : 'Workbook'}</span>
                        </nav>
                    </div>

                    <div className="space-y-6">
                        {isLoading ? (
                            <div className="animate-pulse bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex justify-between items-center">
                                    <div className="h-6 w-36 rounded bg-gray-200 dark:bg-slate-700" />
                                    <div className="h-9 w-24 rounded bg-gray-200 dark:bg-slate-700" />
                                </div>
                                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                                    {Array.from({ length: 7 }).map((_, idx) => (
                                        <div key={`contrib-skeleton-${idx}`} className="px-6 py-4 flex items-center justify-between gap-4">
                                            <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-700" />
                                            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-slate-700" />
                                        </div>
                                    ))}
                                </div>
                                <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700">
                                    <div className="h-4 w-28 rounded bg-gray-200 dark:bg-slate-700" />
                                </div>
                            </div>
                        ) : activeTab === 'problems' ? (
                            <ProblemListTable
                                title="내 문제 목록"
                                actionLabel="문제 등록"
                                problems={problems}
                                onCreate={() => {
                                    setSelectedProblem(undefined);
                                    setIsProblemModalOpen(true);
                                }}
                                onEdit={handleEditProblem}
                                onDelete={handleDeleteProblem}
                            />
                        ) : (
                            <WorkbookListTable
                                title="내 문제집 목록"
                                actionLabel="문제집 등록"
                                workbooks={workbooks}
                                onCreate={() => {
                                    setSelectedWorkbook(undefined);
                                    setIsWorkbookModalOpen(true);
                                }}
                                onEdit={handleEditWorkbook}
                                onDelete={handleDeleteWorkbook}
                            />
                        )}
                        <CommonPagination
                            page={page}
                            pageSize={pageSize}
                            totalPages={totalPages}
                            onChangePage={handlePageChange}
                        />

                        {isProblemModalOpen && (
                            <ProblemRegistrationModal
                                isOpen={isProblemModalOpen}
                                onClose={() => {
                                    setIsProblemModalOpen(false);
                                    setSelectedProblem(undefined);
                                }}
                                onSuccess={() => {
                                    fetchProblems();
                                    setIsProblemModalOpen(false);
                                    setSelectedProblem(undefined);
                                }}
                                editProblemId={selectedProblem?.id}
                            />
                        )}

                        {isWorkbookModalOpen && (
                            <WorkbookRegistrationModal
                                isOpen={isWorkbookModalOpen}
                                onClose={() => {
                                    setIsWorkbookModalOpen(false);
                                    setSelectedWorkbook(undefined);
                                }}
                                onSuccess={() => {
                                    fetchWorkbooks();
                                    setIsWorkbookModalOpen(false);
                                    setSelectedWorkbook(undefined);
                                }}
                                initialData={selectedWorkbook}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
