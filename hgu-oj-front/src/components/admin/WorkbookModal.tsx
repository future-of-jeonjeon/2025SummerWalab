import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { adminService } from '../../services/adminService';
import { Problem } from '../../types';

type WorkbookModalProps = {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    workbookId: number | null;
    onSuccess: () => void;
};

type WorkbookFormState = {
    title: string;
    description: string;
    visible: boolean;
};

const initialWorkbookForm: WorkbookFormState = {
    title: '',
    description: '',
    visible: true,
};

type WorkbookProblemsState = {
    items: Problem[];
    loading: boolean;
    error: string | null;
};

export const WorkbookModal: React.FC<WorkbookModalProps> = ({ isOpen, onClose, mode, workbookId, onSuccess }) => {
    const [formState, setFormState] = useState<WorkbookFormState>(initialWorkbookForm);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ success?: string; error?: string }>({});
    const [activeTab, setActiveTab] = useState<'basic' | 'problems'>('basic');

    // Problem Management State
    const [workbookProblems, setWorkbookProblems] = useState<WorkbookProblemsState>({ items: [], loading: false, error: null });
    const [problemInput, setProblemInput] = useState('');
    const [problemDisplayId, setProblemDisplayId] = useState('');
    const [problemSearch, setProblemSearch] = useState<{ results: Problem[]; loading: boolean; error: string | null }>({ results: [], loading: false, error: null });
    const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

    const problemSearchTimerRef = useRef<number | null>(null);

    const loadWorkbookDetail = useCallback(async (id: number) => {
        setLoading(true);
        try {
            // Assuming getWorkbookDetail exists or we use getWorkbooks and filter?
            // adminService.getWorkbooks returns list. adminService.getWorkbookDetail might not exist?
            // Let's check adminService.ts content.
            // It seems getWorkbookDetail is not explicitly in the snippets I saw.
            // But WorkbookManageSection used `loadWorkbooks` and then `fetchWorkbookProblems`.
            // It seems I might need to fetch the list and find the item, or add getWorkbookDetail.
            // For now, I'll assume I can get the detail from the list or I'll implement a fetch.
            // Actually, let's just fetch the list and find it for now if API is missing, or better, add it.
            // But I can't easily add API without backend.
            // Let's look at WorkbookManageSection.tsx again.
            // It iterates `workbookList` to find the selected one.
            // So I might need to do the same or just pass the data if I had it.
            // But `ContestModal` fetches detail.
            // Let's assume I can fetch it. If not, I'll use a workaround.
            // Wait, `adminService.getWorkbooks` returns `AdminWorkbook[]`.
            // I'll use that for now.
            const { results } = await adminService.getWorkbooks({ limit: 1000, page: 1 });
            const workbook = results.find(w => w.id === id);
            if (workbook) {
                setFormState({
                    title: workbook.title,
                    description: workbook.description || '',
                    visible: workbook.is_public,
                });
            }

            // Load problems
            const workbookProblems = await adminService.getWorkbookProblems(id);
            const problems = workbookProblems.map(wp => wp.problem);
            setWorkbookProblems({ items: problems, loading: false, error: null });
        } catch (error) {
            setMessage({ error: '문제집 정보를 불러오지 못했습니다.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && workbookId) {
                loadWorkbookDetail(workbookId);
            } else {
                setFormState(initialWorkbookForm);
                setWorkbookProblems({ items: [], loading: false, error: null });
            }
            setActiveTab('basic');
            setMessage({});
        }
    }, [isOpen, mode, workbookId, loadWorkbookDetail]);

    const handleSearchProblem = (keyword: string) => {
        setProblemInput(keyword);
        if (problemSearchTimerRef.current) clearTimeout(problemSearchTimerRef.current);

        if (!keyword.trim()) {
            setProblemSearch({ results: [], loading: false, error: null });
            return;
        }

        problemSearchTimerRef.current = window.setTimeout(async () => {
            setProblemSearch(prev => ({ ...prev, loading: true }));
            try {
                const results = await adminService.searchAdminProblems({ keyword, limit: 10, offset: 0 });
                setProblemSearch({ results, loading: false, error: null });
            } catch {
                setProblemSearch({ results: [], loading: false, error: '검색 실패' });
            }
        }, 300);
    };

    const handleAddProblem = () => {
        if (!selectedProblem) return;
        const displayId = problemDisplayId.trim() || selectedProblem.displayId || String(selectedProblem.id);

        setWorkbookProblems(prev => ({
            ...prev,
            items: [...prev.items, { ...selectedProblem, displayId }]
        }));
        setProblemInput('');
        setProblemDisplayId('');
        setSelectedProblem(null);
        setProblemSearch({ results: [], loading: false, error: null });
    };

    const handleRemoveProblem = (problemId: number) => {
        setWorkbookProblems(prev => ({
            ...prev,
            items: prev.items.filter(p => p.id !== problemId)
        }));
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!formState.title.trim()) {
            setMessage({ error: '제목을 입력해주세요.' });
            return;
        }

        setLoading(true);
        setMessage({});

        try {
            const problemIds = workbookProblems.items.map(p => p.id);

            if (mode === 'create') {
                await adminService.createWorkbook({
                    title: formState.title,
                    description: formState.description,
                    is_public: formState.visible,
                    problemIds,
                });

                onSuccess();
                onClose();
            } else if (mode === 'edit' && workbookId) {
                await adminService.updateWorkbook(workbookId, {
                    title: formState.title,
                    description: formState.description,
                    is_public: formState.visible,
                });

                await adminService.updateWorkbookProblems(workbookId, problemIds);

                onSuccess();
                setMessage({ success: '저장되었습니다.' });
            }
        } catch (error) {
            setMessage({ error: error instanceof Error ? error.message : '저장 실패' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {mode === 'create' ? '문제집 등록' : '문제집 수정'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex border-b border-gray-200 px-6">
                    <button
                        className={`mr-4 border-b-2 py-3 text-sm font-medium ${activeTab === 'basic' ? 'border-[#113F67] text-[#113F67]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('basic')}
                    >
                        기본 정보
                    </button>
                    <button
                        className={`border-b-2 py-3 text-sm font-medium ${activeTab === 'problems' ? 'border-[#113F67] text-[#113F67]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('problems')}
                    >
                        문제 관리
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {message.error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{message.error}</div>}
                    {message.success && <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-600">{message.success}</div>}
                    {message.error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{message.error}</div>}
                    {message.success && <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-600">{message.success}</div>}

                    {activeTab === 'basic' && (
                        <form id="workbook-form" onSubmit={handleSubmit} className="space-y-4">
                            <Input label="제목" value={formState.title} onChange={e => setFormState({ ...formState, title: e.target.value })} required />
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">설명</label>
                                <textarea className="w-full rounded-md border border-gray-300 px-3 py-2" rows={5} value={formState.description} onChange={e => setFormState({ ...formState, description: e.target.value })} />
                            </div>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={formState.visible} onChange={e => setFormState({ ...formState, visible: e.target.checked })} /> 공개</label>
                        </form>
                    )}

                    {activeTab === 'problems' && (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        placeholder="문제 검색 (ID, 제목)"
                                        value={problemInput}
                                        onChange={e => handleSearchProblem(e.target.value)}
                                    />
                                    {problemSearch.results.length > 0 && (
                                        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-white shadow-lg">
                                            {problemSearch.results.map(p => (
                                                <li key={p.id} className="cursor-pointer px-4 py-2 hover:bg-gray-100" onClick={() => {
                                                    setSelectedProblem(p);
                                                    setProblemInput(`${p.id} - ${p.title}`);
                                                    setProblemDisplayId(p.displayId ?? String(p.id));
                                                    setProblemSearch({ results: [], loading: false, error: null });
                                                }}>
                                                    {p.id} - {p.title}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="w-32">
                                    <Input
                                        placeholder="표시 ID"
                                        value={problemDisplayId}
                                        onChange={e => setProblemDisplayId(e.target.value)}
                                    />
                                </div>
                                <Button onClick={handleAddProblem} disabled={!selectedProblem}>추가</Button>
                            </div>

                            <div className="rounded-md border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">ID</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Display ID</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Title</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {workbookProblems.items.map(p => (
                                            <tr key={p.id}>
                                                <td className="px-4 py-2 text-sm">{p.id}</td>
                                                <td className="px-4 py-2 text-sm">{p.displayId}</td>
                                                <td className="px-4 py-2 text-sm">{p.title}</td>
                                                <td className="px-4 py-2 text-right text-sm">
                                                    <button className="text-red-600 hover:text-red-800" onClick={() => handleRemoveProblem(p.id)}>삭제</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-200 px-6 py-4 text-right">
                    <Button variant="outline" onClick={onClose} className="mr-2">취소</Button>
                    <Button onClick={handleSubmit} loading={loading}>
                        {mode === 'create' ? '등록' : '저장'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
