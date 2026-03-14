import React from 'react';
import { Button } from '../../../components/atoms/Button';
import { VisibilityBadge } from '../../../components/common/VisibilityBadge';
import { Problem } from '../../../types';
import { ActionIconButtons } from './ActionIconButtons';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';

interface ProblemListTableProps {
  title?: string;
  actionLabel?: string;
  showHeader?: boolean;
  problems: Problem[];
  onCreate?: () => void;
  onEdit: (problem: Problem) => void;
  onDelete: (problemId: number) => void;
}

export const ProblemListTable: React.FC<ProblemListTableProps> = ({
  title,
  actionLabel,
  showHeader = true,
  problems,
  onCreate,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
      {showHeader && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">{title}</h3>
          {onCreate && actionLabel && (
            <Button onClick={onCreate}>
              <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제목</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">승인 상태</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">공개 상태</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
            {problems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-slate-400">
                  문제가 없습니다.
                </td>
              </tr>
            ) : (
              problems.map((problem) => (
                <tr key={problem.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">{problem.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                    <ApprovalStatusBadge status={problem.approvalStatus} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400 text-right">
                    <VisibilityBadge visible={Boolean((problem as any).visible ?? (problem as any).is_public ?? (problem as any).isPublic)} />
                  </td>
                  <td className="px-6 py-4">
                    <ActionIconButtons
                      onEdit={() => onEdit(problem)}
                      onDelete={() => onDelete(problem.id)}
                      editTitle="수정"
                      deleteTitle="삭제"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
