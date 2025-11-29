import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { contestService } from '../../../services/contestService';
import { submissionService, SubmissionDetail, SubmissionListItem } from '../../../services/submissionService';
import { formatDateTime } from '../../../utils/date';

export type SubmissionGroup = { userId: number; username: string; submissions: SubmissionListItem[] };
type SubmissionWithUserMeta = SubmissionListItem & {
  user?: { id?: number; username?: string };
  username?: string;
  userId?: number;
  user_id?: number;
};

interface UseContestSubmissionDetailsOptions {
  contestId: number;
  shouldLoad: boolean;
}

export const useContestSubmissionDetails = ({ contestId, shouldLoad }: UseContestSubmissionDetailsOptions) => {
  const {
    data: contestSubmissions,
    isLoading,
    error,
  } = useQuery<{ data: SubmissionListItem[]; total: number }, Error>({
    queryKey: ['contest-submissions', contestId],
    queryFn: () => contestService.getContestSubmissions(contestId, { limit: 2000 }),
    enabled: shouldLoad && !!contestId,
  });

  const submissionGroups = useMemo<SubmissionGroup[]>(() => {
    if (!contestSubmissions?.data) {
      return [];
    }

    const map = new Map<number, SubmissionGroup>();
    contestSubmissions.data.forEach((rawItem) => {
      const item = rawItem as SubmissionWithUserMeta;
      const candidateIds = [item.user?.id, item.user_id, item.userId];
      const resolvedUserId = candidateIds.find((value): value is number => typeof value === 'number' && Number.isFinite(value)) ?? 0;
      const fallbackName = resolvedUserId ? `User ${resolvedUserId}` : '알 수 없는 사용자';
      const username =
        (typeof item.user?.username === 'string' && item.user.username) ||
        (typeof item.username === 'string' && item.username) ||
        fallbackName;

      if (!map.has(resolvedUserId)) {
        map.set(resolvedUserId, { userId: resolvedUserId, username, submissions: [] });
      }

      map.get(resolvedUserId)!.submissions.push(rawItem);
    });

    return Array.from(map.values()).sort((a, b) => a.userId - b.userId);
  }, [contestSubmissions]);

  const [isModalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedSubmissionDetail, setSelectedSubmissionDetail] = useState<SubmissionDetail | null>(null);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalLoading(false);
    setModalError(null);
    setSelectedSubmissionDetail(null);
  }, []);

  const handleSubmissionClick = useCallback(async (submissionId: number | string | undefined) => {
    if (submissionId == null) {
      return;
    }
    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    try {
      const detail = await submissionService.getSubmission(submissionId);
      setSelectedSubmissionDetail(detail);
    } catch (err) {
      const message = err instanceof Error ? err.message : '제출 내용을 불러오지 못했습니다.';
      setModalError(message);
    } finally {
      setModalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldLoad && isModalOpen) {
      closeModal();
    }
  }, [shouldLoad, isModalOpen, closeModal]);

  const selectedSubmissionCreatedAt = useMemo(() => {
    if (!selectedSubmissionDetail) {
      return '-';
    }
    const raw = selectedSubmissionDetail.create_time ?? selectedSubmissionDetail.createTime;
    return typeof raw === 'string' ? formatDateTime(raw) : '-';
  }, [selectedSubmissionDetail]);

  return {
    contestSubmissions,
    submissionGroups,
    submissionsLoading: isLoading,
    submissionsError: error,
    modalState: {
      isModalOpen,
      modalLoading,
      modalError,
      selectedSubmissionDetail,
      selectedSubmissionCreatedAt,
      closeModal,
      handleSubmissionClick,
    },
  };
};
