import React, { useEffect, useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { TagChip } from '../atoms/TagChip';
import { RichTextEditor } from '../molecules/RichTextEditor';
import {
    adminService,
    CreateProblemPayload,
    UpdateProblemPayload,
    AdminProblemDetail,
} from '../../services/adminService';
import {
    availableLanguages,
    getLanguageBackendValue,
    getLanguageLabel,
    normalizeLanguageKey,
    normalizeLanguageList,
    toBackendLanguageList,

} from '../../lib/problemLanguage';
import { getTagColor } from '../../utils/tagColor';

interface ProblemModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    problemId?: number | null;
    onSuccess: () => void;
}

type ProblemFormState = {
    displayId: string;
    title: string;
    description: string;
    inputDescription: string;
    outputDescription: string;
    difficulty: 'High' | 'Mid' | 'Low';
    timeLimit: string;
    memoryLimit: string;
    ruleType: 'ACM' | 'OI';
    tags: string[];
    visible: boolean;
    hint: string;
    languages: string[];
};

const initialFormState: ProblemFormState = {
    displayId: '',
    title: '',
    description: '',
    inputDescription: '',
    outputDescription: '',
    difficulty: 'Mid',
    timeLimit: '1000',
    memoryLimit: '256',
    ruleType: 'ACM',
    tags: [],
    visible: true,
    hint: '',
    languages: [...availableLanguages],
};

