import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkbookList } from '../components/organisms/WorkbookList';
import { useWorkbooks } from '../hooks/useWorkbooks';
import { useWorkbookStore } from '../stores/workbookStore';

export const WorkbookListPage: React.FC = () => {
  const navigate = useNavigate();
  const { filter, setFilter } = useWorkbookStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useWorkbooks(filter);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">문제집</h1>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{data?.total || 0}</div>
              <div className="text-sm text-gray-500">Total Workbooks</div>
            </div>
          </div>
        </div>

        <WorkbookList
          workbooks={data?.data || []}
          isLoading={isLoading}
          error={error}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onWorkbookClick={handleWorkbookClick}
          onPageChange={handlePageChange}
          currentPage={data?.page || 1}
          totalPages={data?.totalPages || 1}
        />
      </div>
    </div>
  );
};
