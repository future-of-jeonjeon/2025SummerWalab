import React from 'react';
import { Card } from '../../../components/atoms/Card';
import { Button } from '../../../components/atoms/Button';
import { formatDateTime } from '../../../utils/date';
import type { ContestUserRegistrationList } from '../../../types';
import type { FeedbackMessage } from '../types';

interface ContestUserManagementTabProps {
  isAdminUser: boolean;
  registrations?: ContestUserRegistrationList;
  loading: boolean;
  errorMessage: string | null;
  feedback: FeedbackMessage | null;
  onDecision: (userId: number, action: 'approve' | 'reject') => void;
  decisionState: {
    isPending: boolean;
    targetUserId?: number;
    targetAction?: 'approve' | 'reject';
  };
}

export const ContestUserManagementTab: React.FC<ContestUserManagementTabProps> = ({
  isAdminUser,
  registrations,
  loading,
  errorMessage,
  feedback,
  onDecision,
  decisionState,
}) => {
  if (!isAdminUser) {
    return <div className="text-sm text-gray-600">관리자만 접근할 수 있습니다.</div>;
  }
  if (loading || !registrations) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }
  if (errorMessage) {
    return <div className="text-sm text-red-600">{errorMessage}</div>;
  }

  const approvedUsers = registrations.approved ?? [];
  const pendingUsers = registrations.pending ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="rounded-3xl border-0 bg-white/90 shadow-lg dark:bg-slate-900/80" padding="lg" shadow="lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">참가자 목록</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">{approvedUsers.length}명</span>
        </div>
        {approvedUsers.length === 0 ? (
          <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">아직 승인된 참가자가 없습니다.</div>
        ) : (
          <div className="mt-4 space-y-2">
            {approvedUsers.map((entry) => (
              <div key={entry.userId} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.username ?? `User ${entry.userId}`}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">신청일: {formatDateTime(entry.appliedAt)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="rounded-3xl border-0 bg-white/90 shadow-lg dark:bg-slate-900/80" padding="lg" shadow="lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">승인 대기 신청</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">{pendingUsers.length}건</span>
        </div>
        {pendingUsers.length === 0 ? (
          <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">대기 중인 신청이 없습니다.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {pendingUsers.map((entry) => {
              const decisionLoading = decisionState.isPending && decisionState.targetUserId === entry.userId;
              return (
                <div
                  key={entry.userId}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.username ?? `User ${entry.userId}`}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">신청일: {formatDateTime(entry.appliedAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onDecision(entry.userId, 'approve')}
                      loading={decisionLoading && decisionState.targetAction === 'approve'}
                    >
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDecision(entry.userId, 'reject')}
                      loading={decisionLoading && decisionState.targetAction === 'reject'}
                    >
                      거절
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {feedback && (
          <div className={`mt-4 text-sm ${feedback.type === 'error' ? 'text-red-600 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-200'}`}>
            {feedback.message}
          </div>
        )}
      </Card>
    </div>
  );
};
