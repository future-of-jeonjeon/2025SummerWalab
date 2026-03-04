import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { WorkbookModal } from './WorkbookModal';
import { WorkbookListTable } from '../../features/contribution/components/WorkbookListTable';
import { adminService } from '../../services/adminService';
import { AdminWorkbook } from '../../types';
import CommonPagination from '../common/CommonPagination';

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
                visible: w.is_public,
                problemCount: (w as any).problemCount ?? (w as any).problem_count ?? 0,
            }));
            setWorkbookList(mappedResults);
            setTotal(response.total);
            setPage(p);
        } catch {
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
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 dark:text-slate-100">문제집 목록</h2>
                    </div>
                    <Button
                        onClick={() => openModal('create')}
                    >
                        <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        문제집 등록
                    </Button>
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="문제집 검색 (제목)"
                        value={keyword}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    {loading ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">로딩 중...</div>
                    ) : error ? (
                        <div className="px-4 py-8 text-center text-sm text-red-600">{error}</div>
                    ) : (
                        <>
                            <WorkbookListTable
                                showHeader={false}
                                workbooks={workbookList}
                                onEdit={(workbook) => openModal('edit', workbook.id)}
                                onDelete={(workbookId) => {
                                    const target = workbookList.find((workbook) => workbook.id === workbookId);
                                    if (target) {
                                        void handleDelete(workbookId, target.title);
                                    }
                                }}
                            />
                            <div className="px-4 py-4 border-t border-gray-200 dark:border-slate-700">
                                <CommonPagination
                                    page={page}
                                    pageSize={20}
                                    totalItems={total}
                                    onChangePage={(nextPage) => fetchWorkbooks(nextPage, keyword)}
                                />
                            </div>
                        </>
                    )}
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
