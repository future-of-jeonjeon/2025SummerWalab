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
}

export const WorkbookList: React.FC<WorkbookListProps> = ({
  workbooks,
  isLoading,
  error,
  searchQuery,
  onWorkbookClick,
  onTagClick,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={`workbook-skeleton-${idx}`}
              className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4"
            >
              <div className="h-5 w-2/3 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="h-4 w-full rounded bg-gray-200 dark:bg-slate-700" />
              <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-14 rounded bg-gray-200 dark:bg-slate-700" />
                <div className="h-6 w-16 rounded bg-gray-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg mb-4">
          문제집을 불러오는 중 오류가 발생했습니다.
        </div>
        <p className="text-gray-600 dark:text-slate-400">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 문제집 목록 */}
      {workbooks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-600 dark:text-slate-400 text-lg mb-4">
            {searchQuery ? '검색 결과가 없습니다.' : '등록된 문제집이 없습니다.'}
          </div>
          {searchQuery && (
            <p className="text-gray-500 dark:text-slate-400">다른 검색어를 시도해보세요.</p>
          )}
        </div>
      ) : (
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
      )}
    </div>
  );
};
