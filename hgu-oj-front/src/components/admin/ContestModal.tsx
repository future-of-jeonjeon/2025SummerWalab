import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { adminService, CreateContestPayload, UpdateContestPayload } from '../../services/adminService';
import { contestUserService } from '../../services/contestUserService';
import { Problem } from '../../types';
import { toLocalDateTimeInput } from '../../lib/date';

type ContestModalProps = {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    contestId: number | null;
    onSuccess: () => void;
};

type ContestFormState = {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    ruleType: 'ACM' | 'OI';
    password: string;
    visible: boolean;
    realTimeRank: boolean;
    allowedIpRanges: string;
    requiresApproval: boolean;
};

const initialContestForm: ContestFormState = {
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    ruleType: 'ACM',
    password: '',
    visible: true,
    realTimeRank: true,
    allowedIpRanges: '',
    requiresApproval: false,
};

type ContestProblemsState = {
    items: Problem[];
    loading: boolean;
    error: string | null;
};

export const ContestModal: React.FC<ContestModalProps> = ({ isOpen, onClose, mode, contestId, onSuccess }) => {
    const [formState, setFormState] = useState<ContestFormState>(initialContestForm);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ success?: string; error?: string }>({});
    const [activeTab, setActiveTab] = useState<'basic' | 'problems' | 'announcements'>('basic');

    // Problem Management State
    const [contestProblems, setContestProblems] = useState<ContestProblemsState>({ items: [], loading: false, error: null });
    const [problemInput, setProblemInput] = useState('');
    const [problemDisplayId, setProblemDisplayId] = useState('');
    const [problemSearch, setProblemSearch] = useState<{ results: Problem[]; loading: boolean; error: string | null }>({ results: [], loading: false, error: null });
    const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
    const [problemMessage, setProblemMessage] = useState<{ success?: string; error?: string }>({});
    const problemSearchTimerRef = useRef<number | null>(null);

    // Announcement State (Only for Create mode initially, or simple list for Edit)
    const [announcements, setAnnouncements] = useState<Array<{ title: string; content: string; visible: boolean }>>([]);
    const [announcementDraft, setAnnouncementDraft] = useState({ title: '', content: '', visible: true });

    const loadContestDetail = useCallback(async (id: number) => {
        setLoading(true);
        try {
            const detail = await adminService.getContestDetail(id);
            setFormState({
                title: detail.title ?? '',
                description: detail.description ?? '',
                startTime: toLocalDateTimeInput(detail.startTime),
                endTime: toLocalDateTimeInput(detail.endTime),
                ruleType: detail.ruleType as 'ACM' | 'OI',
                password: detail.password ?? '',
                visible: Boolean(detail.visible),
                realTimeRank: Boolean(detail.real_time_rank),
                allowedIpRanges: (detail.allowed_ip_ranges || []).join('\n'),
                requiresApproval: Boolean(detail.requires_approval ?? detail.requiresApproval),
            });

            // Load problems
            const problems = await adminService.getContestProblems(id);
            setContestProblems({ items: problems, loading: false, error: null });

            // Load policy (requiresApproval) if needed separately, but getContestDetail might have it
            try {
                const policy = await contestUserService.getPolicy(id);
                setFormState(prev => ({ ...prev, requiresApproval: policy.requiresApproval }));
            } catch {
                // ignore
            }

        } catch (error) {
            setMessage({ error: '대회 정보를 불러오지 못했습니다.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && contestId) {
                loadContestDetail(contestId);
            } else {
                setFormState(initialContestForm);
                setContestProblems({ items: [], loading: false, error: null });
                setAnnouncements([]);
            }
            setActiveTab('basic');
            setMessage({});
            setProblemMessage({});
        }
    }, [isOpen, mode, contestId, loadContestDetail]);

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

    const handleAddProblem = async () => {
        if (!selectedProblem) return;
        const displayId = problemDisplayId.trim() || selectedProblem.displayId || String(selectedProblem.id);

        if (mode === 'create') {
            setContestProblems(prev => ({
                ...prev,
                items: [...prev.items, { ...selectedProblem, displayId }]
            }));
            setProblemInput('');
            setProblemDisplayId('');
            setSelectedProblem(null);
            setProblemSearch({ results: [], loading: false, error: null });
        } else if (mode === 'edit' && contestId) {
            try {
                await adminService.addContestProblemFromPublic(contestId, selectedProblem.id, displayId);
                const updatedProblems = await adminService.getContestProblems(contestId);
                setContestProblems({ items: updatedProblems, loading: false, error: null });
                setProblemMessage({ success: '문제가 추가되었습니다.' });
                setProblemInput('');
                setProblemDisplayId('');
                setSelectedProblem(null);
            } catch (error) {
                setProblemMessage({ error: '문제 추가 실패' });
            }
        }
    };

    const handleRemoveProblem = async (problemId: number) => {
        if (mode === 'create') {
            setContestProblems(prev => ({
                ...prev,
                items: prev.items.filter(p => p.id !== problemId)
            }));
        } else if (mode === 'edit' && contestId) {
            if (!window.confirm('정말 삭제하시겠습니까?')) return;
            try {
                await adminService.deleteContestProblem(problemId); // This might need to be by contest_problem_id if API differs
                // Re-fetch to be safe
                const updatedProblems = await adminService.getContestProblems(contestId);
                setContestProblems({ items: updatedProblems, loading: false, error: null });
            } catch (error) {
                setProblemMessage({ error: '문제 삭제 실패' });
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({});

        const allowedIpRanges = formState.allowedIpRanges.split(/[\n,]+/).map(ip => ip.trim()).filter(Boolean);
        const start = new Date(formState.startTime);
        const end = new Date(formState.endTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            setMessage({ error: '유효한 날짜를 입력하세요.' });
            setLoading(false);
            return;
        }

        try {
            if (mode === 'create') {
                const payload: CreateContestPayload = {
                    title: formState.title,
                    description: formState.description,
                    start_time: start.toISOString(),
                    end_time: end.toISOString(),
                    rule_type: formState.ruleType,
                    password: formState.password,
                    visible: formState.visible,
                    real_time_rank: formState.realTimeRank,
                    allowed_ip_ranges: allowedIpRanges,
                    requires_approval: formState.requiresApproval,
                };
                const created = await adminService.createContest(payload);

                // Add problems
                for (const p of contestProblems.items) {
                    await adminService.addContestProblemFromPublic(created.id, p.id, p.displayId ?? String(p.id));
                }

                // Add announcements
                for (const a of announcements) {
                    await adminService.createContestAnnouncement({
                        contestId: created.id,
                        title: a.title,
                        content: a.content,
                        visible: a.visible,
                    });
                }

                onSuccess();
                onClose();
            } else if (mode === 'edit' && contestId) {
                const payload: UpdateContestPayload = {
                    id: contestId,
                    title: formState.title,
                    description: formState.description,
                    start_time: start.toISOString(),
                    end_time: end.toISOString(),
                    password: formState.password || null,
                    visible: formState.visible,
                    real_time_rank: formState.realTimeRank,
                    allowed_ip_ranges: allowedIpRanges,
                    requires_approval: formState.requiresApproval,
                };
                await adminService.updateContest(payload);
                await contestUserService.setPolicy(contestId, formState.requiresApproval);

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
                        {mode === 'create' ? '대회 등록' : '대회 수정'}
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
                        className={`mr-4 border-b-2 py-3 text-sm font-medium ${activeTab === 'problems' ? 'border-[#113F67] text-[#113F67]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('problems')}
                    >
                        문제 관리
                    </button>
                    {mode === 'create' && (
                        <button
                            className={`border-b-2 py-3 text-sm font-medium ${activeTab === 'announcements' ? 'border-[#113F67] text-[#113F67]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('announcements')}
                        >
                            공지 사항
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {message.error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{message.error}</div>}
                    {message.success && <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-600">{message.success}</div>}
                    {problemMessage.error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{problemMessage.error}</div>}
                    {problemMessage.success && <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-600">{problemMessage.success}</div>}

                    {activeTab === 'basic' && (
                        <form id="contest-form" onSubmit={handleSubmit} className="space-y-4">
                            <Input label="제목" value={formState.title} onChange={e => setFormState({ ...formState, title: e.target.value })} required />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">시작 시간</label>
                                    <input type="datetime-local" className="w-full rounded-md border border-gray-300 px-3 py-2" value={formState.startTime} onChange={e => setFormState({ ...formState, startTime: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">종료 시간</label>
                                    <input type="datetime-local" className="w-full rounded-md border border-gray-300 px-3 py-2" value={formState.endTime} onChange={e => setFormState({ ...formState, endTime: e.target.value })} required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="비밀번호" value={formState.password} onChange={e => setFormState({ ...formState, password: e.target.value })} />
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">룰 타입</label>
                                    <select className="w-full rounded-md border border-gray-300 px-3 py-2" value={formState.ruleType} onChange={e => setFormState({ ...formState, ruleType: e.target.value as any })}>
                                        <option value="ACM">ACM</option>
                                        <option value="OI">OI</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2"><input type="checkbox" checked={formState.visible} onChange={e => setFormState({ ...formState, visible: e.target.checked })} /> 공개</label>
                                <label className="flex items-center gap-2"><input type="checkbox" checked={formState.realTimeRank} onChange={e => setFormState({ ...formState, realTimeRank: e.target.checked })} /> 실시간 랭크</label>
                                <label className="flex items-center gap-2"><input type="checkbox" checked={formState.requiresApproval} onChange={e => setFormState({ ...formState, requiresApproval: e.target.checked })} /> 승인 필요</label>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">허용 IP (CIDR)</label>
                                <textarea className="w-full rounded-md border border-gray-300 px-3 py-2" rows={3} value={formState.allowedIpRanges} onChange={e => setFormState({ ...formState, allowedIpRanges: e.target.value })} placeholder="127.0.0.1/32" />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">설명</label>
                                <textarea className="w-full rounded-md border border-gray-300 px-3 py-2" rows={5} value={formState.description} onChange={e => setFormState({ ...formState, description: e.target.value })} />
                            </div>
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
                                        {contestProblems.items.map(p => (
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

                    {activeTab === 'announcements' && mode === 'create' && (
                        <div className="space-y-4">
                            <div className="space-y-2 rounded-md border border-gray-200 p-4">
                                <Input placeholder="제목" value={announcementDraft.title} onChange={e => setAnnouncementDraft({ ...announcementDraft, title: e.target.value })} />
                                <textarea className="w-full rounded-md border border-gray-300 px-3 py-2" rows={3} placeholder="내용" value={announcementDraft.content} onChange={e => setAnnouncementDraft({ ...announcementDraft, content: e.target.value })} />
                                <div className="flex justify-between">
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={announcementDraft.visible} onChange={e => setAnnouncementDraft({ ...announcementDraft, visible: e.target.checked })} /> 공개</label>
                                    <Button onClick={() => {
                                        setAnnouncements([...announcements, announcementDraft]);
                                        setAnnouncementDraft({ title: '', content: '', visible: true });
                                    }}>추가</Button>
                                </div>
                            </div>
                            <ul className="space-y-2">
                                {announcements.map((a, i) => (
                                    <li key={i} className="flex justify-between rounded-md border border-gray-200 p-3">
                                        <div>
                                            <p className="font-medium">{a.title}</p>
                                            <p className="text-sm text-gray-500">{a.content}</p>
                                        </div>
                                        <button className="text-red-600" onClick={() => setAnnouncements(announcements.filter((_, idx) => idx !== i))}>삭제</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-200 px-6 py-4 text-right">
                    <Button variant="outline" onClick={onClose} className="mr-2">취소</Button>
                    {activeTab === 'basic' && (
                        <Button type="submit" form="contest-form" loading={loading}>
                            {mode === 'create' ? '등록' : '저장'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
