import React from 'react';
import { ApprovalStatus } from '../../../types';

interface Props {
  status?: ApprovalStatus;
}

export const ApprovalStatusBadge: React.FC<Props> = ({ status }) => {
  if (!status) return <span className="text-xs text-gray-400">-</span>;

  const tone = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700/50',
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700/50',
    rejected: 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700/50',
  } as const;

  const label = {
    pending: '승인 대기',
    approved: '승인 완료',
    rejected: '거절됨',
  } as const;

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tone[status]}`}>
      {label[status]}
    </span>
  );
};
