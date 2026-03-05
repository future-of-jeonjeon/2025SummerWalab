import React from 'react';
export interface CommonPaginationProps {
  page: number;
  pageSize: number;
  totalPages?: number;
  totalItems?: number;
  onChangePage: (nextPage: number) => void;
  onChangePageSize?: (nextSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  unit?: string;
  maxVisiblePages?: number;
}

export const CommonPagination: React.FC<CommonPaginationProps> = ({
  page,
  pageSize,
  totalPages,
  totalItems,
  onChangePage,
  onChangePageSize,
  pageSizeOptions,
  className = '',
  maxVisiblePages = 5,
}) => {
  const derivedTotalPages = typeof totalPages === 'number' && totalPages > 0
    ? Math.floor(totalPages)
    : typeof totalItems === 'number' && pageSize > 0
      ? Math.ceil(totalItems / pageSize)
      : 1;

  const safeTotalPages = Math.max(1, derivedTotalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const canGoPrev = safePage > 1;
  const canGoNext = safePage < safeTotalPages;

  let startPage = Math.max(1, safePage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(safeTotalPages, startPage + maxVisiblePages - 1);
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  const pages: number[] = [];
  for (let current = startPage; current <= endPage; current += 1) {
    pages.push(current);
  }

  return (
    <div className={`flex justify-center ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onChangePageSize && pageSizeOptions && pageSizeOptions.length > 0 && (
          <select
            value={pageSize}
            onChange={(event) => onChangePageSize(Number(event.target.value))}
            className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            aria-label="페이지 크기"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}개씩 보기
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => canGoPrev && onChangePage(safePage - 1)}
          disabled={!canGoPrev}
          className="px-3 py-2 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          aria-label="Previous page"
        >
          이전
        </button>

        <div className="hidden sm:flex items-center gap-1">
          {startPage > 1 && (
            <>
              <button
                type="button"
                onClick={() => onChangePage(1)}
                className="min-w-[40px] h-10 px-3 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                1
              </button>
              {startPage > 2 && <span className="px-1 text-sm text-gray-500 dark:text-slate-400">...</span>}
            </>
          )}

          {pages.map((pageNo) => (
            <button
              key={pageNo}
              type="button"
              onClick={() => onChangePage(pageNo)}
              className={`min-w-[40px] h-10 px-3 rounded-md border text-sm font-medium transition-colors ${
                safePage === pageNo
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
              aria-current={safePage === pageNo ? 'page' : undefined}
            >
              {pageNo}
            </button>
          ))}

          {endPage < safeTotalPages && (
            <>
              {endPage < safeTotalPages - 1 && <span className="px-1 text-sm text-gray-500 dark:text-slate-400">...</span>}
              <button
                type="button"
                onClick={() => onChangePage(safeTotalPages)}
                className="min-w-[40px] h-10 px-3 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                {safeTotalPages}
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => canGoNext && onChangePage(safePage + 1)}
          disabled={!canGoNext}
          className="px-3 py-2 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          aria-label="Next page"
        >
          다음
        </button>
      </div>
    </div>
  );
};

export default CommonPagination;
