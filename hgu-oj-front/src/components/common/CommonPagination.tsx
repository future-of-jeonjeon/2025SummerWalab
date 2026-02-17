import React from 'react';
import { Button } from '../atoms/Button';

interface CommonPaginationProps {
    page: number;
    totalPages: number;
    totalItems?: number;
    pageSize?: number;
    onPrevious?: () => void;
    onNext?: () => void;
    className?: string;
    unit?: string; // e.g., "명", "개", etc.
}

export const CommonPagination: React.FC<CommonPaginationProps> = ({
    page,
    totalPages,
    totalItems,
    pageSize = 10,
    onPrevious,
    onNext,
    className = '',
    unit = '개',
}) => {
    const hasPrev = page > 1;
    const hasNext = page < totalPages;

    const hasCounts = typeof totalItems === 'number' && pageSize > 0;
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
                        ? `총 0${unit}`
                        : `총 ${totalItems?.toLocaleString()}${unit} 중 ${startItem?.toLocaleString()}-${endItem?.toLocaleString()}`
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

export default CommonPagination;
