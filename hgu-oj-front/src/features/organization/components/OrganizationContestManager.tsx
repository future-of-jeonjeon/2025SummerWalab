import React, { useState, useEffect } from 'react';
import { Contest } from '../../../types';
import { Button } from '../../../components/atoms/Button';
import { contestService } from '../../../services/contestService';
import { CreateContestModal } from './CreateContestModal';
import { useParams } from 'react-router-dom';
import CommonPagination from '../../../components/common/CommonPagination';

export const OrganizationContestManager: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const organizationId = parseInt(id || '0', 10);
    const [contests, setContests] = useState<Contest[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const pageSize = 10;

    // Edit state
    const [selectedContest, setSelectedContest] = useState<Contest | undefined>(undefined);

    const fetchContests = async () => {
        if (!organizationId) return;
        setIsLoading(true);
        try {
            const response = await contestService.getOrganizationContests(organizationId, { page, limit: pageSize });
            setContests(response.data);
            setTotalItems(response.total);
            setTotalPages(response.totalPages);
        } catch (error) {
            console.error('Failed to fetch contests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchContests();
    }, [organizationId, page]);

    const handleCreateSuccess = () => {
        setIsCreateModalOpen(false);
        alert(selectedContest ? '대회가 수정되었습니다.' : '대회가 생성되었습니다.');
        fetchContests();
    };

    const handleDelete = async (contestId: number) => {
        if (!window.confirm('정말 이 대회를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            return;
        }

        try {
            await contestService.delete(contestId);
            fetchContests();
        } catch (error) {
            console.error('Failed to delete contest:', error);
            alert('대회 삭제에 실패했습니다.');
        }
    };

    const handleEditClick = (contest: Contest) => {
        setSelectedContest(contest);
        setIsCreateModalOpen(true);
    };

    const handleCreateClick = () => {
        setSelectedContest(undefined);
        setIsCreateModalOpen(true);
    };

    const getContestStatus = (start: string, end: string) => {
        const now = new Date();
        const startTime = new Date(start);
        const endTime = new Date(end);

        if (now < startTime) return 'Upcoming';
        if (now >= startTime && now < endTime) return 'Running';
        return 'Ended';
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Running':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        진행중
                    </span>
                );
            case 'Upcoming':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                        시작전
                    </span>
                );
            case 'Ended': default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700">
                        <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                        종료
                    </span>
                );
        }
    };

    const formatDateRange = (start: string | undefined, end: string | undefined) => {
        const formatDate = (dateStr: string) => {
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}.${month}.${day} ${hours}:${minutes}`;
        };
        return (
            <div className="flex flex-col text-xs text-gray-500 dark:text-slate-400 font-mono">
                <span>{formatDate(start as string)}</span>
                <span className="text-gray-300 dark:text-slate-600 rotate-90 w-3 h-3 flex items-center justify-center">|</span>
                <span>{formatDate(end as string)}</span>
            </div>
        );
    };

    return (
        <div className="space-y-8 p-6 max-w-7xl mx-auto">
            <div className="flex justify-end gap-4">
                <Button
                    onClick={handleCreateClick}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                >
                    <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    대회 생성
                </Button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden ring-1 ring-black ring-opacity-5">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-gray-50/50 dark:bg-slate-800">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    대회 정보
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    상태
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    기간
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    참가자
                                </th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    관리
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700 dark:divide-slate-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                            <span className="text-sm">대회를 불러오는 중입니다...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {contests.map((contest) => (
                                        <tr
                                            key={contest.id}
                                            className="hover:bg-gray-50/80 dark:hover:bg-slate-800 transition-colors duration-150 ease-in-out group"
                                        >
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                                                        {contest.title}
                                                    </span>
                                                    {contest.description && (
                                                        <span className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">
                                                            {contest.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                {getStatusBadge(getContestStatus(contest.startTime, contest.endTime))}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                {formatDateRange(contest.startTime, contest.endTime)}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center text-sm text-gray-500 dark:text-slate-400">
                                                    <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                    </svg>
                                                    {contest.participants.toLocaleString()}명
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditClick(contest)}
                                                        className="text-gray-400 dark:text-slate-500 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                                                        title="대회 수정"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(contest.id)}
                                                        className="text-gray-400 dark:text-slate-500 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        title="대회 삭제"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {contests.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-16 text-center text-gray-500 dark:text-slate-400">
                                                <div className="flex flex-col items-center justify-center space-y-3">
                                                    <svg className="h-12 w-12 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                    </svg>
                                                    <p className="text-gray-500 dark:text-slate-400 font-medium">등록된 대회가 없습니다.</p>
                                                    {/* <Button onClick={handleCreateClick} variant="outline" size="sm" className="mt-2">
                                                        첫 대회 생성하기
                                                    </Button> */}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {!isLoading && totalPages > 0 && (
                <div className="flex justify-center mt-6">
                    <CommonPagination
                        page={page}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        onPrevious={() => setPage(Math.max(1, page - 1))}
                        onNext={() => setPage(Math.min(totalPages, page + 1))}
                        unit="개"
                    />
                </div>
            )}

            {isCreateModalOpen && (
                <CreateContestModal
                    isOpen={isCreateModalOpen}
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        setSelectedContest(undefined);
                    }}
                    organizationId={organizationId}
                    onSuccess={handleCreateSuccess}
                    initialData={selectedContest}
                />
            )}
        </div>
    );
};
