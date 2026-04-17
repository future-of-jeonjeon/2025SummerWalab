import React, { useEffect, useRef, useState } from 'react';
import { contestService } from '../../../services/contestService';
import { adminService } from '../../../services/adminService';
import { Button } from '../../../components/atoms/Button';
import { CreateContestRequest, Contest, AdminContest, Problem } from '../../../types';
import { ProblemRegistrationModal } from '../../contribution/components/ProblemRegistrationModal';

type ModalContext = 'organization' | 'admin';

type ContestLike = Contest | AdminContest;

interface CreateContestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    organizationId?: number;
    initialData?: ContestLike;
    context?: ModalContext;
    contestId?: number | null;
    initialTab?: 'basic' | 'problems';
    lockTab?: boolean;
}

const SUPPORTED_LANGUAGES = ['C', 'C++', 'Java', 'Python3', 'JavaScript', 'Golang'];

const toDatetimeLocal = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const CreateContestModal: React.FC<CreateContestModalProps> = ({
    isOpen,
    onClose,
    organizationId,
    onSuccess,
    initialData,
    context = 'organization',
    contestId,
    initialTab = 'basic',
}) => {
    const isAdmin = context === 'admin';
    const isEditMode = Boolean(initialData);
    const editContestId = contestId ?? initialData?.id ?? null;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'basic' | 'problems'>(initialTab);
    const [problemMessage, setProblemMessage] = useState<{ success?: string; error?: string }>({});
    const [isProblemCreateModalOpen, setIsProblemCreateModalOpen] = useState(false);
    const [problemImportLoading, setProblemImportLoading] = useState(false);
    const [problemImportProgress, setProblemImportProgress] = useState<{ processed: number; total: number } | null>(null);
    const problemImportFileRef = useRef<HTMLInputElement | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        rule_type: 'ACM' as 'ACM' | 'OI',
        password: '',
        visible: true,
        real_time_rank: true,
        allowed_ip_ranges: '',
        languages: SUPPORTED_LANGUAGES,
        requires_approval: false,
        is_organization_only: false,
        is_public: false,
    });
    const [resolvedOrganizationId, setResolvedOrganizationId] = useState<number | null>(
        (initialData as AdminContest | undefined)?.organization_id ??
        organizationId ??
        null
    );

    const [contestProblems, setContestProblems] = useState<Problem[]>([]);
    const [problemInput, setProblemInput] = useState('');
    const [problemSearch, setProblemSearch] = useState<{ results: Problem[]; loading: boolean; error: string | null }>({
        results: [],
        loading: false,
        error: null,
    });
    const problemSearchTimerRef = useRef<number | null>(null);
    const dragItemRef = useRef<number | null>(null);
    const dragOverItemRef = useRef<number | null>(null);
    const [editingProblemId, setEditingProblemId] = useState<number | undefined>(undefined);

    useEffect(() => {
        if (!isOpen) return;

        if (initialData) {
            setFormData({
                title: initialData.title || '',
                description: initialData.description || '',
                start_time: toDatetimeLocal(initialData.startTime),
                end_time: toDatetimeLocal(initialData.endTime),
                rule_type: (initialData.ruleType as 'ACM' | 'OI') || 'ACM',
                password: '',
                visible: initialData.visible ?? true,
                real_time_rank:
                    (initialData as AdminContest).real_time_rank ??
                    initialData.realTimeRank ??
                    true,
                allowed_ip_ranges: ((initialData as AdminContest).allowed_ip_ranges ?? []).join(', '),
                languages: initialData.languages && initialData.languages.length > 0 ? initialData.languages : SUPPORTED_LANGUAGES,
                requires_approval:
                    (initialData as AdminContest).requires_approval ??
                    initialData.requiresApproval ??
                    false,
                is_organization_only: initialData.isOrganizationOnly || false,
                is_public: initialData.isPublic || false,
            });
        } else {
            setFormData({
                title: '',
                description: '',
                start_time: '',
                end_time: '',
                rule_type: 'ACM',
                password: '',
                visible: true,
                real_time_rank: true,
                allowed_ip_ranges: '',
                languages: SUPPORTED_LANGUAGES,
                requires_approval: false,
                is_organization_only: false,
                is_public: false,
            });
            setContestProblems([]);
            setResolvedOrganizationId(organizationId ?? null);
        }

        setError('');
        setProblemMessage({});
        setProblemInput('');
        setProblemSearch({ results: [], loading: false, error: null });
        setActiveTab('basic');
        setActiveTab(initialTab);
    }, [initialData, initialTab, isOpen]);

    useEffect(() => {
        if (!isOpen || !isEditMode || !editContestId) {
            return;
        }

        const fetchContestDetail = async () => {
            try {
                const detail = isAdmin
                    ? await adminService.getContestDetail(editContestId)
                    : await contestService.getContest(editContestId);
                setFormData({
                    title: detail.title || '',
                    description: detail.description || '',
                    start_time: toDatetimeLocal(detail.startTime),
                    end_time: toDatetimeLocal(detail.endTime),
                    rule_type: (detail.ruleType as 'ACM' | 'OI') || 'ACM',
                    password: '',
                    visible: detail.visible ?? true,
                    real_time_rank:
                        (detail as AdminContest).real_time_rank ??
                        detail.realTimeRank ??
                        true,
                    allowed_ip_ranges: ((detail as AdminContest).allowed_ip_ranges ?? []).join(', '),
                    languages: detail.languages && detail.languages.length > 0 ? detail.languages : SUPPORTED_LANGUAGES,
                    requires_approval:
                        (detail as AdminContest).requires_approval ??
                        detail.requiresApproval ??
                        false,
                    is_organization_only: detail.isOrganizationOnly || false,
                    is_public: detail.isPublic || false,
                });
                const orgId = (detail as any)?.organization_id ?? (detail as any)?.organizationId ?? null;
                if (orgId != null) {
                    setResolvedOrganizationId(orgId);
                }
            } catch {
                setError('대회 상세 정보를 불러오지 못했습니다.');
            }
        };

        const fetchProblems = async () => {
            try {
                const problems = await adminService.getContestProblems(editContestId);
                const normalized = (Array.isArray(problems) ? problems : []).sort((a, b) => {
                    const aId = Number(a.displayId) || 0;
                    const bId = Number(b.displayId) || 0;
                    return aId - bId;
                });
                setContestProblems(normalized);
            } catch {
                setProblemMessage({ error: '대회 문제를 불러오지 못했습니다.' });
            }
        };

        fetchContestDetail();
        fetchProblems();
    }, [editContestId, isAdmin, isEditMode, isOpen]);

    useEffect(() => {
        return () => {
            if (problemSearchTimerRef.current) {
                window.clearTimeout(problemSearchTimerRef.current);
                problemSearchTimerRef.current = null;
            }
        };
    }, []);

    if (!isOpen) return null;

    const handleLanguageChange = (lang: string) => {
        setFormData((prev) => {
            if (prev.languages.includes(lang)) {
                return { ...prev, languages: prev.languages.filter((l) => l !== lang) };
            }
            return { ...prev, languages: [...prev.languages, lang] };
        });
    };

    const handleSearchProblem = (keyword: string) => {
        setProblemInput(keyword);
        setProblemMessage({});

        if (problemSearchTimerRef.current) {
            window.clearTimeout(problemSearchTimerRef.current);
            problemSearchTimerRef.current = null;
        }

        const trimmed = keyword.trim();
        if (!trimmed) {
            setProblemSearch({ results: [], loading: false, error: null });
            return;
        }

        problemSearchTimerRef.current = window.setTimeout(async () => {
            setProblemSearch({ results: [], loading: true, error: null });
            try {
                const results = await adminService.searchAdminProblems({ keyword: trimmed, limit: 10, offset: 0 });
                setProblemSearch({ results, loading: false, error: null });
            } catch {
                setProblemSearch({ results: [], loading: false, error: '문제 검색에 실패했습니다.' });
            }
        }, 300);
    };

    const ensureDisplayIds = (items: Problem[]) => {
        const used = new Set<string>();
        const nextId = () => {
            let i = 1;
            while (used.has(String(i))) i += 1;
            return String(i);
        };
        return items.map((problem) => {
            const current = (problem as any).displayId ?? (problem as any)._id;
            if (current && !used.has(String(current))) {
                used.add(String(current));
                return { ...problem, displayId: String(current) };
            }
            const assigned = nextId();
            used.add(assigned);
            return { ...problem, displayId: assigned };
        });
    };

    const handleAddProblem = (problem: Problem) => {
        if (contestProblems.some((p) => p.id === problem.id)) {
            setProblemMessage({ error: '이미 등록된 문제입니다.' });
            return;
        }

        setContestProblems((prev) => ensureDisplayIds([...prev, problem]));
        setProblemInput('');
        setProblemSearch({ results: [], loading: false, error: null });
        setProblemMessage({ success: '문제를 추가했습니다.' });
    };

    const handleDeleteProblem = async (problemId: number) => {
        if (isEditMode && editContestId) {
            try {
                const hasSubmission = await contestService.hasContestProblemSubmission(editContestId, problemId);
                if (hasSubmission) {
                    setProblemMessage({ error: '제출 기록이 있는 문제는 삭제할 수 없습니다.' });
                    return;
                }
            } catch (err: any) {
                setProblemMessage({ error: err?.message || '문제 삭제 가능 여부를 확인하지 못했습니다.' });
                return;
            }
        }

        const updated = contestProblems.filter((p) => p.id !== problemId);
        setContestProblems(updated);
        setProblemMessage({ success: '문제를 삭제했습니다.' });
    };

    const handleSortProblems = () => {
        if (dragItemRef.current === null || dragOverItemRef.current === null) {
            return;
        }
        if (dragItemRef.current === dragOverItemRef.current) {
            return;
        }

        const next = [...contestProblems];
        const dragged = next[dragItemRef.current];
        next.splice(dragItemRef.current, 1);
        next.splice(dragOverItemRef.current, 0, dragged);

        dragItemRef.current = null;
        dragOverItemRef.current = null;
        setContestProblems(next);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const extractErrorMessage = (err: any, fallback: string) =>
            err?.response?.data?.detail?.message ||
            err?.response?.data?.message ||
            err?.message ||
            fallback;

        if (!formData.start_time || !formData.end_time) {
            setError('시작 시간과 종료 시간을 입력해주세요.');
            return;
        }

        if (new Date(formData.start_time) >= new Date(formData.end_time)) {
            setError('종료 시간은 시작 시간보다 뒤여야 합니다.');
            return;
        }

        if (!isAdmin && !organizationId) {
            setError('organizationId가 필요합니다.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const allowedIpRanges = formData.allowed_ip_ranges
                ? formData.allowed_ip_ranges.split(',').map((ip) => ip.trim()).filter((ip) => ip.length > 0)
                : [];

            const organizationIdForPayload =
                resolvedOrganizationId ??
                (initialData as AdminContest | undefined)?.organization_id ??
                organizationId ??
                null;

            if (isAdmin && (!organizationIdForPayload || organizationIdForPayload <= 0)) {
                setError('organization_id를 확인할 수 없습니다. 다시 시도해주세요.');
                setLoading(false);
                return;
            }

            if (isAdmin) {
                const payload = {
                    title: formData.title,
                    description: formData.description,
                    start_time: new Date(formData.start_time).toISOString(),
                    end_time: new Date(formData.end_time).toISOString(),
                    rule_type: formData.rule_type,
                    password: formData.password || undefined,
                    visible: formData.visible,
                    real_time_rank: formData.real_time_rank,
                    allowed_ip_ranges: allowedIpRanges,
                    requires_approval: formData.requires_approval,
                    is_organization_only: formData.is_organization_only,
                    is_public: formData.is_public,
                    languages: formData.languages,
                    problems: contestProblems.map((p, index) => ({
                        problem_id: p.id,
                        display_id: (p as any).displayId ?? (p as any)._id ?? String(index + 1),
                    })),
                    organization_id: organizationIdForPayload!,
                };

                if (isEditMode && editContestId) {
                    const { problems, ...metaPayload } = payload;
                    await adminService.updateContest({
                        ...metaPayload,
                        id: editContestId,
                        password: formData.password || null,
                        organization_id: organizationIdForPayload!,
                    });
                    await adminService.updateContestProblems(editContestId, contestProblems);
                    await adminService.reindexContestProblems(editContestId, contestProblems);
                } else {
                    await adminService.createContest(payload);
                }
            } else {
                const dataToSubmit: CreateContestRequest = {
                    title: formData.title,
                    description: formData.description,
                    start_time: new Date(formData.start_time).toISOString(),
                    end_time: new Date(formData.end_time).toISOString(),
                    rule_type: formData.rule_type,
                    password: formData.password || null,
                    visible: true,
                    real_time_rank: formData.real_time_rank,
                    allowed_ip_ranges: allowedIpRanges,
                    requires_approval: formData.requires_approval,
                    is_organization_only: formData.is_organization_only,
                    is_public: formData.is_public,
                    languages: formData.languages,
                    organization_id: organizationId!,
                    problems: contestProblems.map((p, index) => ({
                        problem_id: p.id,
                        display_id: (p as any).displayId ?? (p as any)._id ?? String(index + 1),
                    })),
                };

                if (isEditMode && editContestId) {
                    const { problems, ...metaPayload } = dataToSubmit;
                    await contestService.update(editContestId, metaPayload);
                    await contestService.updateContestProblems(editContestId, contestProblems);
                    await contestService.reindexContestProblems(editContestId, contestProblems);
                } else {
                    await contestService.create(dataToSubmit);
                }
            }

            onSuccess();
        } catch (err: any) {
            setError(extractErrorMessage(err, isEditMode ? '대회 수정에 실패했습니다.' : '대회 생성에 실패했습니다.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
                <div
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
                    aria-hidden="true"
                />

                <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

                <div className="inline-block h-[92vh] w-full transform overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 text-left align-bottom shadow-2xl transition-all sm:my-8 sm:h-[760px] sm:max-w-2xl sm:align-middle">
                    <div className="flex h-full flex-col">
                        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 px-8 pb-6 pt-8">
                            <div className="w-full">
                                <h3 className="text-2xl font-bold leading-6 tracking-tight text-gray-900 dark:text-slate-100" id="modal-title">
                                    {isEditMode ? '대회 수정' : '새 대회 생성'}
                                </h3>
                                <div className="mt-5 mb-4 text-sm text-gray-500 dark:text-slate-400">
                                    {activeTab === 'basic' ? '대회 기본 정보를 수정합니다.' : '대회에 포함될 문제를 관리합니다.'}
                                </div>

                                {error && (
                                    <div className="mt-4 flex items-center rounded-lg border border-red-100 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
                                        <svg className="mr-2 h-5 w-5 text-red-400 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {error}
                                    </div>
                                )}

                                <form id="contest-form" onSubmit={handleSubmit} className="mt-6 space-y-6">
                                    {activeTab === 'basic' && (
                                        <>
                                            <div>
                                                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-300">대회 제목</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="block w-full rounded-lg border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 shadow-sm transition-colors focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-blue-500"
                                                    value={formData.title}
                                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-300">시작 시간</label>
                                                    <input
                                                        type="datetime-local"
                                                        required
                                                        className="block w-full rounded-lg border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 shadow-sm transition-colors focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-blue-500"
                                                        value={formData.start_time}
                                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-300">종료 시간</label>
                                                    <input
                                                        type="datetime-local"
                                                        required
                                                        className="block w-full rounded-lg border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 shadow-sm transition-colors focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-blue-500"
                                                        value={formData.end_time}
                                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-300">설명</label>
                                                <textarea
                                                    rows={4}
                                                    required
                                                    className="block w-full resize-none rounded-lg border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 shadow-sm transition-colors focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-blue-500"
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-300">비밀번호 <span className="text-xs font-normal text-gray-400 dark:text-slate-500">(선택)</span></label>
                                                <input
                                                    type="password"
                                                    autoComplete="new-password"
                                                    className="block w-full rounded-lg border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 shadow-sm transition-colors focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-blue-500"
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center space-x-2 rounded-lg border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-3">
                                                    <input
                                                        id="is_organization_only"
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 transition-colors focus:ring-blue-500"
                                                        checked={formData.is_organization_only}
                                                        onChange={(e) => setFormData({ ...formData, is_organization_only: e.target.checked })}
                                                    />
                                                    <label htmlFor="is_organization_only" className="ml-2 block cursor-pointer select-none text-sm font-medium text-gray-900 dark:text-slate-100">
                                                        단체 내부 전용 <span className="font-normal text-gray-500 dark:text-slate-400">(외부인 불가)</span>
                                                    </label>
                                                </div>
                                                <div className="flex items-center space-x-2 rounded-lg border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-3">
                                                    <input
                                                        id="requires_approval"
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 transition-colors focus:ring-blue-500"
                                                        checked={formData.requires_approval}
                                                        onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                                                    />
                                                    <label htmlFor="requires_approval" className="ml-2 block cursor-pointer select-none text-sm font-medium text-gray-900 dark:text-slate-100">
                                                        참가 승인 필요
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="flex items-center space-x-2 rounded-lg border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-3">
                                                    <input
                                                        id="is_public"
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 transition-colors focus:ring-blue-500"
                                                        checked={formData.is_public}
                                                        onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                                                    />
                                                    <label htmlFor="is_public" className="ml-2 block cursor-pointer select-none text-sm font-medium text-gray-900 dark:text-slate-100">
                                                        대회 공개
                                                    </label>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-300">
                                                    허용 IP 범위 <span className="text-xs font-normal text-gray-400 dark:text-slate-500">(선택, 쉼표로 구분)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="block w-full rounded-lg border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 shadow-sm transition-colors focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-blue-500"
                                                    placeholder="예: 192.168.1.1/24, 10.0.0.1"
                                                    value={formData.allowed_ip_ranges}
                                                    onChange={(e) => setFormData({ ...formData, allowed_ip_ranges: e.target.value })}
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2.5 block text-sm font-semibold text-gray-700 dark:text-slate-300">사용 언어</label>
                                                <div className="flex flex-wrap gap-2.5">
                                                    {SUPPORTED_LANGUAGES.map((lang) => (
                                                        <label
                                                            key={lang}
                                                            className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${formData.languages.includes(lang)
                                                                ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only"
                                                                checked={formData.languages.includes(lang)}
                                                                onChange={() => handleLanguageChange(lang)}
                                                            />
                                                            <span>{lang}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {activeTab === 'problems' && (
                                        <div className="space-y-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <h4 className="text-sm font-semibold text-gray-800 dark:text-slate-200">문제 추가</h4>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="text-xs"
                                                        onClick={() => setIsProblemCreateModalOpen(true)}
                                                    >
                                                        문제 생성
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        className="text-xs"
                                                        disabled={!isEditMode || !editContestId || problemImportLoading}
                                                        onClick={() => {
                                                            if (!isEditMode || !editContestId) {
                                                                setProblemMessage({ error: '대회 생성 후에 문제를 불러올 수 있습니다.' });
                                                                return;
                                                            }
                                                            problemImportFileRef.current?.click();
                                                        }}
                                                    >
                                                        {problemImportLoading ? '불러오는 중...' : '문제 불러오기'}
                                                    </Button>
                                                    <input
                                                        ref={problemImportFileRef}
                                                        type="file"
                                                        accept=".zip"
                                                        className="hidden"
                                                        onChange={async (event) => {
                                                            const file = event.target.files?.[0];
                                                            if (!file) return;
                                                            if (!editContestId) {
                                                                setProblemMessage({ error: '대회를 먼저 생성해야 합니다.' });
                                                                return;
                                                            }
                                                            setProblemImportLoading(true);
                                                            setProblemImportProgress({ processed: 0, total: 0 });
                                                            setProblemMessage({});
                                                            try {
                                                                const displayIdStartPoint = contestProblems.reduce((max, item) => {
                                                                    const candidate = Number(item.displayId ?? item.id);
                                                                    if (!Number.isFinite(candidate)) return max;
                                                                    return Math.max(max, candidate);
                                                                }, 0) + 1;
                                                                const { polling_key } = await adminService.importContestProblems(
                                                                    editContestId,
                                                                    file,
                                                                    displayIdStartPoint,
                                                                );
                                                                let isPolling = true;
                                                                while (isPolling) {
                                                                    const status = await adminService.getProblemImportPolling(polling_key);
                                                                    if (status.status === 'done') {
                                                                        setProblemImportProgress({
                                                                            processed: status.processed_problem ?? status.all_problem ?? 0,
                                                                            total: status.all_problem ?? 0,
                                                                        });
                                                                        const refreshed = await adminService.getContestProblems(editContestId);
                                                                        const sorted = (Array.isArray(refreshed) ? refreshed : []).sort((a, b) => {
                                                                            const aId = Number(a.displayId) || 0;
                                                                            const bId = Number(b.displayId) || 0;
                                                                            return aId - bId;
                                                                        });
                                                                        setContestProblems(sorted);
                                                                        setProblemMessage({ success: '문제를 불러왔습니다.' });
                                                                        isPolling = false;
                                                                    } else if (status.status === 'error') {
                                                                        throw new Error(status.error_message || `문제 불러오기 실패: ${status.error_code || '알 수 없는 오류'}`);
                                                                    } else {
                                                                        setProblemImportProgress({
                                                                            processed: status.processed_problem ?? 0,
                                                                            total: status.all_problem ?? 0,
                                                                        });
                                                                        await new Promise((resolve) => setTimeout(resolve, 1000));
                                                                    }
                                                                }
                                                            } catch (error) {
                                                                const message = error instanceof Error ? error.message : '문제 불러오기에 실패했습니다.';
                                                                setProblemMessage({ error: message });
                                                                if (typeof window !== 'undefined') {
                                                                    window.alert(message);
                                                                }
                                                            } finally {
                                                                setProblemImportLoading(false);
                                                                setProblemImportProgress(null);
                                                                if (problemImportFileRef.current) {
                                                                    problemImportFileRef.current.value = '';
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <>

                                                {problemMessage.error && <div className="rounded-md bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-300">{problemMessage.error}</div>}
                                                {problemMessage.success && <div className="rounded-md bg-green-50 dark:bg-emerald-900/20 px-3 py-2 text-xs text-green-600 dark:text-emerald-300">{problemMessage.success}</div>}
                                                {problemImportLoading && problemImportProgress && (
                                                    <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                                                        문제 불러오는 중... {problemImportProgress.processed}/{problemImportProgress.total}
                                                    </div>
                                                )}

                                                <div className="grid gap-2 sm:grid-cols-[1fr]">
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            className="block w-full rounded-lg border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 shadow-sm transition-colors focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-blue-500"
                                                            placeholder="문제 검색 (ID, 표시 ID, 제목)"
                                                            value={problemInput}
                                                            onChange={(e) => handleSearchProblem(e.target.value)}
                                                        />
                                                        {problemSearch.loading && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">검색 중...</p>}
                                                        {problemSearch.error && <p className="mt-1 text-xs text-red-600">{problemSearch.error}</p>}
                                                        {problemSearch.results.length > 0 && (
                                                            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                                                                {problemSearch.results.map((result) => (
                                                                    <li key={`problem-search-${result.id}`}>
                                                                        <button
                                                                            type="button"
                                                                            className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800"
                                                                            onClick={() => handleAddProblem(result)}
                                                                        >
                                                                            {result.title}
                                                                        </button>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                                    문제를 추가한 뒤 드래그해서 순서 배열 가능
                                                </p>

                                                {contestProblems.length === 0 ? (
                                                    <p className="text-xs text-gray-500 dark:text-slate-400">등록된 문제가 없습니다.</p>
                                                ) : (
                                                    <div className="max-h-56 overflow-auto rounded-lg border border-gray-200 dark:border-slate-700">
                                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                                            <thead className="bg-gray-50 dark:bg-slate-800">
                                                                <tr>
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400">표시 ID</th>
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400">문제명</th>
                                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-slate-400">관리</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
                                                                {contestProblems.map((problem, index) => (
                                                                    <tr
                                                                        key={`contest-problem-${problem.id}-${problem.displayId || ''}`}
                                                                        className="cursor-move hover:bg-gray-50 dark:hover:bg-slate-800"
                                                                        draggable
                                                                        onDragStart={() => {
                                                                            dragItemRef.current = index;
                                                                        }}
                                                                        onDragEnter={() => {
                                                                            dragOverItemRef.current = index;
                                                                        }}
                                                                        onDragEnd={handleSortProblems}
                                                                        onDragOver={(event) => event.preventDefault()}
                                                                    >
                                                                        <td className="px-3 py-2 text-sm text-gray-700 dark:text-slate-300">{index + 1}</td>
                                                                        <td className="px-3 py-2 text-sm text-gray-800 dark:text-slate-100">
                                                                            <button
                                                                                type="button"
                                                                                className="text-left w-full hover:text-blue-600 dark:hover:text-blue-300 underline underline-offset-2 decoration-dashed"
                                                                                onClick={() => {
                                                                                    setEditingProblemId(problem.id);
                                                                                    setIsProblemCreateModalOpen(true);
                                                                                }}
                                                                            >
                                                                                {problem.title}
                                                                            </button>
                                                                        </td>
                                                                        <td className="px-3 py-2 text-right">
                                                                            <button
                                                                                type="button"
                                                                                className="text-xs font-medium text-red-600 hover:text-red-700"
                                                                                onClick={() => void handleDeleteProblem(problem.id)}
                                                                            >
                                                                                삭제
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </>
                                        </div>
                                    )}

                                </form>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/70 px-8 py-5">
                            <div className="flex items-center justify-end gap-3">
                                <Button
                                    onClick={onClose}
                                    variant="outline"
                                    className="sm:text-sm"
                                >
                                    취소
                                </Button>
                                {(activeTab === 'basic' || activeTab === 'problems') && (
                                    <Button
                                        type="submit"
                                        form="contest-form"
                                        disabled={loading}
                                        className="sm:text-sm"
                                    >
                                        {loading ? (isEditMode ? '수정 중...' : '생성 중...') : (isEditMode ? '수정하기' : '생성하기')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ProblemRegistrationModal
                isOpen={isProblemCreateModalOpen}
                editProblemId={editingProblemId}
                contestId={isEditMode ? (editContestId ?? undefined) : undefined}
                onClose={() => {
                    setIsProblemCreateModalOpen(false);
                    setEditingProblemId(undefined);
                }}
                onSuccess={async (created?: { problemId: number; title?: string }) => {
                    setIsProblemCreateModalOpen(false);
                    setEditingProblemId(undefined);
                    if (created && created.problemId) {
                        setProblemMessage({ success: '문제를 생성했습니다.' });
                        try {
                            if (isEditMode && editContestId) {
                                const refreshed = await adminService.getContestProblems(editContestId);
                                const sorted = (Array.isArray(refreshed) ? refreshed : []).sort((a, b) => {
                                    const aId = Number(a.displayId) || 0;
                                    const bId = Number(b.displayId) || 0;
                                    return aId - bId;
                                });
                                setContestProblems(sorted);
                                setProblemMessage({ success: `'${created.title || '새 문제'}' 문제가 대회에 등록되었습니다.` });
                            } else {
                                const newProblemDetail = await adminService.getAdminProblemDetail(created.problemId);
                                const normalizedProblem: Problem = {
                                    id: newProblemDetail.id,
                                    title: newProblemDetail.title,
                                    description: newProblemDetail.description,
                                    difficulty: newProblemDetail.difficulty,
                                    timeLimit: newProblemDetail.timeLimit,
                                    memoryLimit: newProblemDetail.memoryLimit,
                                    createTime: new Date().toISOString(),
                                    tags: newProblemDetail.tags,
                                    languages: newProblemDetail.languages,
                                };
                                setContestProblems((prev) => {
                                    if (prev.some((p) => p.id === normalizedProblem.id)) return prev;
                                    return ensureDisplayIds([...prev, normalizedProblem]);
                                });
                                setProblemMessage({ success: `'${newProblemDetail.title}' 문제를 자동으로 추가했습니다.` });
                            }

                            setProblemInput('');
                        } catch {
                            setProblemMessage({ error: '문제 생성 후 자동 추가에 실패했습니다.' });
                        }
                    } else if (editingProblemId && isEditMode && editContestId) {
                        // 문제 수정 후 리스트 새로고침
                        try {
                            const refreshed = await adminService.getContestProblems(editContestId);
                            const sorted = (Array.isArray(refreshed) ? refreshed : []).sort((a, b) => {
                                const aId = Number(a.displayId) || 0;
                                const bId = Number(b.displayId) || 0;
                                return aId - bId;
                            });
                            setContestProblems(sorted);
                            setProblemMessage({ success: '문제 정보를 업데이트했습니다.' });
                        } catch {
                            setProblemMessage({ error: '문제 수정 후 목록 갱신에 실패했습니다.' });
                        }
                    } else {
                        setProblemMessage({ success: '문제가 등록/수정되었습니다.' });
                    }
                }}
            />
        </div>
    );
};
