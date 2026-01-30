import React from 'react';
export type ColumnAlignment = 'left' | 'center' | 'right';

export interface RankingTableColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: ColumnAlignment;
  render?: (item: T, index: number) => React.ReactNode;
  accessor?: (item: T) => React.ReactNode;
}

interface RankingTableProps<T> {
  columns: RankingTableColumn<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  skeletonRowCount?: number;
  className?: string;
}

const alignmentClass: Record<ColumnAlignment, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const renderCell = <T,>(column: RankingTableColumn<T>, item: T, index: number) => {
  if (column.render) {
    return column.render(item, index);
  }
  if (column.accessor) {
    return column.accessor(item);
  }
  // @ts-expect-error allow direct property access for generic rows
  const value = item[column.key];
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400">-</span>;
  }
  return value;
};

const SkeletonRow: React.FC<{ columns: RankingTableColumn<any>[] }> = ({ columns }) => (
  <tr className="animate-pulse">
    {columns.map((column) => (
      <td
        key={column.key}
        className={`px-6 py-4 ${alignmentClass[column.align ?? 'left']}`}
      >
        <div className="h-3 rounded bg-gray-200 dark:bg-slate-700" />
      </td>
    ))}
  </tr>
);

export const RankingTable = <T,>({
  columns,
  data,
  loading = false,
  error,
  emptyMessage = '표시할 랭킹 정보가 없습니다.',
  skeletonRowCount = 5,
  className = '',
}: RankingTableProps<T>) => {
  return (
    <div className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
          <thead className="bg-gray-50/50 dark:bg-slate-900/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 ${alignmentClass[column.align ?? 'left']}`}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {loading && (
              Array.from({ length: skeletonRowCount }).map((_, index) => (
                <SkeletonRow key={`skeleton-${index}`} columns={columns} />
              ))
            )}

            {!loading && error && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-sm text-red-500"
                >
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-sm text-gray-500 dark:text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}

            {!loading && !error && data.length > 0 && data.map((item, index) => (
              <tr
                key={`row-${index}`}
                className="group transition-colors hover:bg-gray-50/80 dark:hover:bg-slate-800/50"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 text-sm text-gray-700 dark:text-slate-300 ${alignmentClass[column.align ?? 'left']}`}
                  >
                    {renderCell(column, item, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RankingTable;
