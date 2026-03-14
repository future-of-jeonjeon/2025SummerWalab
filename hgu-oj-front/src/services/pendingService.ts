import { apiClient, MS_API_BASE } from './api';
import { ApprovalStatus, PendingItem, PendingTargetType } from '../types';

type PendingStatus = 'IN_PROGRESS' | 'DONE' | 'EXPIRED';

export interface PendingContributionItem {
  id: number;
  status: ApprovalStatus;
  type?: 'problem' | 'workbook';
  title?: string;
  reason?: string | null;
  updated_at?: string;
}

const normalizePendingList = (data: any): PendingContributionItem[] => {
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.data)
        ? data.data
        : [];

  return items
    .map((item: any) => {
      const id = item.id ?? item.problem_id ?? item.workbook_id ?? item.target_id;
      const statusRaw = (item.status ?? item.state ?? '').toString().toLowerCase();
      const status: ApprovalStatus | undefined =
        ['pending', 'in_progress', 'in-progress', 'processing'].includes(statusRaw) ? 'pending'
          : ['done', 'approved', 'accept', 'accepted'].includes(statusRaw) ? 'approved'
          : ['expired', 'rejected', 'deny', 'denied'].includes(statusRaw) ? 'rejected'
          : undefined;
      if (!id || !status) return null;
      return {
        id: Number(id),
        status,
        type: item.type,
        title: item.title ?? item.name,
        reason: item.reason ?? item.reject_reason ?? null,
        updated_at: item.updated_at ?? item.update_time ?? item.updatedAt,
      } as PendingContributionItem;
    })
    .filter(Boolean) as PendingContributionItem[];
};

const listToMap = (list: PendingContributionItem[]) => {
  const map: Record<number, PendingContributionItem> = {};
  list.forEach((item) => {
    map[item.id] = item;
  });
  return map;
};

export const pendingService = {
  async getProblemStatuses(): Promise<Record<number, PendingContributionItem>> {
    const res = await apiClient.get(`${MS_API_BASE}/pending`, {
      params: { target_type: 'PROBLEM', size: 200 },
    });
    return listToMap(normalizePendingList(res.data));
  },
  async getWorkbookStatuses(): Promise<Record<number, PendingContributionItem>> {
    const res = await apiClient.get(`${MS_API_BASE}/pending`, {
      params: { target_type: 'WORKBOOK', size: 200 },
    });
    return listToMap(normalizePendingList(res.data));
  },
  async getMyPendings(target_type: PendingTargetType, size: number = 200, page: number = 1): Promise<PendingItem[]> {
    const res = await apiClient.get(`${MS_API_BASE}/pending/me`, {
      params: { target_type, size, page },
    });
    const list = Array.isArray(res.data?.items) ? res.data.items : Array.isArray(res.data) ? res.data : [];
    return list as PendingItem[];
  },

  // Admin용 기존 인터페이스 호환 (관리자 페이지에서 사용)
  async getPending(params: { targetType: PendingTargetType; page?: number; size?: number }) {
    const res = await apiClient.get(`${MS_API_BASE}/pending`, {
      params: {
        target_type: params.targetType,
        page: params.page ?? 1,
        size: params.size ?? 20,
      },
    });
    return res.data;
  },

  async processPending(pending_id: number, status: PendingStatus | 'DONE' | 'EXPIRED') {
    return apiClient.post(`${MS_API_BASE}/pending/${pending_id}`, null, { params: { status } });
  },
};
