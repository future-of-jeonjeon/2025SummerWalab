import React from 'react';
import { Button } from '../atoms/Button';

interface RankingPaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  className?: string;
}

export const RankingPagination: React.FC<RankingPaginationProps> = ({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPrevious,
  onNext,
  className = '',
}) => {
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const hasCounts = typeof totalItems === 'number' && typeof pageSize === 'number' && pageSize > 0;
  const startItem = hasCounts
    ? totalItems === 0
      ? 0
      : Math.min(totalItems, (page - 1) * pageSize + 1)
    : undefined;
  const endItem = hasCounts
    ? Math.min(totalItems ?? 0, page * pageSize)
    : undefined;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 ${className}`}>
      <div className="text-sm text-gray-500 dark:text-slate-400">
        {hasCounts
          ? totalItems === 0
            ? '총 0명'
            : `총 ${totalItems.toLocaleString()}명 중 ${startItem?.toLocaleString()}-${endItem?.toLocaleString()}위`
          : `${page}/${totalPages} 페이지`}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev}
          onClick={onPrevious}
        >
          이전
        </Button>
        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={onNext}
        >
          다음
        </Button>
      </div>
    </div>
  );
};

export default RankingPagination;
