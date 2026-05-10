import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProblems } from '../hooks/useProblems';
import { Problem, ProblemFilter } from '../types';
import { ProblemList } from '../components/organisms/ProblemList';
import { useProblemStore } from '../stores/problemStore';
import { useAuthStore } from '../stores/authStore';
import { PROBLEM_STATUS_LABELS } from '../constants/problemStatus';
import CommonPagination from '../components/common/CommonPagination';
import { normalizeDifficulty } from '../lib/difficulty';
import { resolveProblemStatus } from '../utils/problemStatus';
import { extractProblemTags } from '../utils/problemTags';

const normalizeTags = (tags: string[]): string[] => {
  const unique = new Set(
    tags
      .map((tag) => tag?.trim())
      .filter((tag): tag is string => Boolean(tag))
  );
  return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
};

export const ProblemListPage: React.FC = () => {
  const navigate = useNavigate();
  const { filter, setFilter } = useProblemStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const [minDifficultyLevel, setMinDifficultyLevel] = useState(0);
  const [maxDifficultyLevel, setMaxDifficultyLevel] = useState(5);
  const difficultyRangeLeft = (Math.min(minDifficultyLevel, maxDifficultyLevel) / 5) * 100;
  const difficultyRangeWidth = ((Math.max(minDifficultyLevel, maxDifficultyLevel) - Math.min(minDifficultyLevel, maxDifficultyLevel)) / 5) * 100;
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, error } = useProblems(filter);
  const microProblems = useMemo(() => (data?.data ?? []) as Problem[], [data?.data]);

  const handleProblemClick = (problemId: number) => {
    if (!Number.isFinite(problemId) || problemId <= 0) return;
    navigate(`/problems/${problemId}`);
  };

  useEffect(() => {
    if ((filter.search ?? '') !== searchQuery) {
      setSearchQuery(filter.search ?? '');
    }
  }, [filter.search]);

  useEffect(() => {
    if (typeof filter.difficultyMin === 'number') {
      setMinDifficultyLevel(filter.difficultyMin);
    }
    if (typeof filter.difficultyMax === 'number') {
      setMaxDifficultyLevel(filter.difficultyMax);
    }
  }, [filter.difficultyMin, filter.difficultyMax]);

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

  const selectedTags = useMemo(
    () => normalizeTags(filter.tags ?? []),
    [filter.tags]
  );

  useEffect(() => {
    setFilter({ tags: [], page: 1 });
    return () => {
      setFilter({ tags: [], page: 1 });
    };
  }, []);

  const handleTagToggle = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName];
    setFilter({ tags: newTags, page: 1 });
  };

  const handleProblemListTagClick = (tagName: string) => {
    setFilter({ tags: [tagName], page: 1 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const processedProblems = useMemo(() => {
    const items = microProblems;
    const query = searchQuery.trim().toLowerCase();
    const searchField = filter.searchField ?? 'title';
    const sortField = filter.sortField ?? 'title';
    const sortOrder = filter.sortOrder ?? 'asc';
    const statusFilter = isAuthenticated ? (filter.statusFilter ?? 'all') : 'all';
    const requiredTags = selectedTags.map((tag) => tag.toLowerCase());

    const matchesQuery = (problem: Problem) => {
      if (!query) return true;
      if (searchField === 'tag') {
        const tags = [
          ...(Array.isArray((problem as any).tags) ? (problem as any).tags : []),
          ...(Array.isArray((problem as any).tagNames) ? (problem as any).tagNames : []),
          ...(Array.isArray((problem as any).tag_list) ? (problem as any).tag_list : []),
        ];
        return tags.some((tag: unknown) => typeof tag === 'string' && tag.trim().toLowerCase().includes(query));
      }
      if (searchField === 'number') {
        const identifier = String(problem.displayId ?? problem._id ?? problem.id ?? '').toLowerCase();
        return identifier.includes(query);
      }
      return String(problem.title ?? '').toLowerCase().includes(query);
    };

    const matchesSelectedTags = (problem: Problem) => {
      if (requiredTags.length === 0) return true;
      const normalizedTags = extractProblemTags(problem).map((tag) => tag.toLowerCase());
      if (normalizedTags.length === 0) return false;
      return requiredTags.some((tag) => normalizedTags.includes(tag));
    };

    const getDifficultyLevel = (problem: Problem) => {
      const rawDifficulty =
        (problem as any).difficulty ??
        (problem as any).level ??
        (problem as any).difficulty_level ??
        (problem as any).difficultyLevel ??
        (problem as any).difficulty_name ??
        (problem as any).difficultyName;
      return normalizeDifficulty(rawDifficulty);
    };

    const getNumericOrder = (problem: Problem) => {
      if (Number.isFinite(problem.id)) {
        return Number(problem.id);
      }
      const identifier = String(problem.displayId ?? problem._id ?? problem.id ?? '');
      const numericOnly = identifier.replace(/[^0-9]/g, '');
      return numericOnly ? Number(numericOnly) : Number.MAX_SAFE_INTEGER;
    };

    const compareStrings = (a: string, b: string) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

    const filtered = items
      .filter(matchesSelectedTags)
      .filter(matchesQuery)
      .filter((problem) => {
        if (!isAuthenticated) return true;
        const status = resolveProblemStatus(problem);
        if (statusFilter === 'all') return true;
        return status === statusFilter;
      })
      .filter((problem) => {
        const difficultyLevel = getDifficultyLevel(problem);
        if (difficultyLevel === null) return false;
        return difficultyLevel >= minDifficultyLevel && difficultyLevel <= maxDifficultyLevel;
      });

    const sorted = [...filtered].sort((a, b) => {
      if (sortField === 'number') {
        return getNumericOrder(a) - getNumericOrder(b);
      }
      if (sortField === 'title') {
        return compareStrings(String(a.title ?? ''), String(b.title ?? ''));
      }
      if (sortField === 'submission') {
        return (a.submissionNumber ?? 0) - (b.submissionNumber ?? 0);
      }
      return (a.acceptedNumber ?? 0) - (b.acceptedNumber ?? 0);
    });

    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [
    microProblems,
    filter.searchField,
    filter.sortField,
    filter.sortOrder,
    filter.statusFilter,
    searchQuery,
    isAuthenticated,
    selectedTags,
    minDifficultyLevel,
    maxDifficultyLevel,
  ]);

  const tagStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const problem of microProblems) {
      const tags = extractProblemTags(problem);
      for (const tag of tags) {
        const normalized = tag.trim();
        if (!normalized) continue;
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [microProblems]);

  const handlePageChange = (page: number) => {
    setFilter({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-64 shrink-0 space-y-6">

            {/* Search */}
            <div>
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="제목, 내용 검색"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm"
                />
              </form>
            </div>

            {/* Categories */}
            <div className="bg-white dark:bg-slate-900 p-5 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm">
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500 dark:text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"></path></svg>
                카테고리
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="category-all"
                      checked={selectedTags.length === 0}
                      onChange={() => setFilter({ tags: [], page: 1 })}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100">전체 보기</span>
                  </div>
                </label>
                {(tagStats || []).slice(0, showAllTags ? undefined : 8).map((tag) => (
                  <label key={tag.name} className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name={`category-${tag.name}`}
                        checked={selectedTags.includes(tag.name)}
                        onChange={() => handleTagToggle(tag.name)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100">{tag.name}</span>
                    </div>
                  </label>
                ))}
                {(tagStats || []).length > 8 && (
                  <button
                    type="button"
                    onClick={() => setShowAllTags(!showAllTags)}
                    className="w-full text-left text-sm font-medium text-blue-600 hover:text-blue-700 mt-2"
                  >
                    {showAllTags ? '간략히 보기' : '+ 더보기'}
                  </button>
                )}
              </div>
            </div>

            {/* Difficulty */}
            <div className="bg-white dark:bg-slate-900 p-5 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm">
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                난이도
              </h3>
              <div className="px-2">
                <div className="relative h-8">
                  <div className="absolute inset-x-0 top-3 h-2 rounded-lg bg-gray-200 dark:bg-slate-700" />
                  <div
                    className="absolute top-3 h-2 rounded-lg bg-blue-500/80 dark:bg-sky-400/85"
                    style={{
                      left: `${difficultyRangeLeft}%`,
                      width: `${difficultyRangeWidth}%`,
                    }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={minDifficultyLevel}
                    onChange={(e) => {
                      const next = parseInt(e.target.value, 10);
                      setMinDifficultyLevel(next);
                      const nextMax = next > maxDifficultyLevel ? next : maxDifficultyLevel;
                      if (next > maxDifficultyLevel) setMaxDifficultyLevel(next);
                      setFilter({ difficultyMin: next, difficultyMax: nextMax, page: 1 });
                    }}
                    className="dual-range dual-range-min absolute inset-x-0 top-3 w-full h-2 bg-transparent appearance-none cursor-pointer accent-blue-600"
                  />
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={maxDifficultyLevel}
                    onChange={(e) => {
                      const next = parseInt(e.target.value, 10);
                      setMaxDifficultyLevel(next);
                      const nextMin = next < minDifficultyLevel ? next : minDifficultyLevel;
                      if (next < minDifficultyLevel) setMinDifficultyLevel(next);
                      setFilter({ difficultyMin: nextMin, difficultyMax: next, page: 1 });
                    }}
                    className="dual-range dual-range-max absolute inset-x-0 top-3 w-full h-2 bg-transparent appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-300 mt-3 font-medium">
                  <span>Lv.0</span>
                  <span>Lv.1</span>
                  <span>Lv.2</span>
                  <span>Lv.3</span>
                  <span>Lv.4</span>
                  <span>Lv.5</span>
                </div>
                <div className="mt-4 text-center">
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100 dark:ring-1 dark:ring-slate-500/60">
                    Lv.{minDifficultyLevel} ~ Lv.{maxDifficultyLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* Status */}
            {isAuthenticated && (
              <div className="bg-white dark:bg-slate-900 p-5 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm">
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  상태
                </h3>
                <select
                  value={filter.statusFilter ?? 'all'}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                >
                  <option value="all">모든 문제</option>
                  <option value="untouched">{PROBLEM_STATUS_LABELS.untouched}</option>
                  <option value="solved">{PROBLEM_STATUS_LABELS.solved}</option>
                  <option value="wrong">{PROBLEM_STATUS_LABELS.wrong}</option>
                </select>
              </div>
            )}

          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500 dark:text-slate-400">
                총 <span className="font-bold text-gray-900 dark:text-slate-100">{data?.total ?? processedProblems.length}</span>개의 문제
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500 dark:text-slate-400">정렬:</span>
                <select
                  className="bg-transparent text-sm font-bold text-gray-900 dark:text-slate-100 border-none focus:ring-0 cursor-pointer p-0 pr-6"
                  onChange={(e) => {
                    const value = e.target.value;
                    const isDesc = value.endsWith('-desc');
                    const field = value.replace('-desc', '').replace('-asc', '') as any;
                    setFilter({ sortField: field, sortOrder: isDesc ? 'desc' : 'asc', page: 1 });
                  }}
                  value={`${filter.sortField ?? 'title'}-${filter.sortOrder ?? 'asc'}`}
                >
                  <option value="title-asc">제목순</option>
                  <option value="submission-desc">제출 많은순</option>
                  <option value="accuracy-desc">정답률 높은순</option>
                  <option value="number-desc">최신순</option>
                </select>
              </div>
            </div>

            <ProblemList
              problems={processedProblems}
              onProblemClick={handleProblemClick}
              onTagClick={handleProblemListTagClick}
              isLoading={isLoading}
              onSortChange={handleSortToggle}
              sortField={filter.sortField ?? 'title'}
              sortOrder={filter.sortOrder ?? 'asc'}
              showStatus={isAuthenticated}
              getRowNumber={resolveProblemRowNumber}
            />
            {processedProblems.length > 0 && (
              <div className="mt-6">
                <CommonPagination
                  page={filter.page || 1}
                  pageSize={pageSize}
                  totalPages={data?.totalPages || 1}
                  totalItems={data?.total}
                  onChangePage={handlePageChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
