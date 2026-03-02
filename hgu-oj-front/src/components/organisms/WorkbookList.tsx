import React from 'react';
import { WorkbookCard } from '../molecules/WorkbookCard';
import { Workbook } from '../../types';

interface WorkbookListProps {
  workbooks: Workbook[];
  isLoading: boolean;
  error: Error | null;
  searchQuery: string;
  onWorkbookClick: (workbookId: number) => void;
  onTagClick?: (tag: string) => void;
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
}

export const WorkbookList: React.FC<WorkbookListProps> = ({
  workbooks,
  isLoading,
  error,
  searchQuery,
  onWorkbookClick,
  onTagClick,
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {workbooks.map((workbook) => (
          <WorkbookCard
            key={workbook.id}
            workbook={workbook}
            onClick={onWorkbookClick}
            onTagClick={onTagClick}
          />
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-1 mt-10">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            aria-label="Previous page"
          >
            이전
          </button>

          <div className="flex space-x-1">
            {(() => {
              // Simple sliding window logic
              const maxVisible = 5;
              let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
              let endPage = startPage + maxVisible - 1;

              if (endPage > totalPages) {
                endPage = totalPages;
                startPage = Math.max(1, endPage - maxVisible + 1);
              }

              const pages = [];
              for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
              }

              return pages.map((page) => (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`min-w-[40px] h-10 flex items-center justify-center text-sm font-medium rounded-md border transition-colors ${currentPage === page
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {page}
                </button>
              ));
            })()}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            aria-label="Next page"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};
