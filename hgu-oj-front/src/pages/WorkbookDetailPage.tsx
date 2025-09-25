import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { ProblemList } from '../components/organisms/ProblemList';
import { useWorkbook, useWorkbookProblems } from '../hooks/useWorkbooks';
import { Problem } from '../types';
import { useQuery } from '@tanstack/react-query';
import { problemService } from '../services/problemService';

export const WorkbookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const workbookId = id ? parseInt(id, 10) : 0;

  const { data: workbook, isLoading: workbookLoading, error: workbookError } = useWorkbook(workbookId);
  const { data: problemsData, isLoading: problemsLoading, error: problemsError } = useWorkbookProblems(workbookId);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<'title' | 'tag' | 'number'>('title');
  const [sortField, setSortField] = useState<'number' | 'submission' | 'accuracy'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleProblemClick = (problemId: number) => {
    navigate(`/problems/${problemId}`);
  };

  const handleBackClick = () => {
    navigate('/workbooks');
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getErrorMessage = (error: unknown) => {
    if (!error) return '';
    return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
  };

  const problems = problemsData?.data || [];

  const overviewItems = useMemo(
    () => [
      {
        label: '작성자',
        value: workbook?.created_by_id ? `User ${workbook.created_by_id}` : '-',
      },
      { label: '생성일', value: formatDate(workbook?.created_at) },
      { label: '최근 수정일', value: formatDate(workbook?.updated_at) },
      {
        label: '공개 여부',
        value: workbook ? (workbook.is_public ? '공개' : '비공개') : '-',
      },
      { label: '문제 수', value: `${workbook?.problemCount ?? problems.length}` },
      { label: '카테고리', value: workbook?.category ?? '-' },
    ],
    [workbook, problems.length],
  );

  const normalizedProblems: Problem[] = useMemo(() => {
    return problems
      .map((item) => item.problem)
      .filter((problem): problem is Problem => Boolean(problem));
  }, [problems]);

  const problemIds = useMemo(
    () => normalizedProblems.map((problem) => problem.id).filter((id): id is number => Number.isFinite(id)),
    [normalizedProblems],
  );

  const problemIdKey = problemIds.join('-');

  const { data: statusMap, isLoading: statusLoading } = useQuery(
    {
      queryKey: ['problem-status-map', problemIdKey],
      queryFn: () => problemService.getProblemStatusMap(problemIds),
      enabled: problemIds.length > 0,
    },
  );

  const enrichedProblems = useMemo(() => {
    if (!statusMap) return normalizedProblems;
    return normalizedProblems.map((problem) => {
      const override = statusMap[problem.id];
      if (!override) return problem;
      const overrideAny = override as any;
      return {
        ...problem,
        myStatus: override.myStatus ?? overrideAny.my_status ?? problem.myStatus,
        solved: override.solved ?? overrideAny.solved ?? problem.solved,
        submissionNumber: override.submissionNumber ?? overrideAny.submission_number ?? problem.submissionNumber,
        acceptedNumber: override.acceptedNumber ?? overrideAny.accepted_number ?? problem.acceptedNumber,
      };
    });
  }, [normalizedProblems, statusMap]);

  const processedProblems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matchesSearch = (problem: Problem) => {
      if (!query) return true;
      if (searchField === 'tag') {
        return (problem.tags ?? []).some((tag) => tag.toLowerCase().includes(query));
      }
      if (searchField === 'number') {
        const identifier = (problem.displayId ?? (problem as any)._id ?? problem.id ?? '').toString().toLowerCase();
        return identifier.includes(query);
      }
      return problem.title.toLowerCase().includes(query);
    };

    const safeNumber = (value: unknown) => {
      const numeric = Number(value);
      return Number.isNaN(numeric) ? null : numeric;
    };

    const getProblemNumber = (problem: Problem) => {
      const raw = (problem.displayId ?? (problem as any)._id ?? problem.id ?? '').toString();
      const numericOnly = raw.replace(/[^0-9]/g, '');
      return {
        numeric: numericOnly ? safeNumber(numericOnly) : null,
        raw,
      };
    };

    const getAccuracy = (problem: Problem) => {
      const submissions = Number(problem.submissionNumber ?? 0);
      const accepted = Number(problem.acceptedNumber ?? 0);
      if (!submissions) return 0;
      return accepted / submissions;
    };

    const filtered = enrichedProblems.filter(matchesSearch);

    const sorted = [...filtered].sort((a, b) => {
      let result = 0;
      if (sortField === 'submission') {
        result = (a.submissionNumber ?? 0) - (b.submissionNumber ?? 0);
      } else if (sortField === 'accuracy') {
        result = getAccuracy(a) - getAccuracy(b);
      } else {
        const aNum = getProblemNumber(a);
        const bNum = getProblemNumber(b);
        if (typeof aNum.numeric === 'number' && typeof bNum.numeric === 'number') {
          result = aNum.numeric - bNum.numeric;
        } else if (typeof aNum.numeric === 'number') {
          result = -1;
        } else if (typeof bNum.numeric === 'number') {
          result = 1;
        } else {
          result = aNum.raw.localeCompare(bNum.raw, undefined, { numeric: true, sensitivity: 'base' });
        }
      }
      return sortOrder === 'desc' ? -result : result;
    });

    return sorted;
  }, [enrichedProblems, searchQuery, searchField, sortField, sortOrder]);

  const solvedCount = useMemo(() => {
    const isSolved = (problem: Problem) => {
      if (problem.solved) return true;
      const status = problem.myStatus ?? (problem as any).my_status;
      if (status == null) return false;
      const normalized = String(status).trim().toUpperCase();
      if (!normalized) return false;
      return normalized === 'AC' || normalized === 'ACCEPTED' || normalized === '0';
    };
    return enrichedProblems.reduce((count, problem) => (isSolved(problem) ? count + 1 : count), 0);
  }, [enrichedProblems]);

  if (workbookLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (workbookError || !workbook) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg mb-4">
          문제집을 찾을 수 없습니다.
        </div>
        <Button variant="secondary" onClick={handleBackClick}>
          문제집 목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery((prev) => prev.trim());
  };

  const handleSearchFieldChange = (value: string) => {
    const field = (value || 'title') as typeof searchField;
    setSearchField(field);
  };

  const handleSortFieldChange = (value: string) => {
    const field = (value || 'number') as typeof sortField;
    setSortField(field);
  };

  const handleSortOrderToggle = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
        <Button
          variant="secondary"
          onClick={handleBackClick}
          className="w-full md:w-auto md:self-start"
        >
          ← 문제집 목록으로 돌아가기
        </Button>
        <div className="md:ml-auto md:w-fit">
          <Card className="border-0 bg-white p-4 shadow-md dark:border-slate-800 dark:bg-slate-900 md:min-w-[360px]">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
                  문제 수
                </span>
                <span className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                  {workbook.problemCount ?? problems.length}
                </span>
              </div>
              <div className="flex flex-col rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
                  공개 여부
                </span>
                <span className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                  {workbook.is_public ? '공개' : '비공개'}
                </span>
              </div>
              <div className="flex flex-col rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-200">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-200">
                  생성일
                </span>
                <span className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  {formatDate(workbook.created_at)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="border-0 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {workbook.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                    {workbook.problemCount ?? problems.length}문제
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {workbook.is_public ? '공개 문제집' : '비공개 문제집'}
                  </span>
                  {workbook.category && (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                      {workbook.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-300">
              문제집 정보를 확인하고 학습 계획에 맞춰 문제를 풀어보세요.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overviewItems.map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl bg-slate-100/80 px-4 py-4 text-sm dark:bg-slate-800/70"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {label}
                </div>
                <div className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="prose max-w-none leading-relaxed text-slate-700 dark:prose-invert dark:text-slate-200">
            {workbook.description ? (
              <div dangerouslySetInnerHTML={{ __html: workbook.description }} />
            ) : (
              <p>문제집 소개가 아직 등록되지 않았습니다.</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="border-0 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">포함된 문제</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">문제집에 포함된 문제 목록과 난이도를 확인하세요.</p>
          </div>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            총 {workbook.problemCount ?? problems.length}문제
          </span>
        </div>

        <div className="mt-6">
          {problemsLoading || statusLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            </div>
          ) : problemsError ? (
            <div className="text-center py-8">
              <div className="text-red-600 dark:text-red-400 mb-2">문제 목록을 불러오는 중 오류가 발생했습니다.</div>
              <p className="text-sm text-slate-600 dark:text-slate-300">{getErrorMessage(problemsError)}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="ml-2 flex flex-wrap items-baseline gap-6">
                  <div className="flex items-baseline gap-2 whitespace-nowrap">
                    <span className="text-sm text-gray-500">총 문제 수</span>
                    <span className="font-mono text-2xl font-bold text-blue-600">
                      {enrichedProblems.length}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 whitespace-nowrap">
                    <span className="text-sm text-gray-500">맞힌 문제</span>
                    <span className="font-mono text-2xl font-bold text-emerald-600">
                      {solvedCount} / {enrichedProblems.length}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <form onSubmit={handleSearchSubmit} className="flex w-full sm:w-auto sm:min-w-[360px]">
                    <label htmlFor="workbook-problem-search" className="sr-only">문제 검색</label>
                    <input
                      id="workbook-problem-search"
                      type="search"
                      value={searchQuery}
                      onChange={(event) => handleSearchChange(event.target.value)}
                      placeholder="문제 검색..."
                      className="w-full rounded-l-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={searchField}
                      onChange={(event) => handleSearchFieldChange(event.target.value)}
                      className="w-28 border-y border-r border-gray-300 bg-white px-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="title">제목</option>
                      <option value="tag">태그</option>
                      <option value="number">번호</option>
                    </select>
                    <button
                      type="submit"
                      className="min-w-[60px] rounded-r-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white text-center shadow-sm transition hover:bg-blue-700"
                    >
                      검색
                    </button>
                  </form>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      value={sortField}
                      onChange={(event) => handleSortFieldChange(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-28"
                    >
                      <option value="number">번호</option>
                      <option value="submission">제출수</option>
                      <option value="accuracy">정답률</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleSortOrderToggle}
                      className="min-w-[96px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 text-center shadow-sm transition hover:border-blue-400 hover:text-blue-600"
                    >
                      {sortOrder === 'desc' ? '내림차순' : '오름차순'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <ProblemList
                  problems={processedProblems}
                  onProblemClick={handleProblemClick}
                  isLoading={false}
                  totalPages={1}
                  currentPage={1}
                  showStats
                  showStatus
                  showOriginalId
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
