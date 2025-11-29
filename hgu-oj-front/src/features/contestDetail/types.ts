import type { ContestAnnouncement } from '../../types';

export type ContestTab = 'overview' | 'announcements' | 'problems' | 'rank' | 'user-management' | 'submission-details';

export type ContestLockReason = 'before' | 'after' | 'not-joined' | 'verifying' | 'pending' | null;

export type FeedbackMessage = { type: 'success' | 'error'; message: string };

export type AnnouncementFormState = {
  id: number | null;
  title: string;
  content: string;
  visible: boolean;
};

export type AnnouncementManager = {
  announcements: ContestAnnouncement[];
  isLoading: boolean;
  error: unknown;
  formState: AnnouncementFormState;
  formError: string | null;
  isSaving: boolean;
  deletingAnnouncementId?: number;
  handleFormSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  handleEdit: (announcement: ContestAnnouncement) => void;
  handleDelete: (announcementId: number) => void;
  updateFormField: <K extends keyof AnnouncementFormState>(field: K, value: AnnouncementFormState[K]) => void;
  resetForm: () => void;
};
