import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/atoms/Button';
import { ProblemRegistrationModal } from '../features/contribution/components/ProblemRegistrationModal';
import { WorkbookRegistrationModal } from '../features/contribution/components/WorkbookRegistrationModal';
import { useAuthStore } from '../stores/authStore';
import { contributionService } from '../services/contributionService';
import { adminService } from '../services/adminService';
import { Problem, Workbook } from '../types';

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
    const [selectedWorkbook, setSelectedWorkbook] = useState<Workbook | undefined>(undefined);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 20;

    const fetchProblems = async () => {

        try {
            const data = await contributionService.getContributedProblems(page, pageSize);
            setProblems(data.data || []);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error('Failed to fetch problems:', error);

        }
    };

    const fetchWorkbooks = async () => {

        try {
            const data = await contributionService.getContributedWorkbooks(page, pageSize);
            setWorkbooks(data.data || []);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error('Failed to fetch workbooks:', error);

        }
    };

    const handleEditWorkbook = (workbook: Workbook) => {
        setSelectedWorkbook(workbook);
        setIsWorkbookModalOpen(true);
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
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-screen-2xl 2xl:px-10 py-8 flex flex-col md:flex-row gap-8">

                {/* Mobile Nav Placeholder */}
                <div className="md:hidden mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <span className="font-bold">기여 관리</span>
                </div>

                {/* Sidebar */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                        <div className="p-6 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-900">기여 관리</h2>
                        </div>
                        <nav className="p-2 space-y-1">
                            <button
                                onClick={() => setActiveTab('problems')}
                                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'problems'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                                문제 등록
                            </button>
                            <button
                                onClick={() => setActiveTab('workbooks')}
                                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'workbooks'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                문제집 등록
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    <div className="mb-10">
                        <nav className="text-sm text-gray-500 mb-2">
                            <span className="cursor-pointer" onClick={() => navigate('/')}>Home</span> &gt;
                            <span className="font-medium text-gray-900"> Contribution</span>
                        </nav>
                        <h1 className="text-3xl font-extrabold text-gray-900">
                            {activeTab === 'problems' ? '문제 등록' : '문제집 등록'}
                        </h1>
                    </div>

                    <div className="space-y-6">
                        {activeTab === 'problems' ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                    <h3 className="text-lg font-medium text-gray-900">내 문제 목록</h3>
                                    <Button
                                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                                        onClick={() => setIsProblemModalOpen(true)}
                                    >
                                        <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        문제 등록
                                    </Button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제목</th>
                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">난이도</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {problems.map((problem) => (
                                                <tr key={problem.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{problem.title}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{problem.difficulty}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        <Button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>Previous</Button>
                                        <Button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>Next</Button>
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                <Button
                                                    onClick={() => handlePageChange(page - 1)}
                                                    disabled={page === 1}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                                >
                                                    <span className="sr-only">Previous</span>
                                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </Button>
                                                <Button
                                                    onClick={() => handlePageChange(page + 1)}
                                                    disabled={page === totalPages}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                                >
                                                    <span className="sr-only">Next</span>
                                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </Button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                    <h3 className="text-lg font-medium text-gray-900">내 문제집 목록</h3>
                                    <Button
                                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                                        onClick={() => {
                                            setSelectedWorkbook(undefined);
                                            setIsWorkbookModalOpen(true);
                                        }}
                                    >
                                        <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        문제집 등록
                                    </Button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제목</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">문제 수</th>

                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {workbooks.map((workbook) => (
                                                <tr key={workbook.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{workbook.title}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{workbook.problemCount || 0}개</td>

                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            className="text-gray-400 hover:text-indigo-600 mr-3 transition-colors"
                                                            title="수정"
                                                            onClick={() => handleEditWorkbook(workbook)}
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            className="text-gray-400 hover:text-red-600 transition-colors"
                                                            title="삭제"
                                                            onClick={() => handleDeleteWorkbook(workbook.id)}
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        <Button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>Previous</Button>
                                        <Button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>Next</Button>
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                <Button
                                                    onClick={() => handlePageChange(page - 1)}
                                                    disabled={page === 1}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                                >
                                                    <span className="sr-only">Previous</span>
                                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </Button>
                                                <Button
                                                    onClick={() => handlePageChange(page + 1)}
                                                    disabled={page === totalPages}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                                >
                                                    <span className="sr-only">Next</span>
                                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </Button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isProblemModalOpen && (
                            <ProblemRegistrationModal
                                isOpen={isProblemModalOpen}
                                onClose={() => setIsProblemModalOpen(false)}
                                onSuccess={() => {
                                    fetchProblems();
                                    setIsProblemModalOpen(false);
                                }}
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
