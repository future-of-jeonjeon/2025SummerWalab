import React, { useState } from 'react';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import { RichTextEditor } from '../../../components/molecules/RichTextEditor';
import { TagChip } from '../../../components/atoms/TagChip';
import { getTagColor } from '../../../utils/tagColor';
import { CreateProblemPayload } from '../../../services/adminService';
import { contributionService } from '../../../services/contributionService';
import { availableLanguages, toBackendLanguageList, getLanguageBackendValue, getLanguageLabel, normalizeLanguageKey } from '../../../lib/problemLanguage';
import codeTemplates from '../../../config/codeTemplates.json';

interface ProblemRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type ProblemFormState = {
    title: string;
    description: string;
    inputDescription: string;
    outputDescription: string;
    difficulty: 'High' | 'Mid' | 'Low';
    timeLimit: string;
    memoryLimit: string;
    tags: string[];
    useHint: boolean;
    hint: string;
    languages: string[];
    selectedTemplateLanguages: string[];
    templates: Record<string, string>;
    solutionLanguage: string;
    solutionCode: string;
};

const initialFormState: ProblemFormState = {
    title: '',
    description: '',
    inputDescription: '',
    outputDescription: '',
    difficulty: 'Mid',
    timeLimit: '1000',
    memoryLimit: '256',
    tags: [],
    useHint: false,
    hint: '',
    languages: [...availableLanguages],
    selectedTemplateLanguages: [],
    templates: {},
    solutionLanguage: availableLanguages[0] || 'C',
    solutionCode: '',
};

