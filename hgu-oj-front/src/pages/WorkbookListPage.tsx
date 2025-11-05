import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkbookList } from '../components/organisms/WorkbookList';
import { useWorkbooks } from '../hooks/useWorkbooks';
import { useWorkbookStore } from '../stores/workbookStore';

export const WorkbookListPage: React.FC = () => {
  const navigate = useNavigate();
  const { filter, setFilter } = useWorkbookStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: workbooks, isLoading, error } = useWorkbooks(filter);

  const handleWorkbookClick = (workbookId: number) => {
    navigate(`/workbooks/${workbookId}`);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setFilter({ search: query, page: 1 });
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

  // 클라이언트 사이드 검색 필터링 및 정렬
  const filteredWorkbooks = workbooks?.filter((workbook) =>
    (workbook.title ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (workbook.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (filter.sortBy === 'created_at') {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return filter.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    } else if (filter.sortBy === 'title') {
      return filter.sortOrder === 'desc' 
        ? b.title.localeCompare(a.title)
        : a.title.localeCompare(b.title);
    }
    return 0;
  }) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 lg:ml-2">
              <span className="text-sm text-gray-500">전체 문제집 수</span>
              <span className="text-2xl font-bold text-blue-600">{filteredWorkbooks.length}</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <form onSubmit={handleSearchSubmit} className="flex w-full sm:w-auto sm:min-w-[320px]">
                <label htmlFor="workbook-search" className="sr-only">문제집 검색</label>
                <input
                  id="workbook-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="문제집 검색..."
                  className="w-full rounded-l-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="min-w-[72px] rounded-r-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white text-center shadow-sm transition hover:bg-blue-700"
                >
                  검색
                </button>
              </form>
              <select
                value={filter.sortBy === 'created_at' && filter.sortOrder === 'desc' ? 'newest' : 'oldest'}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-40"
              >
                <option value="newest">최신순</option>
                <option value="oldest">오래된순</option>
              </select>
            </div>
          </div>
        </div>

        <WorkbookList
          workbooks={filteredWorkbooks}
          isLoading={isLoading}
          error={error}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onWorkbookClick={handleWorkbookClick}
          onPageChange={handlePageChange}
          currentPage={1}
          totalPages={1}
        />
      </div>
    </div>
  );
};
