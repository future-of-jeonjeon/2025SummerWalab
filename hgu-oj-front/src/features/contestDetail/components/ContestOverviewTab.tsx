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
  stats?: {
    solvedProblems: number;
    totalProblems: number;
    myScore: number;
    myRank: number | null;
    totalParticipants: number;
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
  contest: _contest,
  timeData,
  joinState,
  accessState,
  announcementsNode,
  stats: _stats,
}) => {
  const {
    timeLeftDisplay,
    startTimeDisplay,
    endTimeDisplay,
  } = timeData;

  let parsedHours = '00';
  let parsedMinutes = '00';
  let parsedSeconds = '00';

  const cleanTimeStr = timeLeftDisplay ? timeLeftDisplay.replace(/[^0-9:]/g, '') : '';
  if (cleanTimeStr && cleanTimeStr.includes(':')) {
    const timeParts = cleanTimeStr.split(':');
    parsedHours = timeParts[0] || '00';
    parsedMinutes = timeParts[1] || '00';
    parsedSeconds = timeParts[2] || '00';
  }

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
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={_stats ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between min-h-[180px] relative rounded-lg h-full">
            <div className="text-left w-full md:w-auto mb-6 md:mb-0 flex-1 flex flex-col justify-center md:items-start items-center">
              <div className="flex items-center gap-2 min-w-[200px]">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 whitespace-nowrap">대회 종료까지</h2>
              </div>
              <div className="text-xs sm:text-sm text-slate-500 mt-2 space-y-1 text-center md:text-left">
                <p><span className="font-semibold text-slate-600">시작</span> {startTimeDisplay}</p>
                <p><span className="font-semibold text-slate-600">종료</span> {endTimeDisplay}</p>
              </div>
            </div>

            <div className="flex items-center justify-center w-full md:w-auto gap-4 sm:gap-6">
              <div className="flex flex-col items-center">
                <div className="rounded-2xl w-20 sm:w-24 h-24 sm:h-28 flex items-center justify-center bg-[#F8FAFC] border border-slate-100 mb-2 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <span className={`text-4xl sm:text-5xl font-extrabold tracking-tight text-[#4F6294] whitespace-nowrap`}>
                    {parsedHours}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em] mt-1">Hours</span>
              </div>

              <div className="text-slate-200 text-3xl font-light pb-8">:</div>

              <div className="flex flex-col items-center">
                <div className="rounded-2xl w-20 sm:w-24 h-24 sm:h-28 flex items-center justify-center bg-[#F8FAFC] border border-slate-100 mb-2 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <span className={`text-4xl sm:text-5xl font-extrabold tracking-tight text-[#4F6294] whitespace-nowrap`}>
                    {parsedMinutes}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em] mt-1">Min</span>
              </div>

              <div className="text-slate-200 text-3xl font-light pb-8">:</div>

              <div className="flex flex-col items-center">
                <div className="rounded-2xl w-20 sm:w-24 h-24 sm:h-28 flex items-center justify-center bg-[#F8FAFC] border border-slate-100 mb-2 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <span className={`text-4xl sm:text-5xl font-extrabold tracking-tight text-[#4F6294] whitespace-nowrap`}>
                    {parsedSeconds}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em] mt-1">Sec</span>
              </div>
            </div>
          </Card>
        </div>

        {_stats && (
          <div className="lg:col-span-1">
            <Card className="border border-slate-200 bg-white p-6 sm:p-10 shadow-sm rounded-lg flex flex-col justify-center min-h-[180px] relative overflow-hidden h-full">
              <div className="absolute right-0 top-1/2 -translate-y-[40%] translate-x-1/4 text-[#E6F8EF]">
                <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-6 relative z-10">
                <div className="w-6 h-6 rounded-full bg-[#E0F3EA] flex items-center justify-center text-[#2ECC71]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[#334155] font-bold text-sm">해결한 문제</span>
              </div>
              <div className="flex items-baseline gap-2 relative z-10">
                <span className="text-5xl font-black text-[#0F172A]">{_stats.solvedProblems}</span>
                <span className="text-[#94A3B8] font-medium text-xl">/ {_stats.totalProblems}</span>
              </div>
              <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 mt-8 relative z-10 w-[85%]">
                <div className="bg-[#2ECC71] h-1.5 rounded-full" style={{ width: `${Math.max(2, (_stats.solvedProblems / (_stats.totalProblems || 1)) * 100)}%` }}></div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 w-full">
        {announcementsNode && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">공지사항</h2>
            </div>
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-2 overflow-hidden">
              {announcementsNode}
            </div>
          </div>
        )}

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
                  <Button onClick={onJoinClick} loading={joinActionDisabled} className="whitespace-nowrap px-5 py-2 text-base">
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
    </div>
  );
};
