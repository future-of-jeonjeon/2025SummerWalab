import React, { useEffect, useState } from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { organizationService } from '../../services/organizationService';
import { OrganizationApplication, OrganizationApplicationStatus } from '../../types';

export const OrganizationApplyManager: React.FC = () => {
    const [applies, setApplies] = useState<OrganizationApplication[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedApply, setSelectedApply] = useState<OrganizationApplication | null>(null);

    const fetchApplies = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await organizationService.getApplies();
            setApplies(data);
        } catch (err) {
            setError('신청 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplies();
    }, []);

    const handleAction = async (id: string, name: string, status: OrganizationApplicationStatus) => {
        const actionText = status === 'APPROVED' ? '승인' : '반려';

        if (!window.confirm(`${name} 단체 신청을 ${actionText}하시겠습니까?`)) return;

        try {
            await organizationService.handleApply(id, {
                status,
                admin_comment: undefined
            });
            alert(`성공적으로 ${actionText}되었습니다.`);
            setSelectedApply(null);
            fetchApplies();
        } catch (err) {
            alert('처리 중 오류가 발생했습니다.');
        }
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(new Date(dateString));
    };

    const calculateTimeRemaining = (createdAt: string) => {
        const createdDate = new Date(createdAt);
        const expiryDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later
        const now = new Date();
        const diffMs = expiryDate.getTime() - now.getTime();

        if (diffMs <= 0) return '만료됨';

        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        const diffHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        return `${diffDays}일 ${diffHours}시간 남음`;
    };

    return (
        <Card padding="lg">
            <div className="space-y-6">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 dark:text-slate-100">단체 신청 관리</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">단체 신청을 관리합니다.</p>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">신청자</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">단체 이름</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">신청일자</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">남은 시간</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">액션</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-slate-400">로딩 중...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-red-600">{error}</td></tr>
                            ) : applies.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-slate-400">대기 중인 신청이 없습니다.</td></tr>
                            ) : (
                                applies.map((apply) => (
                                    <tr
                                        key={apply.id}
                                        className="hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                        onClick={() => setSelectedApply(apply)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">{apply.applicant_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#113F67]">{apply.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                                            {formatDate(apply.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${calculateTimeRemaining(apply.created_at) === '만료됨'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-green-100 text-green-800'
                                                }`}>
                                                {calculateTimeRemaining(apply.created_at)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size="sm"
                                                onClick={() => handleAction(apply.id, apply.name, 'APPROVED')}
                                            >
                                                승인
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-600 border-red-200 hover:bg-red-50"
                                                onClick={() => handleAction(apply.id, apply.name, 'REJECTED')}
                                            >
                                                반려
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 상세 정보 모달 */}
            {selectedApply && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" padding="lg">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b pb-4">
                                <h3 className="text-xl font-bold text-[#113F67]">단체 신청 상세 정보</h3>
                                <button
                                    onClick={() => setSelectedApply(null)}
                                    className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-400 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">신청자</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{selectedApply.applicant_name}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">단체 이름</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{selectedApply.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">신청 일시</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{formatDate(selectedApply.created_at)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">만료까지 남은 시간</p>
                                    <p className="text-sm font-medium text-green-700">{calculateTimeRemaining(selectedApply.created_at)}</p>
                                </div>
                            </div>

                            <div className="space-y-2 border-t pt-4">
                                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">단체 설명 / 신청 사유</p>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                    {selectedApply.description || '작성된 내용이 없습니다.'}
                                </div>
                            </div>

                            {selectedApply.img_url && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">로고 이미지</p>
                                    <div className="bg-gray-100 rounded-lg p-2 inline-block">
                                        <img
                                            src={selectedApply.img_url}
                                            alt="Organization Logo"
                                            className="max-h-48 rounded object-contain"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6 border-t font-semibold">
                                <Button
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => handleAction(selectedApply.id, selectedApply.name, 'REJECTED')}
                                >
                                    반려하기
                                </Button>
                                <Button
                                    onClick={() => handleAction(selectedApply.id, selectedApply.name, 'APPROVED')}
                                >
                                    승인하기
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </Card>
    );
};
