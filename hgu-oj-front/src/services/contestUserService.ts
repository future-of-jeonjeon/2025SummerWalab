import { ContestJoinStatus, ContestUserRegistrationList, ContestUserRegistration, ContestUserStatusValue } from '../types';

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

const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');

const rawBase = (import.meta.env.VITE_MS_API_BASE as string | undefined) || '/ms/api';
const MS_API_BASE = trimTrailingSlash(rawBase);
const CONTEST_USER_API = `${MS_API_BASE}/contest-users`;

const ensureBaseUrl = () => {
  if (!MS_API_BASE) {
    throw new Error('Micro-service API base URL is not configured.');
  }
  return CONTEST_USER_API;
};

const parseJson = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const buildStatus = (payload: RawContestUserStatus | null, fallbackContestId: number): ContestJoinStatus => {
  const contestId = Number(payload?.contest_id ?? payload?.contestId ?? fallbackContestId);
  const userId = Number(payload?.user_id ?? payload?.userId ?? 0);
  const joinedFlag = Boolean(payload?.joined);
  const joinedAt = payload?.joined_at ?? payload?.joinedAt;
  const isAdmin = Boolean(payload?.is_admin ?? payload?.isAdmin);
  const status = typeof payload?.status === 'string' ? payload.status : undefined;
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
  const status = (entry.status ?? 'pending') as ContestUserStatusValue;
  return {
    userId,
    username: entry.username ?? null,
    status,
    appliedAt: entry.applied_at ?? entry.appliedAt,
    decidedAt: entry.decided_at ?? entry.decidedAt,
    decidedBy: entry.decided_by ?? entry.decidedBy ?? null,
  };
};

const request = async <T>(
  path: string,
  options?: RequestInit,
  fallbackContestId?: number,
): Promise<T> => {
  const base = ensureBaseUrl();
  const url = `${base}${path}`;
  const response = await fetch(url, {
    method: options?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    credentials: 'include',
    body: options?.body,
  });

  if (!response.ok) {
    const payload = await parseJson(response);
    const detail = typeof payload?.detail === 'string' ? payload.detail : null;
    throw new Error(detail || `요청에 실패했습니다. (${response.status})`);
  }
  const data = (await parseJson(response)) as T | RawContestUserStatus | null;
  if ((data as RawContestUserStatus | null)?.contest_id !== undefined || fallbackContestId) {
    return buildStatus(data as RawContestUserStatus | null, fallbackContestId ?? 0) as T;
  }
  return data as T;
};

export const contestUserService = {
  getStatus: async (contestId: number): Promise<ContestJoinStatus> => {
    if (!contestId) {
      throw new Error('유효하지 않은 대회입니다.');
    }
    return request<ContestJoinStatus>(`/${contestId}/me`, undefined, contestId);
  },
  join: async (contestId: number): Promise<ContestJoinStatus> => {
    if (!contestId) {
      throw new Error('유효하지 않은 대회입니다.');
    }
    return request<ContestJoinStatus>(
      `/`,
      {
        method: 'POST',
        body: JSON.stringify({ contest_id: contestId }),
      },
      contestId,
    );
  },
  getRegistrations: async (contestId: number): Promise<ContestUserRegistrationList> => {
    if (!contestId) {
      throw new Error('유효하지 않은 대회입니다.');
    }
    const payload = await request<RawContestUserRegistrationList>(`/${contestId}/registrations`);
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
    const payload = await request<RawContestUserRegistration>(`/${contestId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, action }),
    });
    return adaptRegistration(payload);
  },
};
