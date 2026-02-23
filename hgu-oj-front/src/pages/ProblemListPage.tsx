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
  const [showAllTags, setShowAllTags] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, error } = useProblems(filter);
  const microProblems = useMemo(() => (data?.data ?? []) as Problem[], [data?.data]);
  const {
    data: tagCountsData,
    isLoading: isTagCountsLoading,
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

  const handleTagToggle = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName];
    setFilter({ tags: newTags, page: 1 });
  };

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
      // OR 조건: 선택된 태그 중 하나라도 포함되면 통과
      return requiredTags.some((tag) => normalizedTags.includes(tag));
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
        return status === statusFilter;
      })
      .filter((problem) => {
        if (filter.difficultyLevel && filter.difficultyLevel > 0) {
          const rawDifficulty =
            (problem as any).difficulty ??
            (problem as any).level ??
            (problem as any).difficulty_level ??
            (problem as any).difficultyLevel ??
            (problem as any).difficulty_name ??
            (problem as any).difficultyName;
          if (!rawDifficulty) return false;
          const displayDifficulty = String(rawDifficulty).replace(/^Lv\.\s*/i, '');
          return Number(displayDifficulty) === filter.difficultyLevel;
        }
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

    const namePriority = (value: string) => {
      if (/^[0-9]/.test(value)) return 0;
      if (/^[A-Za-z]/.test(value)) return 1;
      if (/^[가-힣]/.test(value)) return 2;
      return 3;
    };

    const compareText = (aText: string, bText: string) => {
      const prA = namePriority(aText);
      const prB = namePriority(bText);
      if (prA !== prB) return prA - prB;
      return aText.localeCompare(bText, 'ko', { numeric: true, sensitivity: 'base' });
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
          result = compareText(idA, idB);
        }
      } else {
        const titleA = (a.title ?? '').trim();
        const titleB = (b.title ?? '').trim();
        result = compareText(titleA, titleB);
        if (result === 0) {
          const idA = extractIdentifier(a);
          const idB = extractIdentifier(b);
          result = compareText(idA, idB);
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
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [tagCountsData]);

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
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white shadow-sm"
                />
              </form>
            </div>

            {/* Categories */}
            <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"></path></svg>
                카테고리
              </h3>
              {isTagCountsLoading && (
                <div className="text-sm text-gray-500 mb-3">태그를 불러오는 중입니다...</div>
              )}
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
                    <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">전체 보기</span>
                  </div>
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 py-1 px-2.5 rounded-full">{data?.total || microProblems.length}</span>
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
                      <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">{tag.name}</span>
                    </div>
                    <span className="text-xs font-medium bg-gray-100 text-gray-600 py-1 px-2.5 rounded-full">{tag.count}</span>
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
            <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                난이도
              </h3>
              <div className="px-2">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={filter.difficultyLevel ?? 0}
                  onChange={(e) => setFilter({ difficultyLevel: parseInt(e.target.value, 10), page: 1 })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium">
                  <span>전체</span>
                  <span>Lv.1</span>
                  <span>Lv.2</span>
                  <span>Lv.3</span>
                  <span>Lv.4</span>
                  <span>Lv.5</span>
                </div>
                <div className="mt-4 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${(filter.difficultyLevel === 0 || filter.difficultyLevel === undefined) ? 'bg-slate-100 text-slate-700' :
                    filter.difficultyLevel === 1 ? 'bg-blue-100 text-blue-700' :
                      filter.difficultyLevel === 2 ? 'bg-green-100 text-green-700' :
                        filter.difficultyLevel === 3 ? 'bg-orange-100 text-orange-700' :
                          filter.difficultyLevel === 4 ? 'bg-red-100 text-red-700' :
                            'bg-purple-100 text-purple-700'
                    }`}>
                    {filter.difficultyLevel === 0 || filter.difficultyLevel === undefined ? '모든 난이도' : `Lv.${filter.difficultyLevel}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Status */}
            {isAuthenticated && (
              <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  상태
                </h3>
                <select
                  value={filter.statusFilter ?? 'all'}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
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
              <div className="text-sm text-gray-500">
                총 <span className="font-bold text-gray-900">{data?.total ?? processedProblems.length}</span>개의 문제 중 <span className="font-bold text-gray-900">{processedProblems.length > 0 ? rowNumberBase + 1 : 0}-{Math.min(rowNumberBase + pageSize, data?.total ?? processedProblems.length)}</span> 표시
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500">정렬:</span>
                <select
                  className="bg-transparent text-sm font-bold text-gray-900 border-none focus:ring-0 cursor-pointer p-0 pr-6"
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
                  <option value="number-asc">번호순</option>
                  <option value="title-desc">최신순</option>
                </select>
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
              showStatus={isAuthenticated}
              getRowNumber={resolveProblemRowNumber}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
