import React from 'react';
import { WorkbookCard } from '../molecules/WorkbookCard';
import { Button } from '../atoms/Button';
import { Workbook } from '../../types';

interface WorkbookListProps {
  workbooks: Workbook[];
  isLoading: boolean;
  error: Error | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onWorkbookClick: (workbookId: number) => void;
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
}

export const WorkbookList: React.FC<WorkbookListProps> = ({
  workbooks,
  isLoading,
  error,
  searchQuery,
  onSearchChange,
  onWorkbookClick,
  onPageChange,
  currentPage,
  totalPages,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600 text-lg">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg mb-4">
          문제집을 불러오는 중 오류가 발생했습니다.
        </div>
        <p className="text-gray-600">{error.message}</p>
      </div>
    );
  }

  if (workbooks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 text-lg mb-4">
          {searchQuery ? '검색 결과가 없습니다.' : '등록된 문제집이 없습니다.'}
        </div>
        {searchQuery && (
          <p className="text-gray-500">다른 검색어를 시도해보세요.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 문제집 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {workbooks.map((workbook) => (
          <WorkbookCard
            key={workbook.id}
            workbook={workbook}
            onClick={onWorkbookClick}
          />
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <Button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            이전
          </Button>
          
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`px-3 py-2 ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {page}
                </Button>
              );
            })}
          </div>
          
          <Button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
};
