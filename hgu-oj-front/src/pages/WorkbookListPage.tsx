import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkbookList } from '../components/organisms/WorkbookList';
import { SearchBar } from '../components/molecules/SearchBar';
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
  const filteredWorkbooks = workbooks?.filter(workbook => 
    workbook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workbook.description.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4 ml-2">
              <div className="text-sm text-gray-500">전체 문제집 수</div>
              <div className="text-2xl font-bold text-blue-600">{filteredWorkbooks.length}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="max-w-md">
                <SearchBar
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="문제집 검색..."
                />
              </div>
              <div>
                <select
                  value={filter.sortBy === 'created_at' && filter.sortOrder === 'desc' ? 'newest' : 'oldest'}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="newest">최신순</option>
                  <option value="oldest">오래된순</option>
                </select>
              </div>
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
