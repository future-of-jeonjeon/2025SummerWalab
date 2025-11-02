import React, { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { adminService } from '../../services/adminService';
import { problemService } from '../../services/problemService';
import { Problem, Workbook, WorkbookProblem } from '../../types';

const formatDate = (value?: string) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

type WorkbookEditFormState = {
  title: string;
  description: string;
  category: string;
  isPublic: boolean;
};

type WorkbookProblemSearchState = {
  results: Problem[];
  loading: boolean;
  error: string | null;
};

export const WorkbookManageSection: React.FC = () => {
  const [workbooks, setWorkbooks] = useState<Workbook[]>([]);
  const [isWorkbookListLoading, setIsWorkbookListLoading] = useState(false);
  const [workbookListError, setWorkbookListError] = useState<string | null>(null);
  const [deletingWorkbookId, setDeletingWorkbookId] = useState<number | null>(null);
  const [expandedWorkbookId, setExpandedWorkbookId] = useState<number | null>(null);
  const [workbookProblemsState, setWorkbookProblemsState] = useState<
    Record<number, { items: WorkbookProblem[]; loading: boolean; error: string | null }>
  >({});
  const [workbookProblemInputs, setWorkbookProblemInputs] = useState<Record<number, { problemId: string }>>({});
  const [addingProblemWorkbookId, setAddingProblemWorkbookId] = useState<number | null>(null);
  const [workbookProblemFormError, setWorkbookProblemFormError] = useState<Record<number, string | null>>({});
  const [workbookProblemSearchState, setWorkbookProblemSearchState] = useState<Record<number, WorkbookProblemSearchState>>({});
  const workbookProblemSearchTimers = useRef<Record<number, number>>({});
  const [workbookEditForms, setWorkbookEditForms] = useState<Record<number, WorkbookEditFormState>>({});
  const [workbookEditMessage, setWorkbookEditMessage] = useState<Record<number, { success?: string; error?: string }>>({});
  const [savingWorkbookId, setSavingWorkbookId] = useState<number | null>(null);

  const loadWorkbooks = useCallback(async () => {
    setWorkbookListError(null);
    setIsWorkbookListLoading(true);
    try {
      const list = await adminService.getWorkbooks();
      const normalized = Array.isArray(list) ? list : [];
      setWorkbooks(normalized);
      setWorkbookEditForms((prev) => {
        const next = { ...prev };
        normalized.forEach((workbook) => {
          next[workbook.id] = {
            title: workbook.title ?? '',
            description: workbook.description ?? '',
            category: workbook.category ?? '',
            isPublic: Boolean(workbook.is_public),
          };
        });
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제집 정보를 불러오는 중 오류가 발생했습니다.';
      setWorkbookListError(message);
    } finally {
      setIsWorkbookListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkbooks();
  }, [loadWorkbooks]);

  useEffect(() => {
    return () => {
      Object.values(workbookProblemSearchTimers.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    };
  }, []);

  const fetchWorkbookProblems = useCallback(
    async (workbookId: number) => {
      setWorkbookProblemsState((prev) => ({
        ...prev,
        [workbookId]: {
          items: prev[workbookId]?.items ?? [],
          loading: true,
          error: null,
        },
      }));
      setWorkbookProblemFormError((prev) => ({ ...prev, [workbookId]: null }));
      try {
        const items = await adminService.getWorkbookProblems(workbookId);
        const ordered = [...items].sort((a, b) => a.order - b.order);
        setWorkbookProblemsState((prev) => ({
          ...prev,
          [workbookId]: { items: ordered, loading: false, error: null },
        }));
        setWorkbookProblemInputs((prev) => ({
          ...prev,
          [workbookId]: {
            problemId: '',
          },
        }));
        setWorkbookProblemSearchState((prev) => ({
          ...prev,
          [workbookId]: { results: [], loading: false, error: null },
        }));
        const currentWorkbook = workbooks.find((item) => item.id === workbookId);
        if (currentWorkbook) {
          setWorkbookEditForms((prev) => ({
            ...prev,
            [workbookId]: {
              title: currentWorkbook.title ?? '',
              description: currentWorkbook.description ?? '',
              category: currentWorkbook.category ?? '',
              isPublic: Boolean(currentWorkbook.is_public),
            },
          }));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '문제 목록을 불러오지 못했습니다.';
        setWorkbookProblemsState((prev) => ({
          ...prev,
          [workbookId]: {
            items: prev[workbookId]?.items ?? [],
            loading: false,
            error: message,
          },
        }));
      }
    },
    [workbooks],
  );

  const handleToggleWorkbookDetails = (workbookId: number) => {
    if (expandedWorkbookId === workbookId) {
      setExpandedWorkbookId(null);
      return;
    }
    setExpandedWorkbookId(workbookId);
    fetchWorkbookProblems(workbookId);
  };

  const scheduleWorkbookProblemSearch = useCallback(
    (workbookId: number, keyword: string) => {
      const existingTimer = workbookProblemSearchTimers.current[workbookId];
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      const trimmed = keyword.trim();
      if (!trimmed) {
        setWorkbookProblemSearchState((prev) => ({
          ...prev,
          [workbookId]: { results: [], loading: false, error: null },
        }));
        return;
      }

      setWorkbookProblemSearchState((prev) => ({
        ...prev,
        [workbookId]: {
          results: prev[workbookId]?.results ?? [],
          loading: true,
          error: null,
        },
      }));

      workbookProblemSearchTimers.current[workbookId] = window.setTimeout(() => {
        problemService
          .searchProblems(trimmed, { limit: 20 })
          .then((response) => {
            const items = Array.isArray(response.data) ? response.data : [];
            const existingItems = workbookProblemsState[workbookId]?.items ?? [];
            const existingIds = new Set(
              existingItems
                .map((item) => {
                  const candidate = item.problemId ?? item.problem?.id;
                  const parsed = Number(candidate);
                  return Number.isFinite(parsed) ? parsed : null;
                })
                .filter((value): value is number => value !== null),
            );
            const filtered = items.filter((item) => !existingIds.has(Number(item.id)));
            setWorkbookProblemSearchState((prev) => ({
              ...prev,
              [workbookId]: { results: filtered, loading: false, error: null },
            }));
          })
          .catch((error) => {
            const message =
              error instanceof Error ? error.message : '문제를 검색하지 못했습니다.';
            setWorkbookProblemSearchState((prev) => ({
              ...prev,
              [workbookId]: { results: [], loading: false, error: message },
            }));
          })
          .finally(() => {
            delete workbookProblemSearchTimers.current[workbookId];
          });
      }, 300);
    },
    [workbookProblemsState],
  );

  const handleWorkbookProblemInputChange = (workbookId: number, value: string) => {
    setWorkbookProblemInputs((prev) => ({
      ...prev,
      [workbookId]: {
        problemId: value,
      },
    }));
    setWorkbookProblemFormError((prev) => {
      if (!prev[workbookId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[workbookId];
      return next;
    });
    scheduleWorkbookProblemSearch(workbookId, value);
  };

  const handleWorkbookMetaChange = (
    workbookId: number,
    field: 'title' | 'description' | 'category',
    value: string,
  ) => {
    setWorkbookEditForms((prev) => ({
      ...prev,
      [workbookId]: {
        ...(prev[workbookId] ?? {
          title: '',
          description: '',
          category: '',
          isPublic: false,
        }),
        [field]: value,
      },
    }));
    setWorkbookEditMessage((prev) => {
      if (!prev[workbookId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[workbookId];
      return next;
    });
  };

  const handleWorkbookMetaToggle = (workbookId: number, value: boolean) => {
    setWorkbookEditForms((prev) => ({
      ...prev,
      [workbookId]: {
        ...(prev[workbookId] ?? {
          title: '',
          description: '',
          category: '',
          isPublic: false,
        }),
        isPublic: value,
      },
    }));
    setWorkbookEditMessage((prev) => {
      if (!prev[workbookId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[workbookId];
      return next;
    });
  };

  const handleRefreshWorkbooks = async () => {
    await loadWorkbooks();
    if (expandedWorkbookId !== null) {
      await fetchWorkbookProblems(expandedWorkbookId);
    }
  };

  const handleDeleteWorkbook = async (id: number) => {
    setWorkbookListError(null);
    setDeletingWorkbookId(id);
    try {
      await adminService.deleteWorkbook(id);
      setWorkbooks((prev) => prev.filter((workbook) => workbook.id !== id));
      if (expandedWorkbookId === id) {
        setExpandedWorkbookId(null);
      }
      setWorkbookProblemsState((prev) => {
        if (!prev[id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setWorkbookProblemInputs((prev) => {
        if (!prev[id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setWorkbookProblemSearchState((prev) => {
        if (!prev[id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setWorkbookProblemFormError((prev) => {
        if (!prev[id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setWorkbookEditForms((prev) => {
        if (!prev[id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setWorkbookEditMessage((prev) => {
        if (!prev[id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제집 삭제 중 오류가 발생했습니다.';
      setWorkbookListError(message);
    } finally {
      setDeletingWorkbookId(null);
    }
  };

  const handleRemoveWorkbookProblemChip = async (workbookId: number, problemId: number) => {
    const currentItems = workbookProblemsState[workbookId]?.items ?? [];
    const remaining = currentItems.filter((item) => {
      const candidate = item.problemId ?? item.problem?.id;
      return Number(candidate) !== problemId;
    });

    if (remaining.length === currentItems.length) {
      return;
    }

    const updatedIds = remaining
      .sort((a, b) => a.order - b.order)
      .map((item) => {
        const candidate = item.problemId ?? item.problem?.id;
        const parsed = Number(candidate);
        return Number.isFinite(parsed) ? parsed : null;
      })
      .filter((value): value is number => value !== null);

    setAddingProblemWorkbookId(workbookId);
    try {
      await adminService.updateWorkbookProblems(workbookId, updatedIds);
      await fetchWorkbookProblems(workbookId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제 삭제 중 오류가 발생했습니다.';
      setWorkbookProblemFormError((prev) => ({ ...prev, [workbookId]: message }));
    } finally {
      setAddingProblemWorkbookId(null);
    }
  };

  const appendProblemToWorkbook = async (workbookId: number, problem: Problem): Promise<boolean> => {
    const currentItems = workbookProblemsState[workbookId]?.items ?? [];
    const alreadyExists = currentItems.some((item) => {
      const pid = item.problemId ?? item.problem?.id;
      return Number(pid) === problem.id;
    });
    if (alreadyExists) {
      setWorkbookProblemFormError((prev) => ({
        ...prev,
        [workbookId]: '이미 추가된 문제입니다.',
      }));
      return false;
    }

    const updatedIds: number[] = [...currentItems]
      .sort((a, b) => a.order - b.order)
      .map((item) => {
        const candidate = item.problemId ?? item.problem?.id;
        const parsed = Number(candidate);
        return Number.isFinite(parsed) ? parsed : null;
      })
      .filter((value): value is number => value !== null);
    updatedIds.push(problem.id);

    setAddingProblemWorkbookId(workbookId);
    try {
      await adminService.updateWorkbookProblems(workbookId, updatedIds);
      await fetchWorkbookProblems(workbookId);
      setWorkbookProblemInputs((prev) => ({
        ...prev,
        [workbookId]: {
          problemId: '',
        },
      }));
      setWorkbookProblemSearchState((prev) => ({
        ...prev,
        [workbookId]: { results: [], loading: false, error: null },
      }));
      setWorkbookProblemFormError((prev) => ({ ...prev, [workbookId]: null }));
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제 추가 중 오류가 발생했습니다.';
      setWorkbookProblemFormError((prev) => ({ ...prev, [workbookId]: message }));
      return false;
    } finally {
      setAddingProblemWorkbookId(null);
    }
  };

  const handleSelectWorkbookProblemSuggestion = async (workbookId: number, problem: Problem) => {
    await appendProblemToWorkbook(workbookId, problem);
  };

  const tryAppendWorkbookProblemFromInput = async (workbookId: number): Promise<boolean> => {
    const input = workbookProblemInputs[workbookId] ?? { problemId: '' };
    const query = (input.problemId ?? '').trim();

    if (!query) {
      setWorkbookProblemFormError((prev) => ({
        ...prev,
        [workbookId]: '문제를 검색해 선택하세요.',
      }));
      return false;
    }

    const searchState = workbookProblemSearchState[workbookId];
    const lowered = query.toLowerCase();
    const resolved = searchState?.results?.find((problem) => {
      if (String(problem.id) === query) {
        return true;
      }
      return problem.displayId ? problem.displayId.toLowerCase() === lowered : false;
    });

    if (!resolved) {
      setWorkbookProblemFormError((prev) => ({
        ...prev,
        [workbookId]: '검색 결과에서 문제를 선택하세요.',
      }));
      return false;
    }

    return appendProblemToWorkbook(workbookId, resolved);
  };

  const handleAddProblemToWorkbook = async (event: FormEvent<HTMLFormElement>, workbookId: number) => {
    event.preventDefault();
    setWorkbookProblemFormError((prev) => ({ ...prev, [workbookId]: null }));
    await tryAppendWorkbookProblemFromInput(workbookId);
  };

  const handleWorkbookProblemInputKeyDown = async (
    workbookId: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await tryAppendWorkbookProblemFromInput(workbookId);
    }
  };

  const handleWorkbookMetaSubmit = async (event: FormEvent<HTMLFormElement>, workbookId: number) => {
    event.preventDefault();
    const form = workbookEditForms[workbookId];
    if (!form) {
      return;
    }
    if (!form.title.trim()) {
      setWorkbookEditMessage((prev) => ({
        ...prev,
        [workbookId]: { error: '문제집 제목을 입력하세요.' },
      }));
      return;
    }

    setSavingWorkbookId(workbookId);
    try {
      const updated = await adminService.updateWorkbookMeta(workbookId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        is_public: form.isPublic,
      });
      setWorkbooks((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      setWorkbookEditMessage((prev) => ({
        ...prev,
        [workbookId]: { success: '문제집 정보가 저장되었습니다.' },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제집 정보를 저장하지 못했습니다.';
      setWorkbookEditMessage((prev) => ({
        ...prev,
        [workbookId]: { error: message },
      }));
    } finally {
      setSavingWorkbookId(null);
    }
  };

  return (
    <Card padding="lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">문제집 관리</h2>
          <p className="text-sm text-gray-500">등록된 문제집을 확인하고 문제를 추가하거나 삭제할 수 있습니다.</p>
        </div>
        <Button type="button" variant="outline" loading={isWorkbookListLoading} onClick={handleRefreshWorkbooks}>
          새로고침
        </Button>
      </div>

      {workbookListError && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{workbookListError}</div>}

      {isWorkbookListLoading && workbooks.length === 0 && !workbookListError && (
        <div className="rounded-md border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
          문제집 정보를 불러오는 중입니다...
        </div>
      )}

      {!isWorkbookListLoading && workbooks.length === 0 && !workbookListError && (
        <div className="rounded-md border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
          등록된 문제집이 없습니다. 문제집을 먼저 생성해 보세요.
        </div>
      )}

      {workbooks.length > 0 && (
        <ul className="mt-4 space-y-4">
          {workbooks.map((workbook) => {
            const isExpanded = expandedWorkbookId === workbook.id;
            const problemState = workbookProblemsState[workbook.id] ?? {
              items: [],
              loading: false,
              error: null,
            };
            const problemInput = workbookProblemInputs[workbook.id] ?? {
              problemId: '',
            };
            const searchState = workbookProblemSearchState[workbook.id] ?? {
              results: [],
              loading: false,
              error: null,
            };
            const trimmedProblemQuery = (problemInput.problemId ?? '').trim();
            const searchResults = searchState.results ?? [];
            const searchLoading = Boolean(searchState.loading);
            const searchError = searchState.error;
            const problemError = workbookProblemFormError[workbook.id];
            const editForm =
              workbookEditForms[workbook.id] ?? {
                title: workbook.title ?? '',
                description: workbook.description ?? '',
                category: workbook.category ?? '',
                isPublic: Boolean(workbook.is_public),
              };
            const editMessage = workbookEditMessage[workbook.id];

            return (
              <li key={workbook.id} className="rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{workbook.title}</h3>
                      <span className={`text-xs font-medium ${workbook.is_public ? 'text-green-600' : 'text-gray-500'}`}>
                        {workbook.is_public ? '공개' : '비공개'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      ID: {workbook.id}
                      {workbook.category ? ` · 카테고리: ${workbook.category}` : ''}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      생성: {formatDate(workbook.created_at)} · 수정: {formatDate(workbook.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" onClick={() => handleToggleWorkbookDetails(workbook.id)}>
                      {isExpanded ? '접기' : '자세히'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      loading={deletingWorkbookId === workbook.id}
                      onClick={() => handleDeleteWorkbook(workbook.id)}
                    >
                      삭제
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                    <form onSubmit={(event) => handleWorkbookMetaSubmit(event, workbook.id)} className="space-y-3 rounded-md border border-gray-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">문제집 수정</h4>
                          <p className="text-xs text-gray-500">기본 정보를 변경한 뒤 저장을 누르세요.</p>
                        </div>
                        <Button type="submit" size="sm" loading={savingWorkbookId === workbook.id}>
                          문제집 정보 저장
                        </Button>
                      </div>
                      {editMessage?.error && <div className="rounded-md bg-red-50 px-4 py-2 text-xs text-red-600">{editMessage.error}</div>}
                      {editMessage?.success && <div className="rounded-md bg-green-50 px-4 py-2 text-xs text-green-600">{editMessage.success}</div>}
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Input
                          label="제목"
                          value={editForm.title}
                          onChange={(event) => handleWorkbookMetaChange(workbook.id, 'title', event.target.value)}
                          required
                        />
                        <Input
                          label="카테고리"
                          value={editForm.category}
                          onChange={(event) => handleWorkbookMetaChange(workbook.id, 'category', event.target.value)}
                        />
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                        <input type="checkbox" checked={editForm.isPublic} onChange={(event) => handleWorkbookMetaToggle(workbook.id, event.target.checked)} />
                        <span>공개 문제집</span>
                      </label>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">설명</label>
                        <textarea
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                          rows={3}
                          value={editForm.description}
                          onChange={(event) => handleWorkbookMetaChange(workbook.id, 'description', event.target.value)}
                        />
                      </div>
                    </form>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">문제 목록</h4>
                        <p className="mt-1 text-xs text-gray-500">문제를 추가하거나 삭제해 문제집 구성을 관리하세요.</p>
                      </div>
                      {problemState.loading && (
                        <div className="rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
                          문제 목록을 불러오는 중입니다...
                        </div>
                      )}
                      {!problemState.loading && problemState.error && (
                        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{problemState.error}</div>
                      )}
                      {!problemState.loading && !problemState.error && problemState.items.length === 0 && (
                        <div className="rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
                          아직 등록된 문제가 없습니다. 아래에서 문제를 추가해 보세요.
                        </div>
                      )}
                      {!problemState.loading && !problemState.error && problemState.items.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {problemState.items.map((item) => {
                            const pid = item.problemId ?? item.problem?.id ?? 0;
                            const label = item.problem?.displayId ?? pid;
                            const title = item.problem?.title;
                            return (
                              <span
                                key={`workbook-${workbook.id}-chip-${item.id}`}
                                className="inline-flex items-center gap-2 rounded-full bg-[#113F67]/10 px-3 py-1 text-sm text-[#113F67]"
                              >
                                <span className="font-medium">
                                  {label}
                                  {title ? ` · ${title}` : ''}
                                </span>
                                <button
                                  type="button"
                                  className="text-xs text-red-600 hover:text-red-700"
                                  onClick={() => void handleRemoveWorkbookProblemChip(workbook.id, Number(pid))}
                                >
                                  삭제
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <form className="space-y-3" onSubmit={(event) => handleAddProblemToWorkbook(event, workbook.id)}>
                        <div className="flex items-end gap-2">
                          <div className="min-w-0 flex-1 space-y-2">
                            <Input
                              label="문제 검색 또는 ID 입력"
                              value={problemInput.problemId}
                              placeholder="예: 101 또는 다익스트라"
                              onChange={(event) => handleWorkbookProblemInputChange(workbook.id, event.target.value)}
                              onKeyDown={(event) => void handleWorkbookProblemInputKeyDown(workbook.id, event)}
                            />
                            {searchError && <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{searchError}</div>}
                            {!searchError && trimmedProblemQuery && searchLoading && <p className="text-xs text-gray-500">문제를 검색 중입니다...</p>}
                            {!searchError && trimmedProblemQuery && !searchLoading && searchResults.length === 0 && (
                              <p className="text-xs text-gray-500">검색 결과가 없습니다.</p>
                            )}
                            {!searchError && trimmedProblemQuery && searchResults.length > 0 && (
                              <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200">
                                {searchResults.map((result) => (
                                  <li key={`workbook-${workbook.id}-suggestion-${result.id}`}>
                                    <button
                                      type="button"
                                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
                                      onClick={() => void handleSelectWorkbookProblemSuggestion(workbook.id, result)}
                                    >
                                      <div>
                                        <p className="font-medium text-gray-800">
                                          {result.displayId ?? result.id} · {result.title}
                                        </p>
                                        <p className="text-xs text-gray-500">난이도: {result.difficulty}</p>
                                      </div>
                                      <span className="text-xs text-[#113F67]">선택</span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <Button type="submit" variant="outline" className="flex-none" loading={addingProblemWorkbookId === workbook.id}>
                            문제 추가
                          </Button>
                        </div>
                        {problemError && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{problemError}</div>}
                      </form>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

