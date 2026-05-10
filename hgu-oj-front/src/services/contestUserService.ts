import {
  ContestJoinStatus,
  ContestManageUserSearchItem,
  ContestUserRegistrationList,
  ContestUserRegistration,
  ContestUserStatusValue,
} from '../types';
import { apiClient, MS_API_BASE } from './api';

type RawContestUserStatus = {
  contest_id?: number;
  contestId?: number;
  user_id?: number;
  userId?: number;
  joined?: boolean;
  joined_at?: string;
  joinedAt?: string;
  is_admin?: boolean;
  isAdmin?: boolean;
  status?: string;
  requires_approval?: boolean;
  requiresApproval?: boolean;
};

type RawContestUserRegistration = {
  user_id?: number;
  userId?: number;
  username?: string;
  status?: string;
  applied_at?: string;
  appliedAt?: string;
  decided_at?: string;
  decidedAt?: string;
  decided_by?: number;
  decidedBy?: number;
};

type RawContestUserRegistrationList = {
  approved?: RawContestUserRegistration[];
  pending?: RawContestUserRegistration[];
};

type RawContestManageUserSearchItem = {
  user_id?: number;
  userId?: number;
  username?: string;
  name?: string;
  student_id?: string;
  studentId?: string;
};

export interface ContestApprovalPolicy {
  contestId: number;
  requiresApproval: boolean;
}

const CONTEST_USER_STATUS_VALUES: ContestUserStatusValue[] = ['approved', 'pending', 'rejected'];

const normalizeContestUserStatusValue = (value?: string): ContestUserStatusValue | undefined => {
  if (!value) return undefined;
  return CONTEST_USER_STATUS_VALUES.includes(value as ContestUserStatusValue)
    ? (value as ContestUserStatusValue)
    : undefined;
};

const CONTEST_USER_API = `${MS_API_BASE}/contest`;

const ensureBaseUrl = () => {
  if (!MS_API_BASE) {
    throw new Error('Micro-service API base URL is not configured.');
  }
  return CONTEST_USER_API;
};


const buildStatus = (payload: RawContestUserStatus | null, fallbackContestId: number): ContestJoinStatus => {
  const contestId = Number(payload?.contest_id ?? payload?.contestId ?? fallbackContestId);
  const userId = Number(payload?.user_id ?? payload?.userId ?? 0);
  const joinedFlag = Boolean(payload?.joined);
  const joinedAt = payload?.joined_at ?? payload?.joinedAt;
  const isAdmin = Boolean(payload?.is_admin ?? payload?.isAdmin);
  const status = normalizeContestUserStatusValue(payload?.status);
  const requiresApproval = Boolean(payload?.requires_approval ?? payload?.requiresApproval);
  return {
    contestId,
    userId,
    joined: joinedFlag,
    joinedAt: joinedAt || undefined,
    isAdmin,
    status,
    requiresApproval,
  };
};

const adaptRegistration = (entry: RawContestUserRegistration): ContestUserRegistration => {
  const userId = Number(entry.user_id ?? entry.userId ?? 0);
  const status = normalizeContestUserStatusValue(entry.status) ?? 'pending';
  return {
    userId,
    username: entry.username ?? null,
    status,
    appliedAt: entry.applied_at ?? entry.appliedAt,
    decidedAt: entry.decided_at ?? entry.decidedAt,
    decidedBy: entry.decided_by ?? entry.decidedBy ?? null,
  };
};

const adaptManageSearchUser = (entry: RawContestManageUserSearchItem): ContestManageUserSearchItem => ({
  userId: Number(entry.user_id ?? entry.userId ?? 0),
  username: entry.username ?? '',
  name: entry.name ?? null,
  studentId: entry.student_id ?? entry.studentId ?? null,
});

export const contestUserService = {
  getStatus: async (contestId: number): Promise<ContestJoinStatus> => {
    if (!contestId) {
      throw new Error('유효하지 않은 대회입니다.');
    }
    const response = await apiClient.get<RawContestUserStatus>(`${ensureBaseUrl()}/${contestId}/participants/me`);
    return buildStatus(response.data, contestId);
  },

  join: async (contestId: number): Promise<ContestJoinStatus> => {
    if (!contestId) {
      throw new Error('유효하지 않은 대회입니다.');
    }
    const response = await apiClient.post<RawContestUserStatus>(`${ensureBaseUrl()}/${contestId}/participants`, {});
    return buildStatus(response.data, contestId);
  },

  getRegistrations: async (contestId: number): Promise<ContestUserRegistrationList> => {
    if (!contestId) {
      throw new Error('유효하지 않은 대회입니다.');
    }
    const response = await apiClient.get<RawContestUserRegistrationList>(`${ensureBaseUrl()}/${contestId}/participants`);
    const payload = response.data;
    return {
      approved: Array.isArray(payload?.approved) ? payload.approved.map(adaptRegistration) : [],
      pending: Array.isArray(payload?.pending) ? payload.pending.map(adaptRegistration) : [],
    };
  },

  decideRegistration: async (
    contestId: number,
    userId: number,
    action: 'approve' | 'reject',
  ): Promise<ContestUserRegistration> => {
    if (!contestId || !userId) {
      throw new Error('잘못된 요청입니다.');
    }
    const response = await apiClient.patch<RawContestUserRegistration>(
      `${ensureBaseUrl()}/${contestId}/participants/${userId}`,
      { action },
    );
    return adaptRegistration(response.data);
  },

  joinByUserId: async (contestId: number, userId: number): Promise<ContestJoinStatus> => {
    if (!contestId || !userId) {
      throw new Error('잘못된 요청입니다.');
    }
    const response = await apiClient.post<RawContestUserStatus>(
      `${ensureBaseUrl()}/${contestId}/manage/participants`,
      {},
      {
        params: { user_id: userId },
      },
    );
    return buildStatus(response.data, contestId);
  },

  searchManageUsers: async (contestId: number, keyword: string): Promise<ContestManageUserSearchItem[]> => {
    if (!contestId) {
      throw new Error('유효하지 않은 대회입니다.');
    }
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) {
      return [];
    }
    const response = await apiClient.get<RawContestManageUserSearchItem[]>(
      `${ensureBaseUrl()}/${contestId}/manage/participants/search`,
      {
        params: { keyword: normalizedKeyword },
      },
    );
    const payload = Array.isArray(response.data) ? response.data : [];
    return payload.map(adaptManageSearchUser).filter((entry) => entry.userId > 0);
  },

  getPolicy: async (contestId: number): Promise<ContestApprovalPolicy> => {
    if (!contestId) {
      throw new Error('유효하지 않은 대회입니다.');
    }
    const response = await apiClient.get<any>(`${ensureBaseUrl()}/${contestId}/policy`);
    const payload = response.data ?? {};
    return {
      contestId: Number(payload.contest_id ?? payload.contestId ?? contestId),
      requiresApproval: Boolean(payload.requires_approval ?? payload.requiresApproval),
    };
  },

  setPolicy: async (contestId: number, requiresApproval: boolean): Promise<ContestApprovalPolicy> => {
    if (!contestId) {
      throw new Error('유효하지 않은 대회입니다.');
    }
    const response = await apiClient.post<any>(`${ensureBaseUrl()}/${contestId}/policy`, {
      contest_id: contestId,
      requires_approval: requiresApproval,
    });
    const payload = response.data ?? {};
    return {
      contestId: Number(payload.contest_id ?? payload.contestId ?? contestId),
      requiresApproval: Boolean(payload.requires_approval ?? payload.requiresApproval),
    };
  },
};
