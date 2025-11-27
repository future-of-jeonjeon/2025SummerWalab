import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useContestAnnouncements } from '../../../hooks/useContests';
import { contestService } from '../../../services/contestService';
import type { ContestAnnouncement } from '../../../types';
import type { AnnouncementFormState } from '../types';

interface UseContestAnnouncementsManagerOptions {
  contestId: number;
  canFetch: boolean;
}

export const useContestAnnouncementsManager = ({ contestId, canFetch }: UseContestAnnouncementsManagerOptions) => {
  const {
    data: announcements = [],
    isLoading,
    error,
    refetch,
  } = useContestAnnouncements(contestId, canFetch);

  const [formState, setFormState] = useState<AnnouncementFormState>({
    id: null,
    title: '',
    content: '',
    visible: true,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setFormState({ id: null, title: '', content: '', visible: true });
    setFormError(null);
  }, []);

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; content: string; visible: boolean }) => {
      if (!contestId) {
        return Promise.reject(new Error('유효하지 않은 대회입니다.'));
      }
      return contestService.createContestAnnouncement({ contestId, ...payload });
    },
    onSuccess: () => {
      resetForm();
      refetch();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : '공지 저장에 실패했습니다.';
      setFormError(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; title: string; content: string; visible: boolean }) =>
      contestService.updateContestAnnouncement(payload),
    onSuccess: () => {
      resetForm();
      refetch();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : '공지 수정에 실패했습니다.';
      setFormError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (announcementId: number) => contestService.deleteContestAnnouncement(announcementId),
    onSuccess: () => {
      refetch();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : '공지 삭제에 실패했습니다.';
      setFormError(message);
    },
  });

  const updateFormField = useCallback(<K extends keyof AnnouncementFormState>(field: K, value: AnnouncementFormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleEdit = useCallback((announcement: ContestAnnouncement) => {
    setFormState({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      visible: Boolean(announcement.visible),
    });
    setFormError(null);
  }, []);

  const handleDelete = useCallback(
    (announcementId: number) => {
      if (!window.confirm('이 공지를 삭제하시겠습니까?')) {
        return;
      }
      deleteMutation.mutate(announcementId);
    },
    [deleteMutation],
  );

  const handleFormSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const title = formState.title.trim();
      const content = formState.content.trim();
      if (!title || !content) {
        setFormError('제목과 내용을 모두 입력해주세요.');
        return;
      }
      const visible = formState.visible;
      if (formState.id) {
        updateMutation.mutate({ id: formState.id, title, content, visible });
      } else {
        createMutation.mutate({ title, content, visible });
      }
    },
    [formState, createMutation, updateMutation],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const deletingAnnouncementId = deleteMutation.variables as number | undefined;

  return {
    announcements,
    isLoading,
    error,
    formState,
    formError,
    updateFormField,
    handleFormSubmit,
    handleEdit,
    handleDelete,
    resetForm,
    isSaving,
    deletingAnnouncementId,
    refetchAnnouncements: refetch,
  };
};