export const ProblemRegistrationModal: React.FC<ProblemRegistrationModalProps> = ({
    isOpen, onClose, onSuccess
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


    React.useEffect(() => {
        if (isOpen) {
            setFormState(initialFormState);
            setSamples([{ input: '', output: '' }]);
            setTestCaseId('');
            setTestCaseFile(null);
            setMessage({});
            // Initialize templates
            const initialTemplates = availableLanguages.reduce((acc, lang) => {
                acc[lang] = (codeTemplates as any)[lang] || '';
                return acc;
            }, {} as Record<string, string>);
            setFormState(prev => ({ ...prev, templates: initialTemplates }));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleUploadTestCases = async () => {
        if (!testCaseFile) {
            setMessage({ error: '업로드할 테스트케이스 ZIP 파일을 선택하세요.' });
            return;
        }
        try {
            setIsUploadingTestCases(true);
            setMessage({});
            const result = await contributionService.uploadProblemTestCases(testCaseFile, false);
            setTestCaseId(result.id);

            let newScores: Array<{ input_name: string; output_name: string; score: number }> = [];
            if (Array.isArray(result.info)) {
                newScores = result.info.map((item: any) => ({
                    input_name: item.input_name,
                    output_name: item.output_name,
                    score: 100
                }));
            }
            setMessage({ success: `테스트케이스 업로드 완료 (ID: ${result.id}, 케이스 ${newScores.length}개)` });
        } catch (error) {
            const msg = error instanceof Error ? error.message : '테스트케이스 업로드 실패';
            setMessage({ error: msg });
        } finally {
            setIsUploadingTestCases(false);
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

    const toggleTemplateLanguage = (lang: string) => {
        const normalized = normalizeLanguageKey(lang);
        if (!normalized) return;
        setFormState((prev) => {
            const current = new Set(prev.selectedTemplateLanguages);
            if (current.has(normalized)) current.delete(normalized);
            else current.add(normalized);
            return { ...prev, selectedTemplateLanguages: availableLanguages.filter((l) => current.has(l)) };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({});

        if (!testCaseId) {
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

        setLoading(true);

        try {
            const payload: CreateProblemPayload = {
                title: formState.title.trim(),
                description: formState.description,
                input_description: formState.inputDescription,
                output_description: formState.outputDescription,
                samples: cleanedSamples,
                time_limit: Number(formState.timeLimit) || 1000,
                memory_limit: Number(formState.memoryLimit) || 256,
                languages: backendLanguages,
                template: Object.entries(formState.templates).reduce((acc, [lang, code]) => {
                    // Only include templates if the language is selected for templates
                    if (formState.selectedTemplateLanguages.includes(lang)) {
                        acc[getLanguageBackendValue(lang)] = code;
                    }
                    return acc;
                }, {} as Record<string, string>),
                difficulty: formState.difficulty,
                tags: formState.tags,
                hint: formState.useHint ? (formState.hint.trim() || null) : null,
                solution_code: formState.solutionCode,
                solution_code_language: getLanguageBackendValue(formState.solutionLanguage),
                test_case_id: testCaseId,
            };

            const { polling_key } = await contributionService.createProblem(payload);

            let isPolling = true;
            while (isPolling) {
                const status = await contributionService.getPollingStatus(polling_key);
                if (status.status === 'done') {
                    onSuccess();
                    onClose();
                    isPolling = false;
                } else if (status.status === 'error') {
                    throw new Error(`문제 생성 실패: ${status.error_code || '알 수 없는 오류'}`);
                } else {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : '문제 생성 실패';
            setMessage({ error: msg });
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

                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-gray-100">
                    <div className="bg-white px-8 pt-8 pb-6">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                <h3 className="text-2xl font-bold leading-6 text-gray-900 tracking-tight mb-6" id="modal-title">
                                    새 문제 등록
                                </h3>

                                {message.error && (
                                    <div className="mt-4 bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-100 flex items-center mb-6">
                                        <svg className="w-5 h-5 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {message.error}
                                    </div>
                                )}
                                {message.success && (
                                    <div className="mt-4 bg-green-50 text-green-700 p-4 rounded-lg text-sm border border-green-100 flex items-center mb-6">
                                        <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {message.success}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-6">
                                        {/* Title Section */}
                                        <Input
                                            label="제목"
                                            value={formState.title}
                                            onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                                            required
                                            className="bg-gray-50 focus:bg-white transition-colors"
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Left Column: Settings */}
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Input
                                                        label="시간 제한 (ms)"
                                                        type="number"
                                                        value={formState.timeLimit}
                                                        onChange={(e) => setFormState({ ...formState, timeLimit: e.target.value })}
                                                        className="bg-gray-50 focus:bg-white transition-colors"
                                                    />
                                                    <Input
                                                        label="메모리 제한 (MB)"
                                                        type="number"
                                                        value={formState.memoryLimit}
                                                        onChange={(e) => setFormState({ ...formState, memoryLimit: e.target.value })}
                                                        className="bg-gray-50 focus:bg-white transition-colors"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">난이도</label>
                                                    <select
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2.5 px-3 bg-gray-50 focus:bg-white transition-colors"
                                                        value={formState.difficulty}
                                                        onChange={(e) => setFormState({ ...formState, difficulty: e.target.value as any })}
                                                    >
                                                        <option value="Low">Level 1</option>
                                                        <option value="Mid">Level 2</option>
                                                        <option value="High">Level 3</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Right Column: Tags */}
                                            <div className="flex flex-col h-full">
                                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">태그</label>
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
                                                            placeholder="태그 입력 후 Enter"
                                                            className="bg-gray-50 focus:bg-white transition-colors"
                                                        />
                                                    </div>
                                                    <Button type="button" onClick={handleAddTag} className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 h-[42px]">추가</Button>
                                                </div>

                                                <div className="mt-4 flex flex-wrap content-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 min-h-[46px]">
                                                    {formState.tags.length === 0 ? (
                                                        <span className="text-sm text-gray-400">등록된 태그가 없습니다.</span>
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
                                            </div>
                                        </div>
                                    </div>

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

                                        <div className="pt-2">
                                            <div className="flex items-center mb-4">
                                                <input
                                                    id="useHint"
                                                    type="checkbox"
                                                    checked={formState.useHint}
                                                    onChange={(e) => setFormState({ ...formState, useHint: e.target.checked })}
                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors"
                                                />
                                                <label htmlFor="useHint" className="ml-2 block text-sm font-bold text-gray-900 cursor-pointer select-none">
                                                    힌트 제공
                                                </label>
                                            </div>

                                            {formState.useHint && (
                                                <div className="pl-6 border-l-2 border-indigo-100 ml-2">
                                                    <RichTextEditor
                                                        label="힌트 내용"
                                                        value={formState.hint}
                                                        onChange={(val) => setFormState({ ...formState, hint: val })}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-lg font-bold text-gray-900">예제 입출력</h4>
                                            <Button type="button" variant="outline" size="sm" onClick={() => setSamples([...samples, { input: '', output: '' }])} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                                예제 추가
                                            </Button>
                                        </div>
                                        {samples.map((sample, idx) => (
                                            <div key={idx} className="grid gap-4 md:grid-cols-2 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">입력 #{idx + 1}</label>
                                                    <textarea
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 bg-gray-50 focus:bg-white transition-colors resize-none"
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
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">출력 #{idx + 1}</label>
                                                    <textarea
                                                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 bg-gray-50 focus:bg-white transition-colors resize-none"
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
                                                        <Button type="button" variant="ghost" onClick={() => setSamples(samples.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                            삭제
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-6">
                                        {/* Supported Languages Section */}
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900 mb-3">지원 언어</h4>
                                            <div className="flex flex-wrap gap-2.5">
                                                {availableLanguages.map(lang => (
                                                    <label
                                                        key={lang}
                                                        className={`
                                                            inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer transition-all duration-200
                                                            ${formState.languages.includes(lang)
                                                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}
                                                        `}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={formState.languages.includes(lang)}
                                                            onChange={() => toggleLanguage(lang)}
                                                        />
                                                        <span>{getLanguageLabel(lang)}</span>
                                                        {formState.languages.includes(lang) && (
                                                            <svg className="ml-1.5 w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Template Languages Section */}
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900 mb-3">제공 템플릿</h4>
                                            <div className="flex flex-wrap gap-2.5 mb-4">
                                                {availableLanguages.map(lang => (
                                                    <label
                                                        key={`template-${lang}`}
                                                        className={`
                                                            inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer transition-all duration-200
                                                            ${formState.selectedTemplateLanguages.includes(lang)
                                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}
                                                        `}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={formState.selectedTemplateLanguages.includes(lang)}
                                                            onChange={() => toggleTemplateLanguage(lang)}
                                                        />
                                                        <span>{getLanguageLabel(lang)}</span>
                                                        {formState.selectedTemplateLanguages.includes(lang) && (
                                                            <svg className="ml-1.5 w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </label>
                                                ))}
                                            </div>

                                            {/* Template Editors */}
                                            {formState.selectedTemplateLanguages.length > 0 && (
                                                <div className="space-y-4 mt-4">
                                                    {formState.selectedTemplateLanguages.map(lang => (
                                                        <div key={lang} className="border border-gray-200 rounded-lg overflow-hidden">
                                                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-sm font-medium text-gray-700 flex justify-between items-center">
                                                                <span>{getLanguageLabel(lang)} Template</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleTemplateLanguage(lang)}
                                                                    className="text-gray-400 hover:text-red-500"
                                                                    title="템플릿 삭제"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                            <textarea
                                                                className="block w-full border-0 p-3 text-sm font-mono h-32 focus:ring-0 resize-y"
                                                                value={formState.templates[lang] || ''}
                                                                onChange={(e) => setFormState(prev => ({
                                                                    ...prev,
                                                                    templates: { ...prev.templates, [lang]: e.target.value }
                                                                }))}
                                                                placeholder={`${getLanguageLabel(lang)} 코드를 입력하세요...`}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3 bg-gray-50 p-6 rounded-xl border border-gray-100">
                                        <h4 className="text-lg font-bold text-gray-900">정답 코드</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">언어</label>
                                                <select
                                                    value={formState.solutionLanguage}
                                                    onChange={(e) => setFormState(prev => ({ ...prev, solutionLanguage: e.target.value }))}
                                                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 bg-white"
                                                >
                                                    {availableLanguages.map(lang => (
                                                        <option key={lang} value={lang}>{getLanguageLabel(lang)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">코드</label>
                                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                    <textarea
                                                        className="block w-full border-0 p-3 text-sm font-mono h-48 focus:ring-0 resize-y"
                                                        value={formState.solutionCode}
                                                        onChange={(e) => setFormState(prev => ({ ...prev, solutionCode: e.target.value }))}
                                                        spellCheck={false}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 bg-gray-50 p-6 rounded-xl border border-gray-100">
                                        <h4 className="text-lg font-bold text-gray-900">테스트케이스</h4>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="file"
                                                accept=".zip"
                                                className="block w-full text-sm text-gray-500
                                                    file:mr-4 file:py-2.5 file:px-4
                                                    file:rounded-lg file:border-0
                                                    file:text-sm file:font-semibold
                                                    file:bg-indigo-50 file:text-indigo-700
                                                    hover:file:bg-indigo-100
                                                    transition-colors cursor-pointer"
                                                onChange={(e) => setTestCaseFile(e.target.files?.[0] ?? null)}
                                            />
                                            <Button type="button" variant="outline" loading={isUploadingTestCases} onClick={handleUploadTestCases} className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 whitespace-nowrap">
                                                업로드
                                            </Button>
                                        </div>
                                        {testCaseId && <div className="text-sm font-medium text-green-600 flex items-center mt-2">
                                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            업로드 완료 (ID: {testCaseId})
                                        </div>}
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50/80 px-8 py-5 sm:flex sm:flex-row-reverse border-t border-gray-100">
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                        >
                            {loading ? '등록 중...' : '등록하기'}
                        </Button>
                        <Button
                            onClick={onClose}
                            variant="outline"
                            className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-5 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                        >
                            취소
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
