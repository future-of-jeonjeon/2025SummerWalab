import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { contestUserService } from '../../../services/contestUserService';
import type { ContestUserRegistration, ContestUserRegistrationList } from '../../../types';
import type { FeedbackMessage } from '../types';

interface UseContestUserManagementOptions {
  contestId: number;
  shouldLoad: boolean;
  authUserId?: number;
  onMembershipRefresh?: () => void;
}

export const useContestUserManagement = ({
  contestId,
  shouldLoad,
  authUserId,
  onMembershipRefresh,
}: UseContestUserManagementOptions) => {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<ContestUserRegistrationList>({
    queryKey: ['contest-users', contestId],
    queryFn: () => contestUserService.getRegistrations(contestId),
    enabled: shouldLoad && contestId > 0,
  });

  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  const decisionMutation = useMutation<
    ContestUserRegistration,
    Error,
    { userId: number; action: 'approve' | 'reject' }
  >({
    mutationFn: ({ userId, action }) => contestUserService.decideRegistration(contestId, userId, action),
    onSuccess: (_, variables) => {
      setFeedback({
        type: 'success',
        message: variables.action === 'approve' ? '승인되었습니다.' : '거절되었습니다.',
      });
      refetch();
      if (variables.userId === authUserId) {
        onMembershipRefresh?.();
      }
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : '처리에 실패했습니다.';
      setFeedback({ type: 'error', message });
    },
  });

  const handleDecision = useCallback(
    (userId: number, action: 'approve' | 'reject') => {
      if (!contestId) return;
      setFeedback(null);
      decisionMutation.mutate({ userId, action });
    },
    [contestId, decisionMutation],
  );

  const decisionState = {
    isPending: decisionMutation.isPending,
    targetUserId: decisionMutation.variables?.userId,
    targetAction: decisionMutation.variables?.action,
  };

  return {
    registrations: data,
    isLoading,
    errorMessage: error instanceof Error ? error.message : null,
    refetch,
    feedback,
    setFeedback,
    handleDecision,
    decisionState,
  };
};
