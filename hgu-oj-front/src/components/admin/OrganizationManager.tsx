import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { OrganizationModal } from './OrganizationModal';
import { adminService } from '../../services/adminService';
import { Organization } from '../../types';
import { ActionIconButtons } from '../../features/contribution/components/ActionIconButtons';
import CommonPagination from '../common/CommonPagination';

export const OrganizationManager: React.FC = () => {
    const navigate = useNavigate();
    const [orgList, setOrgList] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [keyword, setKeyword] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchOrganizations = useCallback(async (p: number = 1) => {
        setLoading(true);
        setError(null);
        try {
            const response = await adminService.getOrganizations({ page: p, limit: 10 });
            setOrgList(response.items);
            setTotal(response.total);
            setPage(p);
        } catch {
            setError('단체 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrganizations(1);
    }, [fetchOrganizations]);

    const handleSearch = (val: string) => {
        setKeyword(val);
        setTimeout(() => fetchOrganizations(1), 300);
    };

    const handleDelete = async (id: number, name: string) => {
        if (!window.confirm(`'${name}' 단체를 삭제하시겠습니까?`)) return;
        try {
            await adminService.deleteOrganization(id);
            fetchOrganizations(page);
        } catch (err) {
            alert('삭제 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
        }
    };

    return (
        <Card padding="lg">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 dark:text-slate-100">단체 목록</h2>
                    </div>
                    <Button onClick={() => setIsModalOpen(true)}>단체 등록</Button>
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="단체 검색 (이름)"
                        value={keyword}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">이름</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">설명</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                            {loading ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">로딩 중...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-red-600">{error}</td></tr>
                            ) : orgList.length === 0 ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">단체가 없습니다.</td></tr>
                            ) : (
                                orgList.map((org) => (
                                    <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:bg-slate-800">
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100">{org.id}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100 font-medium">{org.name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">{org.description}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <ActionIconButtons
                                                onEdit={() => navigate(`/organizations/${org.id}/manage`)}
                                                onDelete={() => handleDelete(org.id, org.name)}
                                                editTitle={`단체 ${org.name} 수정`}
                                                deleteTitle={`단체 ${org.name} 삭제`}
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4">
                    <CommonPagination
                        page={page}
                        pageSize={10}
                        totalItems={total}
                        onChangePage={(nextPage) => fetchOrganizations(nextPage)}
                    />
                </div>
            </div>
            <OrganizationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                mode="create"
                organizationId={null}
                onSuccess={() => fetchOrganizations(page)}
            />
        </Card>
    );
};
