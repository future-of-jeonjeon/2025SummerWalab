import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { adminService, UpdateContestPayload } from '../../services/adminService';
import { AdminContest, Problem } from '../../types';
import { contestUserService } from '../../services/contestUserService';
import { formatDateTime, toLocalDateTimeInput } from '../../lib/date';
import { normalizeProblemKey } from '../../lib/problemKey';

type ContestEditFormState = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  password: string;
  visible: boolean;
  realTimeRank: boolean;
  allowedIpRanges: string;
  requiresApproval: boolean;
};

type ContestProblemsState = {
  items: Problem[];
  loading: boolean;
  error: string | null;
};

const PAGE_SIZE = 10;

const mapContestToForm = (contest: AdminContest): ContestEditFormState => ({
  title: contest.title ?? '',
  description: contest.description ?? '',
  startTime: toLocalDateTimeInput(contest.startTime),
  endTime: toLocalDateTimeInput(contest.endTime),
  password: contest.password ?? '',
  visible: Boolean(contest.visible),
  realTimeRank: Boolean(contest.real_time_rank),
  allowedIpRanges: (contest.allowed_ip_ranges || []).join('\n'),
  requiresApproval: Boolean(contest.requires_approval ?? contest.requiresApproval),
});

const toIsoString = (value: string): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

