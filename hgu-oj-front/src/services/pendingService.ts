import { apiClient, MS_API_BASE } from './api';
import { PendingPaginationResponse, PendingResponse, PendingStatus, PendingTargetType } from '../components/admin/apply/types';

interface GetPendingParams {
  targetType: PendingTargetType;
  page?: number;
  size?: number;
}

const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');
const PENDING_API_BASE = `${trimTrailingSlash(MS_API_BASE)}/pending`;

const toNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const adaptPending = (raw: any): PendingResponse => {
  const targetData = raw?.target_data ?? null;
  const titleFromTarget =
    typeof targetData?.title === 'string'
      ? targetData.title
      : (typeof targetData?.name === 'string' ? targetData.name : '');

  return {
    id: typeof raw?.id === 'number' ? raw.id : undefined,
    pending_id:
      typeof raw?.pending_id === 'number'
        ? raw.pending_id
        : (typeof raw?.id === 'number' ? raw.id : undefined),
    status: raw?.status as PendingStatus,
    target_type: raw?.target_type as PendingTargetType,
    target_id: toNumber(raw?.target_id, 0),
    title: typeof raw?.title === 'string' && raw.title.length > 0 ? raw.title : titleFromTarget,
    due_at: typeof raw?.due_at === 'string' ? raw.due_at : null,
    created_user_data: {
      username: raw?.created_user_data?.username ?? null,
      avatar: raw?.created_user_data?.avatar ?? null,
      student_id: raw?.created_user_data?.student_id ?? null,
      major_id: typeof raw?.created_user_data?.major_id === 'number' ? raw.created_user_data.major_id : null,
      name: raw?.created_user_data?.name ?? null,
      dark_mode_enabled: Boolean(raw?.created_user_data?.dark_mode_enabled),
      language_preferences: Array.isArray(raw?.created_user_data?.language_preferences)
        ? raw.created_user_data.language_preferences
        : [],
    },
    target_data: targetData,
    completed_at: typeof raw?.completed_at === 'string' ? raw.completed_at : null,
    completed_user_id: typeof raw?.completed_user_id === 'number' ? raw.completed_user_id : null,
  };
};

const adaptPendingPagination = (raw: any, fallback: { page: number; size: number }): PendingPaginationResponse => {
  const sourceItems = Array.isArray(raw?.items)
    ? raw.items
    : (Array.isArray(raw?.pending) ? raw.pending : []);

  return {
    items: sourceItems.map(adaptPending),
    total: toNumber(raw?.total, sourceItems.length),
    page: toNumber(raw?.page, fallback.page),
    size: toNumber(raw?.size, fallback.size),
  };
};

export const pendingService = {
  getPending: async ({ targetType, page = 1, size = 20 }: GetPendingParams): Promise<PendingPaginationResponse> => {
    const response = await apiClient.post(PENDING_API_BASE, null, {
      params: {
        target_type: targetType,
        page,
        size,
      },
    });

    return adaptPendingPagination(response.data, { page, size });
  },

  processPending: async (pendingId: number, status: PendingStatus): Promise<void> => {
    await apiClient.post(`${PENDING_API_BASE}/${pendingId}`, null, {
      params: { status },
    });
  },
};
