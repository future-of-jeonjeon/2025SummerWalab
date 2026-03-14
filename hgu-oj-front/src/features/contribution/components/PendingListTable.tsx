import React from 'react';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';
import { PendingItem } from '../../../types';

interface Props {
  items: PendingItem[];
  loading?: boolean;
  title?: string;
}

const statusToApproval = (status?: string) => {
  const normalized = (status ?? '').toLowerCase();
  if (['in_progress', 'processing', 'pending'].includes(normalized)) return 'pending';
  if (['done', 'approved', 'accept', 'accepted'].includes(normalized)) return 'approved';
  if (['expired', 'rejected', 'deny', 'denied'].includes(normalized)) return 'rejected';
  return undefined;
};

const targetLabel = (target?: string) => {
  switch (target) {
    case 'PROBLEM':
      return '문제';
    case 'WORKBOOK':
      return '문제집';
    case 'CONTEST_USER':
      return '대회 참가자';
    case 'Organization':
      return '단체';
    default:
      return target ?? '-';
  }
};

export const PendingListTable: React.FC<Props> = ({ items, loading, title }) => {
  const rows = items ?? [];
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">{title ?? '신청 목록'}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th className="w-28 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">유형</th>
              <th className="w-2/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제목/ID</th>
              <th className="w-28 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
              <th className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">신청자</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-sm text-gray-500 dark:text-slate-400">불러오는 중...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-slate-400">신청 내역이 없습니다.</td>
              </tr>
            ) : (
              rows.map((item) => {
                const approvalStatus = statusToApproval(item.status);
                const title = item.target_data?.title || item.target_data?.name || `#${item.target_id}`;
                const applicant = item.created_user_data?.name || item.created_user_data?.username || '-';
                return (
                  <tr key={`${item.target_type}-${item.pending_id}`} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">{targetLabel(item.target_type)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-slate-300">{title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                      <ApprovalStatusBadge status={approvalStatus} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{applicant}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