export const ContestEditSection: React.FC = () => {
  const [contestList, setContestList] = useState<AdminContest[]>([]);
  const [contestListLoading, setContestListLoading] = useState(false);
  const [contestListError, setContestListError] = useState<string | null>(null);
  const [contestPage, setContestPage] = useState(1);
  const [contestTotal, setContestTotal] = useState(0);
  const [contestSearchKeyword, setContestSearchKeyword] = useState('');

  const [selectedContest, setSelectedContest] = useState<AdminContest | null>(null);
  const selectedContestIdRef = useRef<number | null>(null);

  const [contestEditForm, setContestEditForm] = useState<ContestEditFormState | null>(null);
  const [contestEditMessage, setContestEditMessage] = useState<{ success?: string; error?: string }>({});
  const [contestEditLoading, setContestEditLoading] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [contestDetailLoading, setContestDetailLoading] = useState(false);

  const [contestProblemsState, setContestProblemsState] = useState<ContestProblemsState>({
    items: [],
    loading: false,
    error: null,
  });

  const [contestProblemInput, setContestProblemInput] = useState('');
  const [contestProblemDisplayId, setContestProblemDisplayId] = useState('');
  const [contestProblemSearch, setContestProblemSearch] = useState<{
    results: Problem[];
    loading: boolean;
    error: string | null;
  }>({ results: [], loading: false, error: null });
  const [contestProblemSelected, setContestProblemSelected] = useState<Problem | null>(null);
  const [contestProblemMessage, setContestProblemMessage] = useState<{ success?: string; error?: string }>({});
  const [contestProblemActionLoading, setContestProblemActionLoading] = useState(false);
  const [deletingContestProblemId, setDeletingContestProblemId] = useState<number | null>(null);

  const contestSearchKeywordRef = useRef('');
  const contestSearchTimerRef = useRef<number | null>(null);
  const contestProblemSearchTimerRef = useRef<number | null>(null);

  const fetchContestProblems = useCallback(
    async (contestId: number) => {
      if (!contestId) {
        setContestProblemsState({ items: [], loading: false, error: null });
        return;
      }

      setContestProblemsState((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));
      setContestProblemMessage({});

      try {
        const items = await adminService.getContestProblems(contestId);
        setContestProblemsState({ items, loading: false, error: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : '대회 문제 목록을 불러오지 못했습니다.';
        setContestProblemsState({ items: [], loading: false, error: message });
      }
    },
    [],
  );

  const loadContestDetail = useCallback(
    async (contestId: number) => {
      setContestEditMessage({});
      setContestProblemMessage({});
      setContestDetailLoading(true);
      try {
        const detail = await adminService.getContestDetail(contestId);
        selectedContestIdRef.current = detail.id;
        setSelectedContest(detail);
        setContestEditForm(mapContestToForm(detail));
        setContestProblemInput('');
        setContestProblemDisplayId('');
        setContestProblemSelected(null);
        setContestProblemSearch({ results: [], loading: false, error: null });
        if (contestProblemSearchTimerRef.current) {
          window.clearTimeout(contestProblemSearchTimerRef.current);
          contestProblemSearchTimerRef.current = null;
        }
        await fetchContestProblems(detail.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : '대회 정보를 불러오지 못했습니다.';
        setContestEditMessage({ error: message });
        setSelectedContest(null);
        setContestEditForm(null);
        setContestProblemsState({ items: [], loading: false, error: null });
      } finally {
        setContestDetailLoading(false);
      }
    },
    [fetchContestProblems],
  );

  const fetchContests = useCallback(
    async (targetPage: number = 1, keyword?: string) => {
      const normalizedKeyword = typeof keyword === 'string' ? keyword : contestSearchKeywordRef.current;
      setContestListError(null);
      setContestListLoading(true);
      try {
        const response = await adminService.getContests({ page: targetPage, limit: PAGE_SIZE, keyword: normalizedKeyword });
        const results = Array.isArray(response.results) ? response.results : [];
        setContestList(results);
        setContestTotal(response.total);
        setContestPage(targetPage);
        setContestSearchKeyword(normalizedKeyword ?? '');
        contestSearchKeywordRef.current = normalizedKeyword ?? '';

        if (results.length === 0) {
          setSelectedContest(null);
          setContestEditForm(null);
          setContestProblemsState({ items: [], loading: false, error: null });
          selectedContestIdRef.current = null;
          return;
        }

        const currentId = selectedContestIdRef.current;
        const nextContest = results.find((item) => item.id === currentId) ?? results[0];
        await loadContestDetail(nextContest.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : '대회 목록을 불러오지 못했습니다.';
        setContestListError(message);
        setContestList([]);
        setContestTotal(0);
        setSelectedContest(null);
        setContestEditForm(null);
        setContestProblemsState({ items: [], loading: false, error: null });
        selectedContestIdRef.current = null;
      } finally {
        setContestListLoading(false);
      }
    },
    [loadContestDetail],
  );

  useEffect(() => {
    fetchContests(1, contestSearchKeywordRef.current);
  }, [fetchContests]);

  useEffect(() => {
    return () => {
      if (contestSearchTimerRef.current) {
        window.clearTimeout(contestSearchTimerRef.current);
      }
      if (contestProblemSearchTimerRef.current) {
        window.clearTimeout(contestProblemSearchTimerRef.current);
      }
    };
  }, []);

  const handleContestSearchInputChange = (value: string) => {
    setContestSearchKeyword(value);
    if (contestSearchTimerRef.current) {
      window.clearTimeout(contestSearchTimerRef.current);
    }
    contestSearchTimerRef.current = window.setTimeout(() => {
      fetchContests(1, value);
    }, 300);
  };

  const handleContestSearchSubmit = () => {
    if (contestSearchTimerRef.current) {
      window.clearTimeout(contestSearchTimerRef.current);
      contestSearchTimerRef.current = null;
    }
    fetchContests(1, contestSearchKeyword);
  };

  const handleContestPageChange = (direction: 'prev' | 'next') => {
    const totalPages = Math.max(1, Math.ceil(contestTotal / PAGE_SIZE));
    let nextPage = contestPage;
    if (direction === 'prev' && contestPage > 1) {
      nextPage = contestPage - 1;
    } else if (direction === 'next' && contestPage < totalPages) {
      nextPage = contestPage + 1;
    }
    if (nextPage !== contestPage) {
      fetchContests(nextPage);
    }
  };

  const handleSelectContest = (contest: AdminContest) => {
    loadContestDetail(contest.id);
    contestUserService
      .getPolicy(contest.id)
      .then((policy) => {
        setContestEditForm((prev) => (prev ? { ...prev, requiresApproval: policy.requiresApproval } : prev));
      })
      .catch(() => {
        // ignore
      });
  };

  const handleContestEditChange = <K extends keyof ContestEditFormState>(
    field: K,
    value: ContestEditFormState[K],
  ) => {
    setContestEditForm((prev) => {
      if (!prev) {
        return prev;
      }
      setContestEditMessage({});
      return { ...prev, [field]: value };
    });
  };

  const handleContestResetForm = () => {
    if (!selectedContest) {
      return;
    }
    setContestEditForm(mapContestToForm(selectedContest));
    setContestEditMessage({});
  };

  const handleContestEditSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!selectedContest || !contestEditForm) {
      return;
    }

    const startIso = toIsoString(contestEditForm.startTime);
    const endIso = toIsoString(contestEditForm.endTime);
    if (!startIso || !endIso) {
      setContestEditMessage({ error: '유효한 날짜와 시간을 입력하세요.' });
      return;
    }

    const allowedIpRanges = contestEditForm.allowedIpRanges
      .split(/[\n,]+/)
      .map((ip) => ip.trim())
      .filter((ip) => ip.length > 0);

    const payload: UpdateContestPayload = {
      id: selectedContest.id,
      title: contestEditForm.title.trim(),
      description: contestEditForm.description,
      start_time: startIso,
      end_time: endIso,
      password: contestEditForm.password.trim() || null,
      visible: contestEditForm.visible,
      real_time_rank: contestEditForm.realTimeRank,
      allowed_ip_ranges: allowedIpRanges,
      requires_approval: contestEditForm.requiresApproval,
    };

    setContestEditLoading(true);
    setContestEditMessage({});
    try {
      const updated = await adminService.updateContest(payload);
      if (updated?.id) {
        try {
          setPolicySaving(true);
          await contestUserService.setPolicy(updated.id, contestEditForm.requiresApproval);
        } catch {
          setContestEditMessage((prev) => ({
            ...prev,
            error: '참여 승인 설정을 저장하지 못했습니다. 다시 시도해주세요.',
          }));
        } finally {
          setPolicySaving(false);
        }
      }
      selectedContestIdRef.current = updated.id;
      setSelectedContest(updated);
      setContestEditForm(mapContestToForm(updated));
      setContestEditMessage({ success: '대회 정보를 수정했습니다.' });
      setContestList((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '대회 정보를 수정하지 못했습니다.';
      setContestEditMessage({ error: message });
    } finally {
      setContestEditLoading(false);
    }
  };

  const scheduleContestProblemSearch = useCallback(
    (keyword: string) => {
      if (contestProblemSearchTimerRef.current) {
        window.clearTimeout(contestProblemSearchTimerRef.current);
      }

      const trimmed = keyword.trim();
      if (!trimmed) {
        setContestProblemSearch({ results: [], loading: false, error: null });
        contestProblemSearchTimerRef.current = null;
        return;
      }

      contestProblemSearchTimerRef.current = window.setTimeout(async () => {
        setContestProblemSearch({ results: [], loading: true, error: null });
        try {
          const results = await adminService.searchAdminProblems({ keyword: trimmed, limit: 20, offset: 0 });
          const existingKeys = new Set(
            contestProblemsState.items
              .map((item) => normalizeProblemKey(item))
              .filter((value): value is string => value.length > 0),
          );
          const existingIds = new Set(
            contestProblemsState.items
              .map((item) => (typeof item.id === 'number' ? item.id : null))
              .filter((value): value is number => value !== null),
          );
          const filtered = results.filter((problem) => {
            const key = normalizeProblemKey(problem);
            if (key && existingKeys.has(key)) {
              return false;
            }
            if (typeof problem.id === 'number' && existingIds.has(problem.id)) {
              return false;
            }
            return true;
          });
          setContestProblemSearch({ results: filtered, loading: false, error: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : '문제를 검색하지 못했습니다.';
          setContestProblemSearch({ results: [], loading: false, error: message });
        } finally {
          if (contestProblemSearchTimerRef.current) {
            window.clearTimeout(contestProblemSearchTimerRef.current);
            contestProblemSearchTimerRef.current = null;
          }
        }
      }, 300);
    },
    [contestProblemsState.items],
  );

  const handleContestProblemInputChange = (value: string) => {
    setContestProblemInput(value);
    setContestProblemSelected(null);
    setContestProblemMessage({});
    scheduleContestProblemSearch(value);
  };

  const handleContestProblemDisplayIdChange = (value: string) => {
    setContestProblemDisplayId(value);
    setContestProblemMessage({});
  };

  const handleSelectContestProblemSuggestion = (problem: Problem) => {
    setContestProblemSelected(problem);
    const label = problem.displayId ?? String(problem.id);
    setContestProblemInput(label);
    setContestProblemDisplayId(label);
    setContestProblemSearch({ results: [], loading: false, error: null });
    setContestProblemMessage({});
    if (contestProblemSearchTimerRef.current) {
      window.clearTimeout(contestProblemSearchTimerRef.current);
      contestProblemSearchTimerRef.current = null;
    }
  };

  const tryAddContestProblem = async () => {
    if (!selectedContest) {
      setContestProblemMessage({ error: '먼저 대회를 선택하세요.' });
      return;
    }

    const trimmedQuery = contestProblemInput.trim();
    let targetProblem = contestProblemSelected;

    if (!targetProblem) {
      if (!trimmedQuery) {
        setContestProblemMessage({ error: '추가할 문제를 검색해 선택하세요.' });
        return;
      }

      const lowered = trimmedQuery.toLowerCase();
      const inMemory = contestProblemSearch.results.find((problem) => {
        if (typeof problem.id === 'number' && String(problem.id) === trimmedQuery) {
          return true;
        }
        return normalizeProblemKey(problem) === lowered;
      });

      if (inMemory) {
        targetProblem = inMemory;
      } else {
        try {
          const fetched = await adminService.searchAdminProblems({ keyword: trimmedQuery, limit: 1, offset: 0 });
          targetProblem = fetched[0];
        } catch (error) {
          const message = error instanceof Error ? error.message : '문제를 검색하지 못했습니다.';
          setContestProblemMessage({ error: message });
          return;
        }
      }
    }

    if (!targetProblem) {
      setContestProblemMessage({ error: '해당 문제를 찾지 못했습니다.' });
      return;
    }

    const normalizedDisplayId = (
      contestProblemDisplayId.trim() ||
      targetProblem.displayId ||
      String(targetProblem.id)
    ).trim();
    if (!normalizedDisplayId) {
      setContestProblemMessage({ error: '표시 ID를 입력하세요.' });
      return;
    }

    const normalizedKey = normalizedDisplayId.toLowerCase();
    const duplicate = contestProblemsState.items.some((item) => {
      const existingKey = normalizeProblemKey(item);
      if (existingKey && existingKey === normalizedKey) {
        return true;
      }
      if (typeof item.id === 'number' && item.id === targetProblem.id) {
        return true;
      }
      return false;
    });

    if (duplicate) {
      setContestProblemMessage({ error: `표시 ID ${normalizedDisplayId}는 이미 사용 중입니다.` });
      return;
    }

    const problemId = Number(targetProblem.id);
    if (!Number.isFinite(problemId) || problemId <= 0) {
      setContestProblemMessage({ error: '선택한 문제 ID가 올바르지 않습니다.' });
      return;
    }

    setContestProblemActionLoading(true);
    setContestProblemMessage({});
    try {
      await adminService.addContestProblemFromPublic(selectedContest.id, problemId, normalizedDisplayId);
      await fetchContestProblems(selectedContest.id);
      setContestProblemInput('');
      setContestProblemDisplayId('');
      setContestProblemSelected(null);
      setContestProblemSearch({ results: [], loading: false, error: null });
      setContestProblemMessage({ success: `문제 ${normalizedDisplayId}을(를) 추가했습니다.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제를 추가하지 못했습니다.';
      setContestProblemMessage({ error: message });
    } finally {
      setContestProblemActionLoading(false);
    }
  };

  const handleAddContestProblem = async () => {
    if (contestProblemActionLoading) {
      return;
    }
    await tryAddContestProblem();
  };

  const handleRemoveContestProblem = async (contestProblemId: number | string, displayLabel: string) => {
    if (!selectedContest) {
      setContestProblemMessage({ error: '먼저 대회를 선택하세요.' });
      return;
    }

    setContestProblemMessage({});
    const resolvedId = Number(contestProblemId);
    if (!Number.isFinite(resolvedId) || resolvedId <= 0) {
      setContestProblemMessage({ error: '삭제할 문제 정보를 확인할 수 없습니다.' });
      return;
    }
    setDeletingContestProblemId(resolvedId);
    try {
      await adminService.deleteContestProblem(resolvedId);
      await fetchContestProblems(selectedContest.id);
      setContestProblemMessage({ success: `문제 ${displayLabel}을(를) 삭제했습니다.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제를 삭제하지 못했습니다.';
      setContestProblemMessage({ error: message });
    } finally {
      setDeletingContestProblemId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(contestTotal / PAGE_SIZE));
  const canPrev = contestPage > 1;
  const canNext = contestPage < totalPages;

  return (
    <Card padding="lg">
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-gray-900">대회 수정</h2>
          <p className="text-sm text-gray-500">등록된 대회를 검색해 세부 정보를 확인하고 수정합니다.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:flex-1">
            <Input
              type="search"
              label="검색"
              placeholder="대회 제목"
              value={contestSearchKeyword}
              onChange={(e) => handleContestSearchInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleContestSearchSubmit();
                }
              }}
            />
          </div>
          <Button
            onClick={handleContestSearchSubmit}
            className="w-full sm:w-auto bg-[#113F67] text-white hover:bg-[#34699A] focus:ring-[#58A0C8]"
          >
            검색
          </Button>
        </div>

        <section className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">대회 이름</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">기간</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">공개</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">상태</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {contestListLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                      대회 목록을 불러오는 중입니다...
                    </td>
                  </tr>
                ) : contestListError ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-red-600">{contestListError}</td>
                  </tr>
                ) : contestList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">등록된 대회가 없습니다.</td>
                  </tr>
                ) : (
                  contestList.map((contest) => {
                    const isActive = selectedContest?.id === contest.id;
                    const duration = `${formatDateTime(contest.startTime)} ~ ${formatDateTime(contest.endTime)}`;
                    return (
                      <tr
                        key={contest.id}
                        className={`cursor-pointer transition-colors ${isActive ? 'bg-[#E7F2F8]' : 'hover:bg-gray-50'}`}
                        onClick={() => handleSelectContest(contest)}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">{contest.title}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{duration}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{contest.visible ? '공개' : '비공개'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{contest.status ?? '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <Button type="button" variant="ghost" onClick={() => handleSelectContest(contest)}>
                            선택
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
            <span>전체 {contestTotal.toLocaleString()}개 · 현재 {contestList.length}개 표시 중</span>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => handleContestPageChange('prev')}>
                이전
              </Button>
              <span className="text-sm text-gray-600">
                {contestPage} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={!canNext} onClick={() => handleContestPageChange('next')}>
                다음
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900">대회 상세</h3>
            <p className="text-xs text-gray-500">선택한 대회의 기본 정보를 수정할 수 있습니다.</p>
          </div>

          {contestDetailLoading ? (
            <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-gray-500">
              대회 정보를 불러오는 중입니다...
            </div>
          ) : selectedContest && contestEditForm ? (
            <form onSubmit={handleContestEditSubmit} className="space-y-5">
              {contestEditMessage.error && (
                <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{contestEditMessage.error}</div>
              )}
              {contestEditMessage.success && (
                <div className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-600">{contestEditMessage.success}</div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="대회 제목"
                  value={contestEditForm.title}
                  onChange={(e) => handleContestEditChange('title', e.target.value)}
                  required
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">룰 타입</label>
                  <input
                    value={selectedContest.ruleType}
                    className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">설명</label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                  rows={4}
                  value={contestEditForm.description}
                  onChange={(e) => handleContestEditChange('description', e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">시작 시간</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                    value={contestEditForm.startTime}
                    onChange={(e) => handleContestEditChange('startTime', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">종료 시간</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                    value={contestEditForm.endTime}
                    onChange={(e) => handleContestEditChange('endTime', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={contestEditForm.visible}
                    onChange={(e) => handleContestEditChange('visible', e.target.checked)}
                  />
                  <span>공개</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={contestEditForm.realTimeRank}
                    onChange={(e) => handleContestEditChange('realTimeRank', e.target.checked)}
                  />
                  <span>실시간 랭크</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={contestEditForm.requiresApproval}
                    onChange={(e) => handleContestEditChange('requiresApproval', e.target.checked)}
                  />
                  <span>참여 승인 필요</span>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="대회 비밀번호 (선택)"
                  value={contestEditForm.password}
                  onChange={(e) => handleContestEditChange('password', e.target.value)}
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">허용 IP (CIDR)</label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                    rows={3}
                    value={contestEditForm.allowedIpRanges}
                    onChange={(e) => handleContestEditChange('allowedIpRanges', e.target.value)}
                    placeholder="127.0.0.1/32&#10;10.0.0.0/24"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button type="submit" loading={contestEditLoading || policySaving}>
                  정보 저장
                </Button>
                <Button type="button" variant="ghost" onClick={handleContestResetForm}>
                  초기화
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-sm text-gray-500">
              목록에서 수정할 대회를 선택하세요.
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">대회 문제 구성</h3>
              <p className="text-xs text-gray-500">선택된 대회에 포함된 문제 목록을 관리합니다.</p>
            </div>
            {selectedContest && (
              <Button type="button" variant="outline" size="sm" onClick={() => fetchContestProblems(selectedContest.id)}>
                문제 목록 새로고침
              </Button>
            )}
          </div>

          {contestProblemMessage.error && (
            <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{contestProblemMessage.error}</div>
          )}
          {contestProblemMessage.success && (
            <div className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-600">{contestProblemMessage.success}</div>
          )}

          {contestProblemsState.loading ? (
            <div className="rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
              대회 문제 정보를 불러오는 중입니다...
            </div>
          ) : contestProblemsState.error ? (
            <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{contestProblemsState.error}</div>
          ) : contestProblemsState.items.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
              아직 선택된 문제가 없습니다. 아래에서 검색해 추가할 수 있습니다.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {contestProblemsState.items.map((item) => {
                const problemId = Number(item.id);
                const label = item.displayId ?? item.id;
                const isDeleting = Number.isFinite(problemId) && deletingContestProblemId === problemId;
                return (
                  <span
                    key={`contest-problem-chip-${problemId || item.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[#113F67]/10 px-3 py-1 text-sm text-[#113F67]"
                  >
                    <span>문제 {label}</span>
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:text-red-700"
                      onClick={() => void handleRemoveContestProblem(problemId, String(label))}
                      disabled={isDeleting}
                    >
                      {isDeleting ? '삭제중' : '×'}
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <form
            className="space-y-3 rounded-md border border-gray-200 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAddContestProblem();
            }}
          >
            <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
              <div>
                  <Input
                    label="문제 검색 또는 ID 입력"
                    value={contestProblemInput}
                    placeholder="예: 1001 또는 다익스트라"
                    onChange={(e) => handleContestProblemInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleAddContestProblem();
                      }
                    }}
                  />
                {contestProblemSearch.error && (
                  <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{contestProblemSearch.error}</div>
                )}
                {!contestProblemSearch.error && contestProblemInput.trim() && contestProblemSearch.loading && (
                  <p className="text-xs text-gray-500">문제를 검색 중입니다...</p>
                )}
                {!contestProblemSearch.error && contestProblemInput.trim() && !contestProblemSearch.loading && contestProblemSearch.results.length === 0 && (
                  <p className="text-xs text-gray-500">검색 결과가 없습니다.</p>
                )}
                {!contestProblemSearch.error && contestProblemInput.trim() && contestProblemSearch.results.length > 0 && (
                  <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200">
                    {contestProblemSearch.results.map((result) => (
                      <li key={`contest-problem-suggestion-${result.id}`}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
                          onClick={() => handleSelectContestProblemSuggestion(result)}
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
              <Input
                label="표시 ID"
                value={contestProblemDisplayId}
                placeholder="예: A, B, P100"
                onChange={(e) => handleContestProblemDisplayIdChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleAddContestProblem();
                  }
                }}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="outline" loading={contestProblemActionLoading}>
                문제 추가
              </Button>
            </div>
          </form>
        </section>
      </div>
    </Card>
  );
};
