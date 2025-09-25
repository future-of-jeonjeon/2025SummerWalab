import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProblems } from '../hooks/useProblems';
import { ProblemFilter } from '../types';
import { ProblemList } from '../components/organisms/ProblemList';
import { useProblemStore } from '../stores/problemStore';

export const ProblemListPage: React.FC = () => {
  const navigate = useNavigate();
  const { filter, setFilter } = useProblemStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useProblems(filter);

  const handleProblemClick = (problemId: number) => {
    navigate(`/problems/${problemId}`);
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

  const handleSearchFieldChange = (value: string) => {
    const searchField = (value || 'title') as ProblemFilter['searchField'];
    setFilter({ searchField, page: 1 });
  };

  const handleSortFieldChange = (value: string) => {
    const sortField = (value || 'number') as ProblemFilter['sortField'];
    const preserveOrder = filter.sortOrder ?? 'asc';
    setFilter({ sortField, sortOrder: preserveOrder, page: 1 });
  };

  const handleSortOrderToggle = () => {
    const current = filter.sortOrder ?? 'asc';
    const nextOrder = current === 'desc' ? 'asc' : 'desc';
    setFilter({ sortOrder: nextOrder, page: 1 });
  };

  const processedProblems = useMemo(() => {
    const items = data?.data ?? [];
    const query = searchQuery.trim().toLowerCase();
    const searchField = filter.searchField ?? 'title';
    const sortField = filter.sortField ?? 'number';
    const sortOrder = filter.sortOrder ?? 'asc';

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

    const filterResult = items.filter(matchesQuery);

    const safeNumber = (value: unknown) => {
      const numeric = Number(value);
      return Number.isNaN(numeric) ? null : numeric;
    };

    const getProblemNumber = (problem: any) => {
      const raw = (problem.displayId ?? problem._id ?? problem.id ?? '').toString();
      const numericOnly = raw.replace(/[^0-9]/g, '');
      return {
        numeric: numericOnly ? safeNumber(numericOnly) : null,
        raw,
      };
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
  }, [data?.data, searchQuery, filter.searchField, filter.sortField, filter.sortOrder]);

  const handlePageChange = (page: number) => {
    setFilter({ page });
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">오류가 발생했습니다</h1>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 lg:ml-2">
              <span className="text-sm text-gray-500">전체 문제 수</span>
              <span className="text-2xl font-bold text-blue-600">{data?.total || 0}</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <form onSubmit={handleSearchSubmit} className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                <label htmlFor="problem-search" className="sr-only">문제 검색</label>
                <div className="flex w-full sm:w-auto sm:min-w-[360px]">
                  <input
                    id="problem-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    placeholder="검색어를 입력하세요"
                    className="w-full rounded-l-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={filter.searchField ?? 'title'}
                    onChange={(e) => handleSearchFieldChange(e.target.value)}
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
                </div>
              </form>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={filter.sortField ?? 'number'}
                  onChange={(e) => handleSortFieldChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-24"
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
                  {filter.sortOrder === 'desc' ? '내림차순' : '오름차순'}
                </button>
              </div>
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
        />
      </div>
    </div>
  );
};
