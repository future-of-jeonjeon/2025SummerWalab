import React, { useState, useRef } from 'react';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { adminService } from '../../../services/adminService';
import { Problem, Workbook } from '../../../types';

interface WorkbookRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Workbook;
}

type WorkbookFormState = {
    title: string;
    description: string;
};

const initialWorkbookForm: WorkbookFormState = {
    title: '',
    description: '',
};

type WorkbookProblemsState = {
    items: Problem[];
    loading: boolean;
    error: string | null;
};

export const WorkbookRegistrationModal: React.FC<WorkbookRegistrationModalProps> = ({
    isOpen, onClose, onSuccess, initialData
}) => {
    const [formState, setFormState] = useState<WorkbookFormState>(initialWorkbookForm);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ success?: string; error?: string }>({});
    const [activeTab, setActiveTab] = useState<'basic' | 'problems'>('basic');

    // Problem Management State
    const [workbookProblems, setWorkbookProblems] = useState<WorkbookProblemsState>({ items: [], loading: false, error: null });
    const [problemInput, setProblemInput] = useState('');
    const [problemSearch, setProblemSearch] = useState<{ results: Problem[]; loading: boolean; error: string | null }>({ results: [], loading: false, error: null });


    const problemSearchTimerRef = useRef<number | null>(null);

    const fetchWorkbookProblems = async (workbookId: number) => {
        setWorkbookProblems(prev => ({ ...prev, loading: true, error: null }));
        try {
            const problems = await adminService.getWorkbookProblems(workbookId);
            // adminService.getWorkbookProblems returns WorkbookProblem[], but state expects Problem[]
            // We need to map it or adjust state. The current state definition uses Problem[]
            // Let's map WorkbookProblem back to Problem structure used in the list
            const mappedProblems: Problem[] = problems.map(wp => ({
                id: wp.problem.id,
                title: wp.problem.title,
                displayId: wp.problem.displayId, // Ensure displayId is available if needed
                difficulty: wp.problem.difficulty,
                // Add other necessary fields if Problem type requires them
            } as Problem));

            setWorkbookProblems({ items: mappedProblems, loading: false, error: null });
        } catch (error) {
            console.error(error);
            setWorkbookProblems({ items: [], loading: false, error: '문제 목록을 불러오지 못했습니다.' });
        }
    };

    React.useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormState({
                    title: initialData.title,
                    description: initialData.description || '',
                });
                setMessage({});
                setActiveTab('basic');
                fetchWorkbookProblems(initialData.id);
            } else {
                setFormState(initialWorkbookForm);
                setWorkbookProblems({ items: [], loading: false, error: null });
                setActiveTab('basic');
                setMessage({});
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

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

    const handleAddProblem = (problem: Problem) => {
        if (workbookProblems.items.some(p => p.id === problem.id)) {
            setMessage({ error: '이미 추가된 문제입니다.' });
            setTimeout(() => setMessage({}), 3000);
            return;
        }

        const nextIndex = workbookProblems.items.length + 1;
        const displayId = String(nextIndex);

        setWorkbookProblems(prev => ({
            ...prev,
            items: [...prev.items, { ...problem, displayId }]
        }));
        setProblemInput('');
        setProblemSearch({ results: [], loading: false, error: null });
    };

    const handleRemoveProblem = (problemId: number) => {
        setWorkbookProblems(prev => ({
            ...prev,
            items: prev.items.filter(p => p.id !== problemId)
        }));
    };

    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleSort = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        if (dragItem.current === dragOverItem.current) return;

        const _workbookProblems = [...workbookProblems.items];
        const draggedItemContent = _workbookProblems[dragItem.current];
        _workbookProblems.splice(dragItem.current, 1);
        _workbookProblems.splice(dragOverItem.current, 0, draggedItemContent);

        dragItem.current = null;
        dragOverItem.current = null;

        setWorkbookProblems(prev => ({ ...prev, items: _workbookProblems }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.title.trim()) {
            setMessage({ error: '제목을 입력해주세요.' });
            return;
        }

        setLoading(true);
        setMessage({});

        try {
            const problemIds = workbookProblems.items.map(p => p.id);

            if (initialData) {
                // Update existing workbook
                await adminService.updateWorkbook(initialData.id, {
                    title: formState.title,
                    description: formState.description,
                });
                await adminService.updateWorkbookProblems(initialData.id, problemIds);
            } else {
                // Create new workbook
                await adminService.createWorkbook({
                    title: formState.title,
                    description: formState.description,
                    is_public: false,
                    problemIds,
                });
            }

            onSuccess();
            onClose();
        } catch (error) {
            setMessage({ error: error instanceof Error ? error.message : '저장 실패' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
                    aria-hidden="true"
                    onClick={onClose}
                ></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white dark:bg-slate-900 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
                    <div className="px-8 pt-8 pb-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold leading-6 text-gray-900 dark:text-slate-100 tracking-tight" id="modal-title">
                                {initialData ? '문제집 수정' : '새 문제집 등록'}
                            </h3>
                            <div className="flex space-x-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-gray-200 dark:border-slate-700">
                                <button
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'basic' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:bg-slate-800'}`}
                                    onClick={() => setActiveTab('basic')}
                                >
                                    기본 정보
                                </button>
                                <button
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'problems' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:bg-slate-800'}`}
                                    onClick={() => setActiveTab('problems')}
                                >
                                    문제 관리
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 px-8 py-6 min-h-[400px]">
                        {message.error && (
                            <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-100 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {message.error}
                            </div>
                        )}
                        {message.success && (
                            <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-lg text-sm border border-green-100 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {message.success}
                            </div>
                        )}

                        {activeTab === 'basic' && (
                            <div className="space-y-6 animate-fadeIn">
                                <Input
                                    label="제목"
                                    value={formState.title}
                                    onChange={e => setFormState({ ...formState, title: e.target.value })}
                                    required
                                    className="bg-gray-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 transition-colors"
                                />
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">설명</label>
                                    <textarea
                                        className="block w-full border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-3 bg-gray-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 transition-colors resize-none"
                                        rows={8}
                                        value={formState.description}
                                        onChange={e => setFormState({ ...formState, description: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'problems' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex gap-3 bg-gray-50 p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
                                    <div className="relative flex-1">
                                        <Input
                                            placeholder="문제 검색 (제목)"
                                            value={problemInput}
                                            onChange={e => handleSearchProblem(e.target.value)}
                                            className="bg-white dark:bg-slate-900 focus:ring-blue-500"
                                        />
                                        {problemSearch.results.length > 0 && (
                                            <ul className="absolute z-10 mt-2 w-full max-h-60 overflow-auto rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                {problemSearch.results.map(p => (
                                                    <li
                                                        key={p.id}
                                                        className="cursor-pointer select-none relative py-3 pl-4 pr-9 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-900 dark:text-slate-100 transition-colors border-b border-gray-50 last:border-0"
                                                        onClick={() => handleAddProblem(p)}
                                                    >
                                                        <div className="flex items-center">
                                                            <span className="text-gray-900 dark:text-slate-100 truncate">{p.title}</span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                </div>

                                <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                        <thead className="bg-gray-50 dark:bg-slate-800">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">No.</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Title</th>
                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700 dark:divide-slate-700">
                                            {workbookProblems.items.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-10 text-center text-gray-500 dark:text-slate-400 text-sm">
                                                        등록된 문제가 없습니다.
                                                    </td>
                                                </tr>
                                            ) : (
                                                workbookProblems.items.map((p, index) => (
                                                    <tr
                                                        key={p.id}
                                                        className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-move"
                                                        draggable
                                                        onDragStart={() => (dragItem.current = index)}
                                                        onDragEnter={() => (dragOverItem.current = index)}
                                                        onDragEnd={handleSort}
                                                        onDragOver={(e) => e.preventDefault()}
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{index + 1}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-300">{p.title}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                            <button
                                                                className="text-red-400 hover:text-red-600 font-medium transition-colors p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                onClick={() => handleRemoveProblem(p.id)}
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="bg-gray-50/80 dark:bg-slate-800 px-8 py-5 sm:flex sm:flex-row-reverse border-t border-gray-100 dark:border-slate-800">
                        <Button onClick={handleSubmit} disabled={loading} className="w-full sm:ml-3 sm:w-auto">
                            {loading ? '저장 중...' : (initialData ? '수정하기' : '등록하기')}
                        </Button>
                        <Button onClick={onClose} variant="outline" className="mt-3 w-full sm:mt-0 sm:ml-3 sm:w-auto">
                            취소
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
