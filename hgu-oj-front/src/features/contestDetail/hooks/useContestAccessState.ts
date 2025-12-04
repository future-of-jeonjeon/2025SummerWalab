import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Contest } from '../../../types';
import { useContestAccess, useContestMembership } from '../../../hooks/useContests';
import { contestUserService } from '../../../services/contestUserService';
import { contestService } from '../../../services/contestService';
import type { ContestLockReason, FeedbackMessage } from '../types';

interface UseContestAccessStateOptions {
  contestId: number;
  contest?: Contest;
  contestPhase: 'before' | 'running' | 'after';
  requiresPassword: boolean;
  requiresApproval?: boolean;
  isAuthenticated: boolean;
  hasContestAdminOverride: boolean;
  onProtectedAccessGranted?: () => void;
}

export const useContestAccessState = ({
  contestId,
  contest,
  contestPhase,
  requiresPassword,
  requiresApproval = false,
  isAuthenticated,
  hasContestAdminOverride,
  onProtectedAccessGranted,
}: UseContestAccessStateOptions) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [joinFeedback, setJoinFeedback] = useState<FeedbackMessage | null>(null);

  const {
    data: contestMembership,
    isLoading: membershipLoading,
    error: membershipError,
    refetch: refetchMembership,
  } = useContestMembership(contestId, isAuthenticated && contestId > 0);

  const membershipStatus = contestMembership?.status;
  const isPendingApproval = membershipStatus === 'pending';
  const isRejectedMembership = membershipStatus === 'rejected';
  const hasJoinedContest = contestMembership?.joined ?? false;
  const membershipErrorMessage = membershipError instanceof Error ? membershipError.message : null;

  const {
    data: accessData,
    isLoading: accessLoading,
    error: accessError,
  } = useContestAccess(contestId, Boolean(contest) && requiresPassword);

  useEffect(() => {
    if (contest && !requiresPassword) {
      setHasAccess(true);
    }
  }, [contest, requiresPassword]);

  useEffect(() => {
    if (hasContestAdminOverride) {
      setHasAccess(true);
      setPasswordError(null);
    }
  }, [hasContestAdminOverride]);

  useEffect(() => {
    if (accessData?.access) {
      setHasAccess(true);
    }
  }, [accessData]);

  useEffect(() => {
    if (accessError instanceof Error) {
      setPasswordError(accessError.message);
    }
  }, [accessError]);

  useEffect(() => {
    if (contestPhase === 'running' && isAuthenticated && contestId > 0) {
      refetchMembership();
    }
  }, [contestPhase, isAuthenticated, contestId, refetchMembership]);

  useEffect(() => {
    setJoinFeedback(null);
  }, [contestId]);

  const contestLockReason = useMemo<ContestLockReason>(() => {
    if (hasContestAdminOverride) {
      return null;
    }
    if (contestPhase === 'before') {
      return 'before';
    }
    if (contestPhase === 'after') {
      return 'after';
    }
    if (contestPhase === 'running') {
      if (!isAuthenticated) {
        return 'not-joined';
      }
      if (membershipLoading) {
        return 'verifying';
      }
      if (isPendingApproval) {
        return 'pending';
      }
      if (!hasJoinedContest) {
        return 'not-joined';
      }
    }
    return null;
  }, [contestPhase, hasContestAdminOverride, isAuthenticated, membershipLoading, hasJoinedContest, isPendingApproval]);

  const contestLockedForUser = contestLockReason !== null;

  const lockBannerText = useMemo(() => {
    switch (contestLockReason) {
      case 'before':
        return '대회 시작 전입니다.';
      case 'after':
        return '대회가 종료되었습니다.';
      case 'not-joined':
        return isAuthenticated
          ? membershipErrorMessage ?? '참여 신청을 완료한 사용자만 대회에 입장할 수 있습니다.'
          : '로그인 후 참여 신청을 완료해야 대회에 입장할 수 있습니다.';
      case 'pending':
        return '참여 승인 대기 중입니다.';
      case 'verifying':
        return '참여 여부를 확인하는 중입니다.';
      default:
        return '';
    }
  }, [contestLockReason, isAuthenticated, membershipErrorMessage]);

  const canViewProtectedContent = useMemo(
    () => (hasAccess || hasContestAdminOverride) && contestLockReason === null,
    [hasAccess, hasContestAdminOverride, contestLockReason],
  );

  const getContestLockMessage = useCallback(
    (context: 'announcements' | 'problems' | 'rank') => {
      if (!contestLockReason) {
        return '';
      }
      const resourceLabel: Record<typeof context, string> = {
        announcements: '공지',
        problems: '문제',
        rank: '랭크',
      };
      if (contestLockReason === 'verifying') {
        return '참여 가능 여부를 확인하는 중입니다.';
      }
      if (contestLockReason === 'before') {
        return `대회 시작 이후에 ${resourceLabel[context]}가 공개됩니다.`;
      }
      if (contestLockReason === 'after') {
        return `대회가 종료되어 ${resourceLabel[context]} 열람이 제한됩니다.`;
      }
      if (contestLockReason === 'not-joined') {
        if (isAuthenticated) {
          return membershipErrorMessage ?? '참여 신청을 완료한 사용자만 대회에 입장할 수 있습니다. 대회 시작 전 메인 탭에서 신청해 주세요.';
        }
        return '로그인 후 대회 참여 신청을 완료해야 대회에 입장할 수 있습니다.';
      }
      if (contestLockReason === 'pending') {
        return '참여 신청이 접수되었습니다. 관리자 승인을 기다려 주세요.';
      }
      return '';
    },
    [contestLockReason, isAuthenticated, membershipErrorMessage],
  );

  const joinContestMutation = useMutation({
    mutationFn: () => contestUserService.join(contestId),
    onSuccess: (result) => {
      const pending =
        (requiresApproval && contestPhase === 'running') ||
        result.status === 'pending' ||
        (result as { requiresApproval?: boolean }).requiresApproval;
      const needsPassword = requiresPassword === true;
      setJoinFeedback({
        type: 'success',
        message: pending
          ? '참여 신청이 접수되었습니다. 관리자 승인 후 입장할 수 있습니다.'
          : needsPassword
            ? '참여 신청이 완료되었습니다. 비밀번호를 입력해 입장하세요.'
            : '참여 신청이 완료되었습니다.',
      });
      if (!pending && !needsPassword) {
        setHasAccess(true);
      }
      refetchMembership();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : '참여 신청에 실패했습니다.';
      setJoinFeedback({ type: 'error', message });
    },
  });

  const handleJoinContest = useCallback(() => {
    if (!contestId) return;
    setJoinFeedback(null);
    joinContestMutation.mutate();
  }, [contestId, joinContestMutation]);

  const passwordMutation = useMutation({
    mutationFn: (formPassword: string) => contestService.verifyContestPassword(contestId, formPassword),
    onSuccess: () => {
      setPassword('');
      setPasswordError(null);
      setHasAccess(true);
      onProtectedAccessGranted?.();
    },
    onError: (mutError: unknown) => {
      if (mutError instanceof Error) {
        setPasswordError(mutError.message);
      } else {
        setPasswordError('비밀번호 인증에 실패했습니다.');
      }
    },
  });

  const handlePasswordSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!password.trim()) {
        setPasswordError('비밀번호를 입력해주세요.');
        return;
      }
      passwordMutation.mutate(password.trim());
    },
    [password, passwordMutation],
  );

  const shouldShowJoinCard = contestPhase !== 'after' && !hasContestAdminOverride && (!hasJoinedContest || isPendingApproval);
  const showJoinButton = shouldShowJoinCard && isAuthenticated && !hasJoinedContest && !isPendingApproval;
  const showLoginPrompt = shouldShowJoinCard && !isAuthenticated;
  const joinActionDisabled = joinContestMutation.isPending || membershipLoading || isPendingApproval;

  return {
    hasAccess,
    password,
    setPassword,
    passwordError,
    accessLoading,
    passwordMutationPending: passwordMutation.isPending,
    handlePasswordSubmit,
    contestLockReason,
    contestLockedForUser,
    lockBannerText,
    canViewProtectedContent,
    membershipLoading,
    membershipErrorMessage,
    hasJoinedContest,
    isPendingApproval,
    isRejectedMembership,
    refetchMembership,
    joinFeedback,
    setJoinFeedback,
    handleJoinContest,
    joinActionDisabled,
    shouldShowJoinCard,
    showJoinButton,
    showLoginPrompt,
    getContestLockMessage,
  };
};
