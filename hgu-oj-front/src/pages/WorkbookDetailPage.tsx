import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { ProblemList } from '../components/organisms/ProblemList';
import { useWorkbook, useWorkbookProblems } from '../hooks/useWorkbooks';
import { Problem } from '../types';
import { problemService } from '../services/problemService';
import { resolveProblemStatus } from '../utils/problemStatus';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'wrong' | 'untouched'>('all');

  const handleProblemClick = (problemId: number) => {
    const params = new URLSearchParams();
    params.set('workbookId', String(workbookId));
    navigate(`/problems/${problemId}?${params.toString()}`);
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

    const matchesStatusFilter = (problem: Problem) => {
      const status = resolveProblemStatus(problem);
      if (statusFilter === 'all') return true;
      if (statusFilter === 'solved') return status === 'solved';
      if (statusFilter === 'wrong') return status === 'wrong';
      if (statusFilter === 'untouched') return status === 'untouched';
      return true;
    };

    const filtered = enrichedProblems.filter(matchesSearch).filter(matchesStatusFilter);

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
  }, [enrichedProblems, searchQuery, searchField, sortField, sortOrder, statusFilter]);

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

  const handleSortToggle = (field: typeof sortField) => {
    setSortOrder((prevOrder) => {
      if (sortField === field) {
        return prevOrder === 'asc' ? 'desc' : 'asc';
      }
      return 'asc';
    });
    setSortField(field);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSearchField('title');
    setSortField('number');
    setSortOrder('asc');
    setStatusFilter('all');
  };

  const handleStatusFilterChange = (value: string) => {
    const next = (value || 'all') as typeof statusFilter;
    setStatusFilter(next);
  };


  const totalProblemCount = workbook.problemCount ?? problems.length;
  const visibilityLabel = workbook.is_public ? '공개' : '비공개';
  const visibilityTone = workbook.is_public ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';


  return (
    <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-8 space-y-8">
      <Card className="border-0 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-4">
          <div className="flex-shrink-0">
            <Button
              variant="secondary"
              onClick={handleBackClick}
              className="w-full min-w-[200px] whitespace-nowrap lg:w-auto"
            >
              ← 문제집 목록으로 돌아가기
            </Button>
          </div>

          <div className="flex-1 space-y-4 lg:pl-6">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {workbook.title}
              </h1>
              {workbook.category && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 dark:bg-slate-800 dark:text-blue-300">
                  {workbook.category}
                </span>
              )}
            </div>

            <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {workbook.description ? (
                <div dangerouslySetInnerHTML={{ __html: workbook.description }} />
              ) : (
                <p>문제집 소개가 아직 등록되지 않았습니다.</p>
              )}
            </div>
          </div>

          <div className="w-full lg:w-[300px]">
            <Card
              padding="md"
              shadow="sm"
              className="border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-6">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">문제 수</span>
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {totalProblemCount}문제
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">공개 여부</span>
                  <span className={`text-base font-semibold ${visibilityTone} whitespace-nowrap`}>
                    {visibilityLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">생성일</span>
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {formatDate(workbook.created_at)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Card>

      <Card className="border-0 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 lg:ml-auto lg:w-auto">
              <form onSubmit={handleSearchSubmit} className="flex w-full sm:w-auto sm:min-w-[320px]">
                <label htmlFor="workbook-problem-search" className="sr-only">문제 검색</label>
                <input
                  id="workbook-problem-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="문제 검색..."
                  className="w-full rounded-l-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
              <div className="flex w-full justify-end sm:w-auto sm:items-center sm:gap-2">
                <label htmlFor="workbook-status-filter" className="sr-only">문제 상태 필터</label>
                <select
                  id="workbook-status-filter"
                  value={statusFilter}
                  onChange={(event) => handleStatusFilterChange(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-28"
                >
                  <option value="all">전체</option>
                  <option value="untouched">미시도</option>
                  <option value="solved">정답</option>
                  <option value="wrong">오답</option>
                </select>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 text-center shadow-sm transition hover:border-blue-400 hover:text-blue-600"
                >
                  초기화
                </button>
              </div>
            </div>

            <ProblemList
              problems={processedProblems}
              onProblemClick={handleProblemClick}
              isLoading={false}
              totalPages={1}
              currentPage={1}
              showStats
              showStatus
              showOriginalId
              onSortChange={handleSortToggle}
              sortField={sortField}
              sortOrder={sortOrder}
            />
          </div>
        )}
      </Card>
    </div>
  );
};
