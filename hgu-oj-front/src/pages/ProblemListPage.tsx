import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProblems } from '../hooks/useProblems';
import { Problem, ProblemFilter } from '../types';
import { ProblemList } from '../components/organisms/ProblemList';
import { useProblemStore } from '../stores/problemStore';
import { resolveProblemStatus } from '../utils/problemStatus';
import { useAuthStore } from '../stores/authStore';
import { PROBLEM_STATUS_LABELS } from '../constants/problemStatus';
import { TagFilterBar } from '../components/problems/TagFilterBar';
import { getTagColor } from '../utils/tagColor';
import { problemService } from '../services/problemService';
import { extractProblemTags } from '../utils/problemTags';

const normalizeTags = (tags: string[]): string[] => {
  const unique = new Set(
    tags
      .map((tag) => tag?.trim())
      .filter((tag): tag is string => Boolean(tag))
  );
  return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
};

const areTagArraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
};

const parseTagsFromQuery = (value: string | null): string[] => {
  if (!value) return [];
  return normalizeTags(value.split(','));
};

export const ProblemListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { filter, setFilter } = useProblemStore();
  const [searchQuery, setSearchQuery] = useState('');
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, error } = useProblems(filter);
  const microProblems = useMemo(() => (data?.data ?? []) as Problem[], [data?.data]);
  const {
    data: tagCountsData,
    isLoading: isTagCountsLoading,
    error: tagCountsError,
  } = useQuery({
    queryKey: ['problem', 'tag-counts'],
    queryFn: ({ signal }) => problemService.getTagCounts({ signal }),
  });

  const problemIdentifiers = useMemo(() => {
    return microProblems
      .map((problem) => problem.displayId ?? problem._id ?? problem.id)
      .filter((value): value is string | number => value !== undefined && value !== null)
      .map((value) => String(value).trim())
      .filter((value) => value.length > 0);
  }, [microProblems]);

  const {
    data: statusMap,
  } = useQuery({
    queryKey: ['problem', 'status-map', problemIdentifiers],
    queryFn: () => problemService.getProblemStatusMap(problemIdentifiers),
    enabled: isAuthenticated && problemIdentifiers.length > 0,
  });

  const normalizedStatusMap = useMemo(() => {
    if (!statusMap) {
      return {} as Record<string, Problem>;
    }
    return Object.entries(statusMap).reduce<Record<string, Problem>>((acc, [key, value]) => {
      if (!value) return acc;
      const candidates = [key, value.displayId, (value as any)._id, value.id];
      candidates.forEach((candidate) => {
        if (candidate === undefined || candidate === null) return;
        const normalized = String(candidate).trim().toLowerCase();
        if (normalized) {
          acc[normalized] = value;
        }
      });
      return acc;
    }, {});
  }, [statusMap]);

  const handleProblemClick = (problemKey: string) => {
    if (!problemKey) return;
    navigate(`/problems/${encodeURIComponent(problemKey)}`);
  };

  useEffect(() => {
    if ((filter.search ?? '') !== searchQuery) {
      setSearchQuery(filter.search ?? '');
    }
  }, [filter.search]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setFilter({ search: query, page: 1 });
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilter({ search: searchQuery.trim(), page: 1 });
  };

  const handleSortToggle = (field: 'number' | 'title' | 'submission' | 'accuracy') => {
    const currentField = filter.sortField ?? 'title';
    const currentOrder = filter.sortOrder ?? 'asc';
    if (currentField === field) {
      const nextOrder = currentOrder === 'asc' ? 'desc' : 'asc';
      setFilter({ sortOrder: nextOrder, page: 1 });
    } else {
      setFilter({ sortField: field, sortOrder: 'asc', page: 1 });
    }
  };

  const handleStatusFilterChange = (value: string) => {
    const statusFilter = (value || 'all') as ProblemFilter['statusFilter'];
    setFilter({ statusFilter, page: 1 });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilter({
      search: '',
      searchField: 'title',
      sortField: 'title',
      sortOrder: 'asc',
      statusFilter: 'all',
      page: 1,
      tags: [],
    });
  };

  const selectedTags = useMemo(
    () => normalizeTags(filter.tags ?? []),
    [filter.tags]
  );

  const searchParamsString = searchParams.toString();
  const selectedTagsRef = useRef<string[]>(selectedTags);

  useEffect(() => {
    selectedTagsRef.current = selectedTags;
  }, [selectedTags]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const parsed = parseTagsFromQuery(params.get('tags'));
    if (!areTagArraysEqual(parsed, selectedTagsRef.current)) {
      setFilter({ tags: parsed, page: 1 });
    }
  }, [searchParamsString, setFilter]);

  useEffect(() => {
    const normalized = normalizeTags(selectedTags);
    const params = new URLSearchParams(searchParamsString);
    const current = params.get('tags');

    if (normalized.length === 0) {
      if (current) {
        params.delete('tags');
        setSearchParams(params, { replace: true });
      }
      return;
    }

    const joined = normalized.join(',');
    if (current !== joined) {
      params.set('tags', joined);
      setSearchParams(params, { replace: true });
    }
  }, [selectedTags, searchParamsString, setSearchParams]);

  const handleTagToggle = (tag: string) => {
    const current = normalizeTags(selectedTags);
    const exists = current.includes(tag);
    const next = exists ? current.filter((item) => item !== tag) : normalizeTags([...current, tag]);
    setFilter({ tags: next, page: 1 });
  };

  const processedProblems = useMemo(() => {
    const items = microProblems;
    const query = searchQuery.trim().toLowerCase();
    const searchField = filter.searchField ?? 'title';
    const sortField = filter.sortField ?? 'title';
    const sortOrder = filter.sortOrder ?? 'asc';
    const statusFilter = isAuthenticated ? (filter.statusFilter ?? 'all') : 'all';
    const requiredTags = selectedTags.map((tag) => tag.toLowerCase());

    const matchesQuery = (problem: any) => {
      if (!query) return true;
      if (searchField === 'tag') {
        const tags = [
          ...(Array.isArray(problem.tags) ? problem.tags : []),
          ...(Array.isArray(problem.tagNames) ? problem.tagNames : []),
          ...(Array.isArray(problem.tag_list) ? problem.tag_list : []),
        ];
        return tags.some((tag: unknown) =>
          typeof tag === 'string' && tag.trim().toLowerCase().includes(query)
        );
      }
      if (searchField === 'number') {
        const identifier = (problem.displayId ?? problem._id ?? problem.id ?? '').toString().toLowerCase();
        return identifier.includes(query);
      }
      return (problem.title ?? '').toLowerCase().includes(query);
    };

    const matchesSelectedTags = (problem: Problem) => {
      if (requiredTags.length === 0) {
        return true;
      }
      const normalizedTags = extractProblemTags(problem)
        .map((tag) => tag.toLowerCase());
      if (normalizedTags.length === 0) {
        return false;
      }
      return requiredTags.every((tag) => normalizedTags.includes(tag));
    };

    const hydratedItems = items.map((problem) => {
      if (!isAuthenticated) {
        return problem;
      }
      const candidates = [problem.displayId, problem._id, (problem as any)._id, problem.id];
      for (const candidate of candidates) {
        if (candidate === undefined || candidate === null) continue;
        const key = String(candidate).trim().toLowerCase();
        if (!key) continue;
        const statusSource = normalizedStatusMap[key];
        if (statusSource) {
          return {
            ...problem,
            myStatus: statusSource.myStatus ?? (statusSource as any).my_status ?? problem.myStatus,
            solved: statusSource.solved ?? problem.solved,
          };
        }
      }
      return problem;
    });

    const filterResult = hydratedItems
      .filter(matchesSelectedTags)
      .filter(matchesQuery)
      .filter((problem) => {
        if (!isAuthenticated) return true;
        const status = resolveProblemStatus(problem);
        if (statusFilter === 'all') return true;
        if (statusFilter === PROBLEM_STATUS_LABELS.solved) return status === PROBLEM_STATUS_LABELS.solved;
        if (statusFilter === PROBLEM_STATUS_LABELS.wrong) return status === PROBLEM_STATUS_LABELS.wrong;
        if (statusFilter === PROBLEM_STATUS_LABELS.untouched) return status === PROBLEM_STATUS_LABELS.untouched;
        return true;
      });

    const extractIdentifier = (problem: any) => (problem.displayId ?? problem._id ?? problem.id ?? '').toString();

    const getNumericOrder = (problem: any) => {
      const identifier = extractIdentifier(problem);
      const numericOnly = identifier.replace(/[^0-9]/g, '');
      if (!numericOnly) return null;
      const numeric = Number(numericOnly);
      return Number.isNaN(numeric) ? null : numeric;
    };

    const getAccuracy = (problem: any) => {
      const submissions = Number(problem.submissionNumber ?? 0);
      const accepted = Number(problem.acceptedNumber ?? 0);
      if (!submissions) return 0;
      return accepted / submissions;
    };

    const sorted = [...filterResult].sort((a, b) => {
      let result = 0;
      if (sortField === 'submission') {
        result = (a.submissionNumber ?? 0) - (b.submissionNumber ?? 0);
      } else if (sortField === 'accuracy') {
        result = getAccuracy(a) - getAccuracy(b);
      } else if (sortField === 'number') {
        const aNum = getNumericOrder(a);
        const bNum = getNumericOrder(b);
        if (typeof aNum === 'number' && typeof bNum === 'number') {
          result = aNum - bNum;
        } else if (typeof aNum === 'number') {
          result = -1;
        } else if (typeof bNum === 'number') {
          result = 1;
        } else {
          const idA = extractIdentifier(a);
          const idB = extractIdentifier(b);
          result = idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        }
      } else {
        const titleA = (a.title ?? '').trim();
        const titleB = (b.title ?? '').trim();
        result = titleA.localeCompare(titleB, undefined, { sensitivity: 'base' });
        if (result === 0) {
          const idA = extractIdentifier(a);
          const idB = extractIdentifier(b);
          result = idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        }
      }
      return sortOrder === 'desc' ? -result : result;
    });

    return sorted;
  }, [
    microProblems,
    searchQuery,
    filter.searchField,
    filter.sortField,
    filter.sortOrder,
    filter.statusFilter,
    isAuthenticated,
    selectedTags,
    normalizedStatusMap,
  ]);

  const tagStats = useMemo(() => {
    return (tagCountsData ?? [])
      .map(({ tag, count }) => ({
        name: tag,
        count,
        colorScheme: getTagColor(tag),
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [tagCountsData]);

  const tagCountsErrorMessage = useMemo(() => {
    if (!tagCountsError) return null;
    if (tagCountsError instanceof Error) return tagCountsError.message;
    return typeof tagCountsError === 'string' ? tagCountsError : '태그 정보를 불러오지 못했습니다.';
  }, [tagCountsError]);

  const hasActiveFilters = useMemo(() => {
    const sortField = filter.sortField ?? 'title';
    const sortOrder = filter.sortOrder ?? 'asc';
    const statusFilter = filter.statusFilter ?? 'all';
    const searchValue = filter.search?.trim() ?? '';
    return (
      selectedTags.length > 0 ||
      searchValue.length > 0 ||
      sortField !== 'title' ||
      sortOrder !== 'asc' ||
      statusFilter !== 'all'
    );
  }, [filter.sortField, filter.sortOrder, filter.statusFilter, filter.search, selectedTags]);

  useEffect(() => {
    if (!isAuthenticated && (filter.statusFilter && filter.statusFilter !== 'all')) {
      setFilter({ statusFilter: 'all' });
    }
  }, [isAuthenticated, filter.statusFilter, setFilter]);

  const handlePageChange = (page: number) => {
    setFilter({ page });
  };

  const pageSize = filter.limit ?? 20;
  const rowNumberBase = useMemo(() => {
    const currentPage = filter.page ?? 1;
    return Math.max((currentPage - 1) * pageSize, 0);
  }, [filter.page, pageSize]);

  const resolveProblemRowNumber = useCallback(
    (_problem: Problem, index: number) => rowNumberBase + index + 1,
    [rowNumberBase],
  );

  if (error) {
    return (
      <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">오류가 발생했습니다</h1>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-8">
        {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          {(isTagCountsLoading || tagCountsErrorMessage || tagStats.length > 0) && (
            <div className="flex flex-1 flex-col gap-3">
              {isTagCountsLoading && (
                <div className="text-sm text-gray-500">태그를 불러오는 중입니다...</div>
              )}
              {!isTagCountsLoading && tagCountsErrorMessage && (
                <div className="text-sm text-red-600">{tagCountsErrorMessage}</div>
              )}
              {!isTagCountsLoading && !tagCountsErrorMessage && tagStats.length > 0 && (
                <TagFilterBar
                  tags={tagStats}
                  selectedTags={selectedTags}
                  onToggle={handleTagToggle}
                  collapsible
                />
              )}
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 xl:w-auto">
            <form onSubmit={handleSearchSubmit} className="flex w-full sm:w-auto sm:min-w-[360px]">
              <label htmlFor="problem-search" className="sr-only">문제 검색</label>
              <input
                id="problem-search"
                type="search"
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="제목을 입력하세요"
                className="w-full rounded-l-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="min-w-[60px] rounded-r-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white text-center shadow-sm transition hover:bg-blue-700"
              >
                검색
              </button>
            </form>
            {isAuthenticated && (
              <div className="flex w-full sm:w-auto sm:min-w-[220px]">
                <label htmlFor="problem-status-filter" className="sr-only">문제 상태 필터</label>
                <select
                  id="problem-status-filter"
                  value={filter.statusFilter ?? 'all'}
                  onChange={(event) => handleStatusFilterChange(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-28"
                >
                  <option value="all">전체</option>
                  <option value={PROBLEM_STATUS_LABELS.untouched}>{PROBLEM_STATUS_LABELS.untouched}</option>
                  <option value={PROBLEM_STATUS_LABELS.solved}>{PROBLEM_STATUS_LABELS.solved}</option>
                  <option value={PROBLEM_STATUS_LABELS.wrong}>{PROBLEM_STATUS_LABELS.wrong}</option>
                </select>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="ml-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 text-center shadow-sm transition hover:border-blue-400 hover:text-blue-600"
                >
                  초기화
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

        <ProblemList
          problems={processedProblems}
          onProblemClick={handleProblemClick}
          isLoading={isLoading}
          totalPages={data?.totalPages || 1}
          currentPage={filter.page || 1}
          onPageChange={handlePageChange}
          onSortChange={handleSortToggle}
          sortField={filter.sortField ?? 'title'}
          sortOrder={filter.sortOrder ?? 'asc'}
          primarySortField="title"
          showStatus={isAuthenticated}
          getRowNumber={resolveProblemRowNumber}
        />
      </div>
    </div>
  );
};
