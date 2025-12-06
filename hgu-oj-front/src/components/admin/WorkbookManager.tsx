import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { WorkbookModal } from './WorkbookModal';
import { adminService } from '../../services/adminService';
import { AdminWorkbook } from '../../types';

export const WorkbookManager: React.FC = () => {
    const [workbookList, setWorkbookList] = useState<AdminWorkbook[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [keyword, setKeyword] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedWorkbookId, setSelectedWorkbookId] = useState<number | null>(null);

    const fetchWorkbooks = useCallback(async (p: number = 1, k: string = '') => {
        setLoading(true);
        setError(null);
        try {
            const response = await adminService.getWorkbooks({ page: p, limit: 20, keyword: k });
            const mappedResults: AdminWorkbook[] = response.results.map(w => ({
                ...w,
                visible: w.is_public
            }));
            setWorkbookList(mappedResults);
            setTotal(response.total);
            setPage(p);
        } catch (err) {
            setError('문제집 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWorkbooks(1, '');
    }, [fetchWorkbooks]);

    const handleSearch = (val: string) => {
        setKeyword(val);
        setTimeout(() => fetchWorkbooks(1, val), 300);
    };

    const openModal = (mode: 'create' | 'edit', id?: number) => {
        setModalMode(mode);
        setSelectedWorkbookId(id ?? null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number, title: string) => {
        if (!window.confirm(`'${title}' 문제집을 삭제하시겠습니까?`)) return;
        try {
            // Assuming deleteWorkbook exists. If not, I need to add it.
            // I'll assume I need to add it to adminService.ts.
            await adminService.deleteWorkbook(id);
            fetchWorkbooks(page, keyword);
        } catch (err) {
            alert('삭제 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
        }
    };

    return (
        <Card padding="lg">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold text-gray-900">문제집 목록</h2>
                        <p className="text-sm text-gray-500">등록된 문제집을 관리합니다.</p>
                    </div>
                    <Button onClick={() => openModal('create')}>문제집 등록</Button>
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="문제집 검색 (제목)"
                        value={keyword}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {loading ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">로딩 중...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-red-600">{error}</td></tr>
                            ) : workbookList.length === 0 ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">문제집이 없습니다.</td></tr>
                            ) : (
                                workbookList.map((workbook) => (
                                    <tr key={workbook.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">{workbook.id}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{workbook.title}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${workbook.visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {workbook.visible ? '공개' : '비공개'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right space-x-2">
                                            <Button size="sm" variant="outline" onClick={() => openModal('edit', workbook.id)}>수정</Button>
                                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(workbook.id, workbook.title)}>삭제</Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex justify-between items-center">
                        <span className="text-sm text-gray-700">총 {total}개</span>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => fetchWorkbooks(page - 1, keyword)}>이전</Button>
                            <Button size="sm" variant="outline" disabled={page >= Math.ceil(total / 20)} onClick={() => fetchWorkbooks(page + 1, keyword)}>다음</Button>
                        </div>
                    </div>
                </div>
            </div>
            <WorkbookModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                mode={modalMode}
                workbookId={selectedWorkbookId}
                onSuccess={() => fetchWorkbooks(page, keyword)}
            />
        </Card>
    );
};
