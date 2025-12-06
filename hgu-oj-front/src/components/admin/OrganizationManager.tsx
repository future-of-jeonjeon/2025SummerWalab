import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { OrganizationModal } from './OrganizationModal';
import { adminService } from '../../services/adminService';
import { Organization } from '../../types';

export const OrganizationManager: React.FC = () => {
    const [orgList, setOrgList] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [keyword, setKeyword] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

    const fetchOrganizations = useCallback(async (p: number = 1) => {
        setLoading(true);
        setError(null);
        try {
            const response = await adminService.getOrganizations({ page: p, limit: 10 });
            setOrgList(response.items);
            setTotal(response.total);
            setPage(p);
        } catch (err) {
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

    const openModal = (mode: 'create' | 'edit', id?: number) => {
        setModalMode(mode);
        setSelectedOrgId(id ?? null);
        setIsModalOpen(true);
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
                        <h2 className="text-xl font-semibold text-gray-900">단체 목록</h2>
                        <p className="text-sm text-gray-500">등록된 단체를 관리합니다.</p>
                    </div>
                    <Button onClick={() => openModal('create')}>단체 등록</Button>
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="단체 검색 (이름)"
                        value={keyword}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">설명</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {loading ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">로딩 중...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-red-600">{error}</td></tr>
                            ) : orgList.length === 0 ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">단체가 없습니다.</td></tr>
                            ) : (
                                orgList.map((org) => (
                                    <tr key={org.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">{org.id}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{org.name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{org.description}</td>
                                        <td className="px-4 py-3 text-sm text-right space-x-2">
                                            <Button size="sm" variant="outline" onClick={() => openModal('edit', org.id)}>수정</Button>
                                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(org.id, org.name)}>삭제</Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex justify-between items-center">
                        <span className="text-sm text-gray-700">총 {total}개</span>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => fetchOrganizations(page - 1)}>이전</Button>
                            <Button size="sm" variant="outline" disabled={page >= Math.ceil(total / 20)} onClick={() => fetchOrganizations(page + 1)}>다음</Button>
                        </div>
                    </div>
                </div>
            </div>
            <OrganizationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                mode={modalMode}
                organizationId={selectedOrgId}
                onSuccess={() => fetchOrganizations(page)}
            />
        </Card>
    );
};
