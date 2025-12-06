import React from 'react';
import type { Contest } from '../../../types';
import type { FeedbackMessage } from '../types';
import { Card } from '../../../components/atoms/Card';
import { Button } from '../../../components/atoms/Button';

interface ContestOverviewTabProps {
  contest: Contest;
  timeData: {
    startTimeDisplay: string;
    endTimeDisplay: string;
    timeLeftDisplay: string;
    timeTextClass: string;
  };
  joinState: {
    shouldShowJoinCard: boolean;
    contestPhase: 'before' | 'running' | 'after';
    hasJoinedContest: boolean;
    isPendingApproval: boolean;
    isRejectedMembership: boolean;
    isAuthenticated: boolean;
    showLoginPrompt: boolean;
    showJoinButton: boolean;
    joinActionDisabled: boolean;
    joinFeedback: FeedbackMessage | null;
    membershipLoading: boolean;
    membershipErrorMessage: string | null;
    onJoinClick: () => void;
    onNavigateLogin: () => void;
  };
  accessState: {
    hasAccess: boolean;
    requiresPassword: boolean;
    accessLoading: boolean;
    password: string;
    passwordError: string | null;
    passwordPending: boolean;
    onPasswordChange: (value: string) => void;
    onPasswordSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  };
  announcementsNode?: React.ReactNode;
}

export const ContestOverviewTab: React.FC<ContestOverviewTabProps> = ({
  contest,
  timeData,
  joinState,
  accessState,
  announcementsNode,
}) => {
  const {
    startTimeDisplay,
    endTimeDisplay,
    timeLeftDisplay,
    timeTextClass,
  } = timeData;

  const {
    shouldShowJoinCard,
    contestPhase,
    hasJoinedContest,
    isPendingApproval,
    isRejectedMembership,
    isAuthenticated,
    showLoginPrompt,
    showJoinButton,
    joinActionDisabled,
    joinFeedback,
    membershipLoading,
    membershipErrorMessage,
    onJoinClick,
    onNavigateLogin,
  } = joinState;

  const { hasAccess, requiresPassword, accessLoading, password, passwordError, passwordPending, onPasswordChange, onPasswordSubmit } =
    accessState;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-6">
        <Card className="border-0 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-8">
            <div className="prose max-w-none text-lg font-semibold leading-relaxed text-slate-700 dark:prose-invert dark:text-slate-200">
              <div dangerouslySetInnerHTML={{ __html: contest.description }} />
            </div>

            {announcementsNode && (
              <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">대회 공지</h2>
                {announcementsNode}
              </div>
            )}
          </div>
        </Card>

        {shouldShowJoinCard && (
          <Card className="border border-emerald-200/70 bg-emerald-50/70 p-6 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-100">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-emerald-800 dark:text-emerald-100">대회 참여 신청</h2>
                <p className="text-sm text-emerald-700/80 dark:text-emerald-100/80">
                  {contestPhase === 'running'
                    ? '진행 중인 대회는 관리자 승인이 필요할 수 있습니다. 참여 신청 후 승인을 기다려 주세요.'
                    : '진행 전 대회는 신청만 하면 자동으로 참가할 수 있습니다.'}
                </p>
                {hasJoinedContest && !isPendingApproval && (
                  <span className="inline-flex items-center text-sm font-semibold text-emerald-700 dark:text-emerald-200">참여 신청이 완료되었습니다.</span>
                )}
                {isPendingApproval && (
                  <span className="inline-flex items-center text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                    참여 신청이 접수되었습니다. 관리자 승인을 기다려 주세요.
                  </span>
                )}
                {isRejectedMembership && (
                  <span className="inline-flex items-center text-sm font-semibold text-red-600 dark:text-red-300">
                    이전 신청이 거절되었습니다. 다시 신청하여 승인을 요청할 수 있습니다.
                  </span>
                )}
                {!hasJoinedContest && !isPendingApproval && isAuthenticated && (
                  <span className="text-sm text-emerald-700 dark:text-emerald-200">
                    지금 신청하면 {contestPhase === 'running' ? '승인 후 바로 입장할 수 있습니다.' : '대회 시작 시 자동으로 입장할 수 있습니다.'}
                  </span>
                )}
                {showLoginPrompt && <span className="text-sm text-emerald-700 dark:text-emerald-200">로그인 후 참여 신청을 진행해 주세요.</span>}
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                {showJoinButton ? (
                  <Button onClick={onJoinClick} loading={joinActionDisabled}>
                    대회 참여하기
                  </Button>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-4 py-1 text-sm font-semibold text-emerald-700 shadow-sm dark:border-emerald-400/60 dark:bg-emerald-950/70 dark:text-emerald-100">
                    {isPendingApproval ? '승인 대기 중' : hasJoinedContest ? '참여 신청 완료' : '참여 신청 필요'}
                  </span>
                )}
                {showLoginPrompt && (
                  <Button variant="outline" onClick={onNavigateLogin}>
                    로그인 하러 가기
                  </Button>
                )}
              </div>
            </div>
            {membershipLoading && isAuthenticated && (
              <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-200">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-emerald-600" />
                참여 여부를 확인하는 중입니다.
              </div>
            )}
            {membershipErrorMessage && <div className="mt-3 text-sm text-red-600 dark:text-red-300">{membershipErrorMessage}</div>}
            {joinFeedback && (
              <div className={`mt-3 text-sm ${joinFeedback.type === 'error' ? 'text-red-600 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-200'}`}>
                {joinFeedback.message}
              </div>
            )}
          </Card>
        )}

        {requiresPassword && !hasAccess && (
          <Card className="border border-blue-200/70 bg-blue-50/70 p-6 dark:border-blue-400/40 dark:bg-blue-900/20 dark:text-blue-100">
            <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-100 mb-3">비밀번호 인증 필요</h2>
            <p className="text-sm text-blue-700/80 dark:text-blue-200/90 mb-4">이 대회는 비밀번호가 필요합니다. 비밀번호를 입력해 주세요.</p>
            <form onSubmit={onPasswordSubmit} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                type="password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:border-blue-400/60 dark:bg-slate-900 dark:text-blue-100"
                placeholder="대회 비밀번호"
                disabled={passwordPending}
              />
              <Button
                type="submit"
                loading={passwordPending}
                disabled={passwordPending}
                className="whitespace-nowrap px-4"
              >
                입장하기
              </Button>
            </form>
            {(passwordError || accessLoading) && (
              <div className="mt-3 text-sm text-red-600 dark:text-red-300">
                {accessLoading ? '접근 권한을 확인하는 중입니다.' : passwordError}
              </div>
            )}
          </Card>
        )}
      </div>

      <div className="lg:w-80 space-y-6">
        <Card className="border-0 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900 sticky top-6">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">시작 시간</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{startTimeDisplay}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">종료 시간</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{endTimeDisplay}</p>
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">남은 시간</p>
              <p className={`mt-1 text-2xl font-black tracking-tight ${timeTextClass} whitespace-nowrap`}>{timeLeftDisplay}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
