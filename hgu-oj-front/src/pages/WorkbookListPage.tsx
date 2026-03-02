import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { WorkbookList } from '../components/organisms/WorkbookList';
import { useWorkbooks } from '../hooks/useWorkbooks';
import { useWorkbookStore } from '../stores/workbookStore';
import { problemService } from '../services/problemService';

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

export const WorkbookListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { filter, setFilter } = useWorkbookStore();
  const [searchQuery, setSearchQuery] = useState(filter.search || '');
  const [showAllCategories, setShowAllCategories] = useState(false);

  // useWorkbooks returns { data, isLoading, error, refetch } from useQuery
  const { data: workbookResponse, isLoading, error } = useWorkbooks(filter);

  const {
    data: tagCountsData,
    isLoading: isTagCountsLoading,
  } = useQuery({
    queryKey: ['problem', 'tag-counts'],
    queryFn: ({ signal }) => problemService.getTagCounts({ signal }),
  });

  const tagStats = useMemo(() => {
    return (tagCountsData ?? [])
      .map(({ tag, count }) => ({
        name: tag,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [tagCountsData]);

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

  const handleCategoryToggle = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName];
    setFilter({ tags: newTags, page: 1 });
  };

  const workbooks = workbookResponse?.data || [];
  const totalCount = workbookResponse?.total || 0;
  const currentPage = workbookResponse?.page || 1;
  const totalPages = workbookResponse?.totalPages || 1;

  const handleWorkbookClick = (workbookId: number) => {
    navigate(`/workbooks/${workbookId}`);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setFilter({ search: query, page: 1 });
  };

  const handleTagClick = (tag: string) => {
    const newQuery = searchQuery ? `${searchQuery} ${tag}` : tag;
    setSearchQuery(newQuery);
    setFilter({ search: newQuery, page: 1 });
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    setSearchQuery(trimmed);
    setFilter({ search: trimmed, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilter({ page });
  };

  const handleSortChange = (sortValue: string) => {
    if (sortValue === 'newest') {
      setFilter({ sortBy: 'created_at', sortOrder: 'desc', page: 1 });
    } else if (sortValue === 'oldest') {
      setFilter({ sortBy: 'created_at', sortOrder: 'asc', page: 1 });
    }
  };

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
                      checked={selectedTags.length === 0}
                      onChange={() => setFilter({ tags: [], page: 1 })}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">전체 보기</span>
                  </div>
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 py-1 px-2.5 rounded-full">{totalCount}</span>
                </label>

                {(tagStats || []).slice(0, showAllCategories ? undefined : 8).map((category) => (
                  <label key={category.name} className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(category.name)}
                        onChange={() => handleCategoryToggle(category.name)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">{category.name}</span>
                    </div>
                    <span className="text-xs font-medium bg-gray-100 text-gray-600 py-1 px-2.5 rounded-full">{category.count}</span>
                  </label>
                ))}

                {(tagStats || []).length > 8 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    className="w-full text-left text-sm font-medium text-blue-600 hover:text-blue-700 mt-2"
                  >
                    {showAllCategories ? '간략히 보기' : '+ 더보기'}
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500">
                총 <span className="font-bold text-gray-900">{totalCount}</span>개의 문제집
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500">정렬:</span>
                <select
                  value={filter.sortBy === 'created_at' && filter.sortOrder === 'desc' ? 'newest' : 'oldest'}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-transparent text-sm font-bold text-gray-900 border-none focus:ring-0 cursor-pointer p-0 pr-6"
                >
                  <option value="newest">최신순</option>
                  <option value="oldest">오래된순</option>
                </select>
              </div>
            </div>

            <WorkbookList
              workbooks={workbooks}
              isLoading={isLoading}
              error={error}
              searchQuery={searchQuery}
              onWorkbookClick={handleWorkbookClick}
              onTagClick={handleTagClick}
              onPageChange={handlePageChange}
              currentPage={currentPage}
              totalPages={totalPages}
            />
          </div>

        </div>
      </div>
    </div>
  );
};
