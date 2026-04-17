import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { contestUserService } from '../../../services/contestUserService';
import type { ContestManageUserSearchItem, ContestUserRegistration, ContestUserRegistrationList } from '../../../types';
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
  const [modalFeedback, setModalFeedback] = useState<FeedbackMessage | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [participantSearchQuery, setParticipantSearchQuery] = useState('');
  const [addCandidates, setAddCandidates] = useState<ContestManageUserSearchItem[]>([]);

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

  const searchCandidatesMutation = useMutation<
    ContestManageUserSearchItem[],
    Error,
    string
  >({
    mutationFn: (query: string) => contestUserService.searchManageUsers(contestId, query),
    onSuccess: (candidates) => {
      setAddCandidates(candidates);
      if (candidates.length === 0) {
        setModalFeedback({ type: 'error', message: '일치하는 유저를 찾지 못했습니다.' });
      } else {
        setModalFeedback(null);
      }
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : '유저 검색에 실패했습니다.';
      setModalFeedback({ type: 'error', message });
      setAddCandidates([]);
    },
  });

  const addParticipantMutation = useMutation<void, Error, number>({
    mutationFn: async (userId: number) => {
      await contestUserService.joinByUserId(contestId, userId);
    },
    onSuccess: () => {
      setModalFeedback(null);
      setIsAddModalOpen(false);
      setAddQuery('');
      setAddCandidates([]);
      refetch();
      onMembershipRefresh?.();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : '참가자 추가에 실패했습니다.';
      setModalFeedback({ type: 'error', message });
    },
  });

  const handleOpenAddModal = useCallback(() => {
    setModalFeedback(null);
    setIsAddModalOpen(true);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    if (searchCandidatesMutation.isPending || addParticipantMutation.isPending) return;
    setIsAddModalOpen(false);
    setAddQuery('');
    setAddCandidates([]);
    setModalFeedback(null);
  }, [searchCandidatesMutation.isPending, addParticipantMutation.isPending]);

  const handleSearchCandidates = useCallback(() => {
    if (!contestId) return;
    const keyword = addQuery.trim();
    if (!keyword) {
      setModalFeedback({ type: 'error', message: '학번, 이름 또는 유저명을 입력해주세요.' });
      return;
    }
    setModalFeedback(null);
    searchCandidatesMutation.mutate(keyword);
  }, [contestId, addQuery, searchCandidatesMutation]);

  const handleAddParticipant = useCallback((userId: number) => {
    if (!contestId || !userId) return;
    setModalFeedback(null);
    addParticipantMutation.mutate(userId);
  }, [contestId, addParticipantMutation]);

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
    isAddModalOpen,
    handleOpenAddModal,
    handleCloseAddModal,
    modalFeedback,
    addQuery,
    setAddQuery,
    participantSearchQuery,
    setParticipantSearchQuery,
    addCandidates,
    handleSearchCandidates,
    handleAddParticipant,
    addSearchPending: searchCandidatesMutation.isPending,
    addParticipantPending: addParticipantMutation.isPending,
  };
};