export const ProblemModal: React.FC<ProblemModalProps> = ({
    isOpen,
    onClose,
    mode,
    problemId,
    onSuccess,
}) => {
    const [formState, setFormState] = useState<ProblemFormState>(initialFormState);
    const [samples, setSamples] = useState<Array<{ input: string; output: string }>>([
        { input: '', output: '' },
    ]);
    const [tagInput, setTagInput] = useState('');
    const [testCaseFile, setTestCaseFile] = useState<File | null>(null);
    const [testCaseId, setTestCaseId] = useState('');
    const [isUploadingTestCases, setIsUploadingTestCases] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ success?: string; error?: string }>({});
    const [originalDetail, setOriginalDetail] = useState<AdminProblemDetail | null>(null);

    const [testCaseScores, setTestCaseScores] = useState<Array<{ input_name: string; output_name: string; score: number }>>([]);

    useEffect(() => {
        if (isOpen) {
            setMessage({});
            if (mode === 'edit' && problemId) {
                loadProblemDetail(problemId);
            } else {
                setFormState(initialFormState);
                setSamples([{ input: '', output: '' }]);
                setTestCaseId('');
                setTestCaseScores([]);
                setTestCaseFile(null);
                setOriginalDetail(null);
            }
        }
    }, [isOpen, mode, problemId]);

    const loadProblemDetail = async (id: number) => {
        setLoading(true);
        try {
            const detail = await adminService.getAdminProblemDetail(id);
            setOriginalDetail(detail);

            const resolvedLanguages = normalizeLanguageList(detail.languages);
            const languages = resolvedLanguages.length > 0 ? resolvedLanguages : [...availableLanguages];

            setFormState({
                displayId: detail.displayId ?? '',
                title: detail.title ?? '',
                description: detail.description ?? '',
                inputDescription: detail.inputDescription ?? '',
                outputDescription: detail.outputDescription ?? '',
                difficulty: detail.difficulty,
                timeLimit: String(detail.timeLimit),
                memoryLimit: String(detail.memoryLimit),
                ruleType: detail.ruleType,
                tags: detail.tags,
                visible: detail.visible,
                hint: detail.hint ?? '',
                languages,
            });

            setSamples(detail.samples.length > 0 ? detail.samples : [{ input: '', output: '' }]);
            setTestCaseId(detail.testCaseId);
            setTestCaseScores(detail.testCaseScore);
        } catch (error) {
            setMessage({ error: '문제 정보를 불러오지 못했습니다.' });
        } finally {
            setLoading(false);
        }
    };

    const handleUploadTestCases = async () => {
        if (!testCaseFile) {
            setMessage({ error: '업로드할 테스트케이스 ZIP 파일을 선택하세요.' });
            return;
        }
        try {
            setIsUploadingTestCases(true);
            setMessage({});
            const result = await adminService.uploadProblemTestCases(testCaseFile, false);
            setTestCaseId(result.id);

            // Automatically generate scores: 100 points per case as requested
            let newScores: Array<{ input_name: string; output_name: string; score: number }> = [];
            if (Array.isArray(result.info)) {
                newScores = result.info.map((item: any) => ({
                    input_name: item.input_name,
                    output_name: item.output_name,
                    score: 100
                }));
            }
            setTestCaseScores(newScores);

            setMessage({ success: `테스트케이스 업로드 완료 (ID: ${result.id}, 케이스 ${newScores.length}개)` });
        } catch (error) {
            const msg = error instanceof Error ? error.message : '테스트케이스 업로드 실패';
            setMessage({ error: msg });
        } finally {
            setIsUploadingTestCases(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({});

        if (!formState.displayId.trim()) {
            setMessage({ error: '표시 ID를 입력하세요.' });
            return;
        }

        if (mode === 'create' && !testCaseId) {
            setMessage({ error: '테스트케이스를 업로드해야 합니다.' });
            return;
        }

        const cleanedSamples = samples
            .map((s) => ({ input: s.input.trim(), output: s.output.trim() }))
            .filter((s) => s.input || s.output);

        if (cleanedSamples.length === 0) {
            setMessage({ error: '최소 한 개 이상의 예제를 입력하세요.' });
            return;
        }

        if (formState.tags.length === 0) {
            setMessage({ error: '태그를 입력하세요.' });
            return;
        }

        if (formState.languages.length === 0) {
            setMessage({ error: '최소 한 개 이상의 언어를 선택하세요.' });
            return;
        }

        const backendLanguages = toBackendLanguageList(formState.languages);
        const template = formState.languages.reduce<Record<string, string>>((acc, lang) => {
            const backendKey = getLanguageBackendValue(lang);
            acc[backendKey] = '{}';
            return acc;
        }, {});

        setLoading(true);
        try {
            if (mode === 'create') {
                const payload: CreateProblemPayload = {
                    _id: formState.displayId.trim(),
                    title: formState.title.trim(),
                    description: formState.description,
                    input_description: formState.inputDescription,
                    output_description: formState.outputDescription,
                    samples: cleanedSamples,
                    test_case_id: testCaseId,
                    test_case_score: testCaseScores,
                    time_limit: Number(formState.timeLimit) || 1000,
                    memory_limit: Number(formState.memoryLimit) || 256,
                    languages: backendLanguages,
                    template,
                    rule_type: 'ACM',
                    io_mode: {
                        io_mode: 'Standard IO',
                        input: 'input.txt',
                        output: 'output.txt',
                    },
                    spj: false,
                    spj_language: null,
                    spj_code: null,
                    spj_compile_ok: false,
                    visible: formState.visible,
                    difficulty: formState.difficulty,
                    tags: formState.tags,
                    hint: formState.hint.trim() || null,
                    source: null,
                    share_submission: false,
                };
                await adminService.createProblem(payload);
            } else {
                if (!originalDetail || !problemId) return;
                const payload: UpdateProblemPayload = {
                    id: problemId,
                    _id: formState.displayId.trim(),
                    title: formState.title.trim(),
                    description: formState.description,
                    input_description: formState.inputDescription,
                    output_description: formState.outputDescription,
                    samples: cleanedSamples,
                    test_case_id: testCaseId || originalDetail.testCaseId,
                    test_case_score: testCaseScores.length > 0 ? testCaseScores : originalDetail.testCaseScore,
                    time_limit: Number(formState.timeLimit) || originalDetail.timeLimit,
                    memory_limit: Number(formState.memoryLimit) || originalDetail.memoryLimit,
                    languages: backendLanguages,
                    template: originalDetail.template, // Keep existing template or update? Assuming keep for now or simple update
                    rule_type: 'ACM',
                    io_mode: {
                        io_mode: 'Standard IO',
                        input: 'input.txt',
                        output: 'output.txt',
                    },
                    spj: originalDetail.spj,
                    spj_language: originalDetail.spjLanguage,
                    spj_code: originalDetail.spjCode,
                    spj_compile_ok: originalDetail.spjCompileOk,
                    visible: formState.visible,
                    difficulty: formState.difficulty,
                    tags: formState.tags,
                    hint: formState.hint.trim() || null,
                    source: null,
                    share_submission: false,
                };
                await adminService.updateAdminProblem(payload);
            }
            onSuccess();
            onClose();
        } catch (error) {
            const msg = error instanceof Error ? error.message : '작업 실패';
            setMessage({ error: msg });
        } finally {
            setLoading(false);
        }
    };



    const handleAddTag = () => {
        const newTag = tagInput.trim();
        if (!newTag) return;
        if (formState.tags.includes(newTag)) {
            setTagInput('');
            return;
        }
        setFormState(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
        setTagInput('');
    };

    const handleRemoveTag = (tag: string) => {
        setFormState(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    };

    const toggleLanguage = (lang: string) => {
        const normalized = normalizeLanguageKey(lang);
        if (!normalized) return;
        setFormState((prev) => {
            const current = new Set(prev.languages);
            if (current.has(normalized)) current.delete(normalized);
            else current.add(normalized);
            return { ...prev, languages: availableLanguages.filter((l) => current.has(l)) };
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75 backdrop-blur-sm" aria-hidden="true" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block w-full text-left align-bottom transition-all transform bg-white shadow-2xl rounded-2xl sm:my-8 sm:align-middle sm:max-w-4xl">
                    <div className="px-4 pt-5 pb-4 bg-white sm:p-8">
                        <h3 className="text-2xl font-bold leading-6 text-gray-900 mb-6">
                            {mode === 'create' ? '문제 등록' : '문제 수정'}
                        </h3>

                        {message.error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{message.error}</div>}
                        {message.success && <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-600">{message.success}</div>}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input
                                    label="표시 ID"
                                    value={formState.displayId}
                                    onChange={(e) => setFormState({ ...formState, displayId: e.target.value })}
                                    required
                                />
                                <Input
                                    label="제목"
                                    value={formState.title}
                                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                                    required
                                />
                                <Input
                                    label="시간 제한 (ms)"
                                    type="number"
                                    value={formState.timeLimit}
                                    onChange={(e) => setFormState({ ...formState, timeLimit: e.target.value })}
                                />
                                <Input
                                    label="메모리 제한 (MB)"
                                    type="number"
                                    value={formState.memoryLimit}
                                    onChange={(e) => setFormState({ ...formState, memoryLimit: e.target.value })}
                                />
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">태그</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <Input
                                                    value={tagInput}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddTag();
                                                        }
                                                    }}
                                                    placeholder="태그 입력"
                                                />
                                            </div>
                                            <Button type="button" onClick={handleAddTag}>추가</Button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">난이도</label>
                                        <select
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                                            value={formState.difficulty}
                                            onChange={(e) => setFormState({ ...formState, difficulty: e.target.value as any })}
                                        >
                                            <option value="Low">Level1</option>
                                            <option value="Mid">Level2</option>
                                            <option value="High">Level3</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 rounded-md border border-dashed border-gray-300 bg-gray-50">
                                        {formState.tags.length === 0 ? (
                                            <span className="text-sm text-gray-400 self-center ml-2">등록된 태그가 없습니다.</span>
                                        ) : (
                                            formState.tags.map((tag) => (
                                                <TagChip
                                                    key={tag}
                                                    label={tag}
                                                    onClick={() => handleRemoveTag(tag)}
                                                    colorScheme={getTagColor(tag)}
                                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                                />
                                            ))
                                        )}
                                    </div>
                                    <div className="flex items-center justify-end h-full">
                                        <label className="inline-flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formState.visible}
                                                onChange={(e) => setFormState({ ...formState, visible: e.target.checked })}
                                                className="rounded border-gray-300 text-[#a855f7] focus:ring-[#a855f7]"
                                            />
                                            <span className="text-sm font-medium text-gray-700">공개</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* <Input
                                label="힌트"
                                value={formState.hint}
                                onChange={(e) => setFormState({ ...formState, hint: e.target.value })}
                            /> */}

                            <div className="space-y-4">
                                <RichTextEditor
                                    label="문제 설명"
                                    value={formState.description}
                                    onChange={(val) => setFormState({ ...formState, description: val })}
                                />
                                <RichTextEditor
                                    label="입력 설명"
                                    value={formState.inputDescription}
                                    onChange={(val) => setFormState({ ...formState, inputDescription: val })}
                                />
                                <RichTextEditor
                                    label="출력 설명"
                                    value={formState.outputDescription}
                                    onChange={(val) => setFormState({ ...formState, outputDescription: val })}
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-lg font-semibold text-gray-900">예제 입출력</h4>
                                    <Button type="button" variant="outline" size="sm" onClick={() => setSamples([...samples, { input: '', output: '' }])}>
                                        예제 추가
                                    </Button>
                                </div>
                                {samples.map((sample, idx) => (
                                    <div key={idx} className="grid gap-3 md:grid-cols-2 border p-4 rounded-lg">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">입력 #{idx + 1}</label>
                                            <textarea
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 resize-none"
                                                rows={3}
                                                value={sample.input}
                                                onChange={(e) => {
                                                    const newSamples = [...samples];
                                                    newSamples[idx].input = e.target.value;
                                                    setSamples(newSamples);
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">출력 #{idx + 1}</label>
                                            <textarea
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 resize-none"
                                                rows={3}
                                                value={sample.output}
                                                onChange={(e) => {
                                                    const newSamples = [...samples];
                                                    newSamples[idx].output = e.target.value;
                                                    setSamples(newSamples);
                                                }}
                                            />
                                        </div>
                                        {samples.length > 1 && (
                                            <div className="md:col-span-2 flex justify-end">
                                                <Button type="button" variant="ghost" onClick={() => setSamples(samples.filter((_, i) => i !== idx))}>
                                                    삭제
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-lg font-semibold text-gray-900">지원 언어</h4>
                                <div className="flex flex-wrap gap-3">
                                    {availableLanguages.map((lang) => (
                                        <label key={lang} className="inline-flex items-center space-x-2 rounded-md border border-gray-300 px-3 py-1 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={formState.languages.includes(lang)}
                                                onChange={() => toggleLanguage(lang)}
                                            />
                                            <span>{getLanguageLabel(lang)}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-lg font-semibold text-gray-900">테스트케이스</h4>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="file"
                                        accept=".zip"
                                        onChange={(e) => setTestCaseFile(e.target.files?.[0] ?? null)}
                                    />
                                    <Button type="button" variant="outline" loading={isUploadingTestCases} onClick={handleUploadTestCases}>
                                        업로드
                                    </Button>
                                    {testCaseId && <span className="text-sm text-green-600">ID: {testCaseId}</span>}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={onClose}>취소</Button>
                                <Button type="submit" loading={loading}>{mode === 'create' ? '등록' : '수정'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
