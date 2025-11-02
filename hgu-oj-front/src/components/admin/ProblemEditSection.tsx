import React, { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { RichTextEditor } from '../molecules/RichTextEditor';
import {
  adminService,
  AdminProblemDetail,
  UpdateProblemPayload,
} from '../../services/adminService';
import { Problem } from '../../types';
import {
  availableLanguages,
  getLanguageLabel,
  normalizeLanguageKey,
  normalizeLanguageList,
  toBackendLanguageList,
} from '../../lib/problemLanguage';

const PROBLEM_EDIT_PAGE_SIZE = 10;

type ProblemEditFormState = {
  displayId: string;
  title: string;
  description: string;
  inputDescription: string;
  outputDescription: string;
  hint: string;
  source: string;
  timeLimit: string;
  memoryLimit: string;
  tags: string;
  difficulty: AdminProblemDetail['difficulty'];
  visible: boolean;
  shareSubmission: boolean;
  ioInput: string;
  ioOutput: string;
  samples: Array<{ input: string; output: string }>;
  languages: string[];
};

export const ProblemEditSection: React.FC = () => {
  const [problemList, setProblemList] = useState<Problem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const searchKeywordRef = useRef('');
  const searchTimerRef = useRef<number | null>(null);

  const [selectedProblemId, setSelectedProblemId] = useState<number | null>(null);
  const selectedProblemIdRef = useRef<number | null>(null);
  const [selectedProblemDetail, setSelectedProblemDetail] = useState<AdminProblemDetail | null>(null);
  const [formState, setFormState] = useState<ProblemEditFormState | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [message, setMessage] = useState<{ success?: string; error?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    selectedProblemIdRef.current = selectedProblemId;
  }, [selectedProblemId]);

  const fetchProblemList = useCallback(
    async (targetPage: number = 1, keyword?: string) => {
      const normalizedKeyword = typeof keyword === 'string' ? keyword : searchKeywordRef.current;
      const offset = (targetPage - 1) * PROBLEM_EDIT_PAGE_SIZE;

      setListLoading(true);
      setListError(null);

      try {
        const { results, total: nextTotal } = await adminService.getAdminProblemList({
          keyword: normalizedKeyword,
          limit: PROBLEM_EDIT_PAGE_SIZE,
          offset,
        });

        setProblemList(results);
        setTotal(nextTotal);
        setPage(targetPage);
        setSearchKeyword(normalizedKeyword ?? '');
        searchKeywordRef.current = normalizedKeyword ?? '';

        const currentSelectedId = selectedProblemIdRef.current;
        if (results.length === 0) {
          setSelectedProblemId(null);
          setSelectedProblemDetail(null);
          setFormState(null);
          return;
        }

        const nextSelected = results.find((item) => item.id === currentSelectedId) ?? results[0];
        if (!currentSelectedId || nextSelected.id !== currentSelectedId) {
          setSelectedProblemId(nextSelected.id);
        }
      } catch (error) {
        const fallbackMessage = error instanceof Error ? error.message : '문제 목록을 불러오지 못했습니다.';
        setListError(fallbackMessage);
        setProblemList([]);
        setTotal(0);
        setSelectedProblemId(null);
        setSelectedProblemDetail(null);
        setFormState(null);
      } finally {
        setListLoading(false);
      }
    },
    [],
  );

  const loadProblemDetail = useCallback(async (problemId: number) => {
    if (!problemId) {
      setSelectedProblemDetail(null);
      setFormState(null);
      return;
    }

    setDetailLoading(true);
    setMessage({});
    try {
      const detail = await adminService.getAdminProblemDetail(problemId);
      const resolvedLanguages = normalizeLanguageList(detail.languages);
      const sanitizedDetail: AdminProblemDetail = {
        ...detail,
        languages: resolvedLanguages.length > 0 ? resolvedLanguages : [...availableLanguages],
      };

      setSelectedProblemDetail(sanitizedDetail);
      setFormState({
        displayId: detail.displayId ?? '',
        title: detail.title ?? '',
        description: detail.description ?? '',
        inputDescription: detail.inputDescription ?? '',
        outputDescription: detail.outputDescription ?? '',
        hint: detail.hint ?? '',
        source: detail.source ?? '',
        timeLimit: String(detail.timeLimit ?? ''),
        memoryLimit: String(detail.memoryLimit ?? ''),
        tags: detail.tags.join(', '),
        difficulty: detail.difficulty,
        visible: detail.visible,
        shareSubmission: detail.shareSubmission,
        ioInput: detail.ioMode.input,
        ioOutput: detail.ioMode.output,
        samples: detail.samples.length > 0 ? detail.samples : [{ input: '', output: '' }],
        languages: sanitizedDetail.languages,
      });
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : '문제 정보를 불러오지 못했습니다.';
      setMessage({ error: fallbackMessage });
      setSelectedProblemDetail(null);
      setFormState(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProblemList(1, searchKeywordRef.current);
  }, [fetchProblemList]);

  useEffect(() => {
    if (!selectedProblemId) {
      setSelectedProblemDetail(null);
      setFormState(null);
      return;
    }
    loadProblemDetail(selectedProblemId);
  }, [selectedProblemId, loadProblemDetail]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchKeyword(value);
    searchKeywordRef.current = value;
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = window.setTimeout(() => {
      fetchProblemList(1, value);
    }, 300);
  };

  const handleSearchSubmit = () => {
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    fetchProblemList(1, searchKeywordRef.current);
  };

  const updateFormState = (updater: (prev: ProblemEditFormState) => ProblemEditFormState) => {
    setFormState((prev) => {
      if (!prev) {
        return prev;
      }
      const next = updater(prev);
      setMessage({});
      return next;
    });
  };

  const handleFieldChange = <K extends keyof ProblemEditFormState>(field: K, value: ProblemEditFormState[K]) => {
    updateFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSampleChange = (index: number, field: 'input' | 'output', value: string) => {
    updateFormState((prev) => {
      const nextSamples = prev.samples.map((sample, idx) => (idx === index ? { ...sample, [field]: value } : sample));
      return { ...prev, samples: nextSamples };
    });
  };

  const handleAddSample = () => {
    updateFormState((prev) => ({ ...prev, samples: [...prev.samples, { input: '', output: '' }] }));
  };

  const handleRemoveSample = (index: number) => {
    updateFormState((prev) => {
      if (prev.samples.length <= 1) {
        return prev;
      }
      const nextSamples = prev.samples.filter((_, idx) => idx !== index);
      return { ...prev, samples: nextSamples.length > 0 ? nextSamples : [{ input: '', output: '' }] };
    });
  };

  const handleLanguageToggle = (language: string, checked: boolean) => {
    const normalized = normalizeLanguageKey(language);
    if (!normalized) {
      return;
    }
    updateFormState((prev) => {
      const current = new Set(
        prev.languages
          .map((lang) => normalizeLanguageKey(lang))
          .filter((lang): lang is string => Boolean(lang)),
      );
      if (checked) {
        current.add(normalized);
      } else {
        current.delete(normalized);
      }
      const ordered = availableLanguages.filter((lang) => current.has(lang));
      return { ...prev, languages: ordered };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState || !selectedProblemDetail) {
      return;
    }

    const parsedTimeLimit = Number(formState.timeLimit);
    const parsedMemoryLimit = Number(formState.memoryLimit);
    const timeLimit = Number.isFinite(parsedTimeLimit) && parsedTimeLimit > 0 ? parsedTimeLimit : selectedProblemDetail.timeLimit;
    const memoryLimit = Number.isFinite(parsedMemoryLimit) && parsedMemoryLimit > 0 ? parsedMemoryLimit : selectedProblemDetail.memoryLimit;

    const normalizedSamples = formState.samples
      .map((sample) => ({ input: sample.input ?? '', output: sample.output ?? '' }))
      .filter((sample) => sample.input.trim().length > 0 || sample.output.trim().length > 0);
    const effectiveSamples = normalizedSamples.length > 0 ? normalizedSamples : selectedProblemDetail.samples;

    const tags = formState.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const normalizedLanguages = normalizeLanguageList(formState.languages);
    const fallbackLanguages = normalizeLanguageList(selectedProblemDetail.languages);
    const resolvedLanguages =
      normalizedLanguages.length > 0
        ? normalizedLanguages
        : fallbackLanguages.length > 0
          ? fallbackLanguages
          : [...availableLanguages];
    const backendLanguages = toBackendLanguageList(resolvedLanguages);

    const payload: UpdateProblemPayload = {
      id: selectedProblemDetail.id,
      _id: formState.displayId.trim(),
      title: formState.title.trim(),
      description: formState.description,
      input_description: formState.inputDescription,
      output_description: formState.outputDescription,
      samples: effectiveSamples,
      test_case_id: selectedProblemDetail.testCaseId,
      test_case_score: selectedProblemDetail.testCaseScore,
      time_limit: timeLimit,
      memory_limit: memoryLimit,
      languages: backendLanguages,
      template: selectedProblemDetail.template,
      rule_type: selectedProblemDetail.ruleType,
      io_mode: {
        io_mode: selectedProblemDetail.ioMode.io_mode,
        input: formState.ioInput,
        output: formState.ioOutput,
      },
      spj: selectedProblemDetail.spj,
      spj_language: selectedProblemDetail.spjLanguage,
      spj_code: selectedProblemDetail.spjCode,
      spj_compile_ok: selectedProblemDetail.spjCompileOk,
      visible: formState.visible,
      difficulty: formState.difficulty,
      tags: tags.length > 0 ? tags : selectedProblemDetail.tags,
      hint: formState.hint,
      source: formState.source,
      share_submission: formState.shareSubmission,
    };

    if (!payload.title) {
      setMessage({ error: '문제 제목을 입력하세요.' });
      return;
    }

    if (!payload._id) {
      setMessage({ error: '표시 ID를 입력하세요.' });
      return;
    }

    setIsSaving(true);
    setMessage({});
    try {
      const updated = await adminService.updateAdminProblem(payload);
      const normalizedUpdatedLanguages = normalizeLanguageList(updated.languages);
      const sanitizedUpdated: AdminProblemDetail = {
        ...updated,
        languages: normalizedUpdatedLanguages.length > 0 ? normalizedUpdatedLanguages : [...availableLanguages],
      };
      setSelectedProblemDetail(sanitizedUpdated);
      setFormState({
        displayId: updated.displayId ?? '',
        title: updated.title ?? '',
        description: updated.description ?? '',
        inputDescription: updated.inputDescription ?? '',
        outputDescription: updated.outputDescription ?? '',
        hint: updated.hint ?? '',
        source: updated.source ?? '',
        timeLimit: String(updated.timeLimit ?? ''),
        memoryLimit: String(updated.memoryLimit ?? ''),
        tags: updated.tags.join(', '),
        difficulty: updated.difficulty,
        visible: updated.visible,
        shareSubmission: updated.shareSubmission,
        ioInput: updated.ioMode.input,
        ioOutput: updated.ioMode.output,
        samples: updated.samples.length > 0 ? updated.samples : [{ input: '', output: '' }],
        languages: sanitizedUpdated.languages,
      });
      setMessage({ success: '문제 정보를 수정했습니다.' });
      setProblemList((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                title: updated.title,
                displayId: updated.displayId,
                difficulty: updated.difficulty,
                visible: updated.visible,
              }
            : item,
        ),
      );
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : '문제 정보를 수정하지 못했습니다.';
      setMessage({ error: fallbackMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PROBLEM_EDIT_PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <Card padding="lg">
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-gray-900">문제 수정</h2>
          <p className="text-sm text-gray-500">OJ 백엔드에 등록된 문제를 검색하고 세부 정보를 수정하세요.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:flex-1">
            <Input
              label="검색"
              value={searchKeyword}
              placeholder="표시 ID, 제목 등"
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchSubmit();
                }
              }}
            />
          </div>
          <Button onClick={handleSearchSubmit} className="w-full sm:w-auto bg-[#113F67] text-white hover:bg-[#34699A] focus:ring-[#58A0C8]">
            검색
          </Button>
        </div>

        <section className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h3 className="text-sm font-medium text-gray-900">문제 목록</h3>
              <span className="text-xs text-gray-500">총 {total.toLocaleString()}개</span>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              {listLoading ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">문제를 불러오는 중입니다...</div>
              ) : listError ? (
                <div className="px-4 py-6 text-sm text-red-600">{listError}</div>
              ) : problemList.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500">검색 결과가 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">표시 ID</th>
                        <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">제목</th>
                        <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">난이도</th>
                        <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">공개</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {problemList.map((problem) => {
                        const isActive = selectedProblemId === problem.id;
                        return (
                          <tr
                            key={`problem-edit-row-${problem.id}`}
                            className={`cursor-pointer transition-colors ${isActive ? 'bg-[#113F67]/10' : 'hover:bg-gray-50'}`}
                            onClick={() => setSelectedProblemId(problem.id)}
                          >
                            <td className="px-3 py-2 text-sm text-gray-900">{problem.displayId ?? problem.id}</td>
                            <td className="px-3 py-2 text-sm text-gray-700">
                              <div className="font-medium text-gray-900">{problem.title}</div>
                              {problem.tags && problem.tags.length > 0 && (
                                <div className="mt-0.5 truncate text-xs text-gray-500">{problem.tags.join(', ')}</div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-700">{problem.difficulty}</td>
                            <td className="px-3 py-2 text-sm">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${problem.visible ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                {problem.visible ? '공개' : '비공개'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div>
                {page} / {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" disabled={!canPrev} onClick={() => canPrev && fetchProblemList(page - 1)}>
                  이전
                </Button>
                <Button type="button" variant="ghost" disabled={!canNext} onClick={() => canNext && fetchProblemList(page + 1)}>
                  다음
                </Button>
              </div>
            </div>
          </div>

          {detailLoading ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
              문제 정보를 불러오는 중입니다...
            </div>
          ) : !formState ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
              수정할 문제를 선택하세요.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              {message.error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{message.error}</div>}
              {message.success && <div className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-600">{message.success}</div>}

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="표시 ID" value={formState.displayId} onChange={(e) => handleFieldChange('displayId', e.target.value)} required />
                <Input label="제목" value={formState.title} onChange={(e) => handleFieldChange('title', e.target.value)} required />
                <Input label="시간 제한 (ms)" type="number" value={formState.timeLimit} onChange={(e) => handleFieldChange('timeLimit', e.target.value)} />
                <Input label="메모리 제한 (MB)" type="number" value={formState.memoryLimit} onChange={(e) => handleFieldChange('memoryLimit', e.target.value)} />
                <Input label="태그" placeholder="쉼표로 구분하여 입력" value={formState.tags} onChange={(e) => handleFieldChange('tags', e.target.value)} />
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">난이도</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                    value={formState.difficulty}
                    onChange={(e) => handleFieldChange('difficulty', e.target.value as AdminProblemDetail['difficulty'])}
                  >
                    <option value="Low">Low</option>
                    <option value="Mid">Mid</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="h-4 w-4" checked={formState.visible} onChange={(e) => handleFieldChange('visible', e.target.checked)} />
                  <span>공개</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="h-4 w-4" checked={formState.shareSubmission} onChange={(e) => handleFieldChange('shareSubmission', e.target.checked)} />
                  <span>코드 공유 허용</span>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">입력 파일 이름</label>
                  <Input value={formState.ioInput} onChange={(e) => handleFieldChange('ioInput', e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">출력 파일 이름</label>
                  <Input value={formState.ioOutput} onChange={(e) => handleFieldChange('ioOutput', e.target.value)} />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">문제 설명</label>
                  <RichTextEditor value={formState.description} onChange={(value) => handleFieldChange('description', value)} placeholder="문제 설명을 입력하세요." />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">입력 설명</label>
                  <RichTextEditor value={formState.inputDescription} onChange={(value) => handleFieldChange('inputDescription', value)} placeholder="입력에 대한 설명을 입력하세요." />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">출력 설명</label>
                  <RichTextEditor value={formState.outputDescription} onChange={(value) => handleFieldChange('outputDescription', value)} placeholder="출력에 대한 설명을 입력하세요." />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">힌트</label>
                  <RichTextEditor value={formState.hint} onChange={(value) => handleFieldChange('hint', value)} placeholder="힌트가 있다면 입력하세요." />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">출처</label>
                  <RichTextEditor value={formState.source} onChange={(value) => handleFieldChange('source', value)} placeholder="문제 출처를 입력하세요." />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">예시</h4>
                  <Button type="button" variant="outline" onClick={handleAddSample}>
                    예시 추가
                  </Button>
                </div>
                <div className="space-y-4">
                  {formState.samples.map((sample, index) => (
                    <div key={`problem-edit-sample-${index}`} className="space-y-3 rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">예시 {index + 1}</span>
                        {formState.samples.length > 1 && (
                          <button type="button" className="text-xs text-red-600 hover:text-red-700" onClick={() => handleRemoveSample(index)}>
                            삭제
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">입력</label>
                          <textarea
                            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                            rows={3}
                            value={sample.input}
                            onChange={(e) => handleSampleChange(index, 'input', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">출력</label>
                          <textarea
                            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                            rows={3}
                            value={sample.output}
                            onChange={(e) => handleSampleChange(index, 'output', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">허용 언어</h4>
                <div className="flex flex-wrap gap-3">
                  {availableLanguages.map((language) => {
                    const checked = formState.languages.includes(language);
                    return (
                      <label key={`problem-edit-language-${language}`} className="inline-flex items-center gap-2 text-xs text-gray-700">
                        <input type="checkbox" checked={checked} onChange={(e) => handleLanguageToggle(language, e.target.checked)} />
                        <span>{getLanguageLabel(language)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" loading={isSaving}>
                  문제 정보 저장
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </Card>
  );
};

