import { apiClient, MS_API_BASE } from './api';
import { ApprovalStatus } from '../types';

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
      const status = (item.status ?? item.state ?? '').toString().toLowerCase();
      const normalizedStatus: ApprovalStatus | undefined =
        status === 'pending' ? 'pending'
        : status === 'approved' || status === 'accept' || status === 'accepted' ? 'approved'
        : status === 'rejected' || status === 'deny' || status === 'denied' ? 'rejected'
        : undefined;
      if (!id || !normalizedStatus) return null;
      return {
        id: Number(id),
        status: normalizedStatus,
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
    const res = await apiClient.get(`${MS_API_BASE}/pending/problem`);
    return listToMap(normalizePendingList(res.data));
  },
  async getWorkbookStatuses(): Promise<Record<number, PendingContributionItem>> {
    const res = await apiClient.get(`${MS_API_BASE}/pending/workbook`);
    return listToMap(normalizePendingList(res.data));
  },
};
