import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { ProblemModal } from './ProblemModal';
import { adminService } from '../../services/adminService';
import { Problem } from '../../types';

export const ProblemManager: React.FC = () => {
    const [problemList, setProblemList] = useState<Problem[]>([]);
    const [problemListLoading, setProblemListLoading] = useState(false);
    const [problemListError, setProblemListError] = useState<string | null>(null);
    const [problemPage, setProblemPage] = useState(1);
    const [problemTotal, setProblemTotal] = useState(0);
    const [problemSearchKeyword, setProblemSearchKeyword] = useState('');
    const problemSearchTimerRef = useRef<number | null>(null);
    const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
    const [problemModalMode, setProblemModalMode] = useState<'create' | 'edit'>('create');
    const [selectedProblemIdForModal, setSelectedProblemIdForModal] = useState<number | null>(null);

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
        } catch (error) {
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

    const handleOpenProblemModal = (mode: 'create' | 'edit', id?: number) => {
        setProblemModalMode(mode);
        setSelectedProblemIdForModal(id ?? null);
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
                        <h2 className="text-xl font-semibold text-gray-900">문제 목록</h2>
                        <p className="text-sm text-gray-500">등록된 문제를 관리합니다.</p>
                    </div>
                    <Button onClick={() => handleOpenProblemModal('create')}>문제 등록</Button>
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="문제 검색 (ID, 제목)"
                        value={problemSearchKeyword}
                        onChange={(e) => handleProblemSearchChange(e.target.value)}
                    />
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">난이도</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {problemListLoading ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">로딩 중...</td></tr>
                            ) : problemListError ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-red-600">{problemListError}</td></tr>
                            ) : problemList.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">문제가 없습니다.</td></tr>
                            ) : (
                                problemList.map((problem) => (
                                    <tr key={problem.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">{problem.id}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{problem.title}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{problem.difficulty}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${problem.visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {problem.visible ? '공개' : '비공개'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right space-x-2">
                                            <Button size="sm" variant="outline" onClick={() => handleOpenProblemModal('edit', problem.id)}>수정</Button>
                                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDeleteProblem(problem.id, problem.title)}>삭제</Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex justify-between items-center">
                        <span className="text-sm text-gray-700">총 {problemTotal}개</span>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled={problemPage === 1} onClick={() => fetchProblems(problemPage - 1, problemSearchKeyword)}>이전</Button>
                            <Button size="sm" variant="outline" disabled={problemPage >= Math.ceil(problemTotal / 20)} onClick={() => fetchProblems(problemPage + 1, problemSearchKeyword)}>다음</Button>
                        </div>
                    </div>
                </div>
            </div>
            <ProblemModal
                isOpen={isProblemModalOpen}
                onClose={() => setIsProblemModalOpen(false)}
                mode={problemModalMode}
                problemId={selectedProblemIdForModal}
                onSuccess={() => fetchProblems(problemPage, problemSearchKeyword)}
            />
        </Card>
    );
};
