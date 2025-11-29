import { AxiosResponse } from 'axios';
import { apiClient, MS_API_BASE } from './api';
import { OrganizationRankingEntry, PaginatedResponse, UserRankingEntry } from '../types';

const DEFAULT_PAGE_SIZE = 25;
const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');
const USER_RANKING_ENDPOINT = ((import.meta.env.VITE_USER_RANKING_ENDPOINT as string | undefined) || '/user_rank').replace(/\/+$/, '');

const ORGANIZATION_RANKING_ENDPOINT = trimTrailingSlash(
  (import.meta.env.VITE_ORGANIZATION_RANKING_ENDPOINT as string | undefined)
  || `${MS_API_BASE}/organization_rank`,
);

type ContestRule = 'ACM' | 'OI';

export interface UserRankingParams {
  page?: number;
  limit?: number;
  rule?: ContestRule;
}

type RequestOptions = {
  signal?: AbortSignal;
};

export interface OrganizationRankingParams {
  page?: number;
  limit?: number;
}

const unwrapOjPayload = <T>(payload: any): T => {
  if (
    payload &&
    typeof payload === 'object' &&
    Object.prototype.hasOwnProperty.call(payload, 'error') &&
    Object.prototype.hasOwnProperty.call(payload, 'data')
  ) {
    if (payload.error) {
      const detail = payload.data;
      const message = typeof detail === 'string' ? detail : '랭킹 정보를 불러오지 못했습니다.';
      throw new Error(message);
    }
    return payload.data as T;
  }
  return payload as T;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

const normalizePercentage = (value: unknown, accepted?: number, submissions?: number): number | undefined => {
  const numeric = toNumber(value);
  if (numeric !== undefined) {
    if (numeric <= 1) {
      return Number((numeric * 100).toFixed(2));
    }
    return Number(numeric.toFixed(2));
  }
  if (accepted !== undefined && submissions && submissions > 0) {
    return Number(((accepted / submissions) * 100).toFixed(2));
  }
  return undefined;
};

const adaptUserRankingEntry = (item: any, index: number, offset: number): UserRankingEntry => {
  const rank =
    toNumber(item?.rank ?? item?.position ?? item?.order ?? item?.ranking) ??
    offset + index + 1;

  const user = item?.user ?? item?.profile ?? item;
  const nestedUser = user?.user ?? item?.user?.user ?? null;

  const username = pickString(
    nestedUser?.username,
    user?.username,
    item?.username,
    item?.user_name,
    item?.userName,
  ) ?? `사용자 ${rank}`;

  const realName = pickString(
    nestedUser?.real_name,
    user?.real_name,
    item?.real_name,
    item?.realName,
  );

  const accepted = toNumber(
    item?.accepted_number ??
    item?.acceptedNumber ??
    item?.accepted_count ??
    item?.solved ??
    user?.accepted_number ??
    user?.acceptedNumber,
  );

  const submissions = toNumber(
    item?.submission_number ??
    item?.submissionNumber ??
    item?.submission_count ??
    item?.attempts ??
    user?.submission_number ??
    user?.submissionNumber,
  );

  const rating = toNumber(
    item?.rating ??
    item?.score ??
    item?.total_score ??
    user?.rating ??
    user?.total_score,
  );

  const organization = pickString(
    item?.organization?.name,
    item?.organization,
    item?.team_name,
    user?.organization?.name,
    user?.school,
  );

  const avatar = pickString(
    item?.avatar,
    user?.avatar,
    nestedUser?.avatar,
  );

  return {
    rank,
    username,
    realName,
    solvedCount: accepted,
    submissionCount: submissions,
    accuracy: normalizePercentage(
      item?.accuracy ??
      item?.accepted_rate ??
      item?.pass_rate ??
      item?.passRate ??
      item?.ratio ??
      user?.accuracy,
      accepted,
      submissions,
    ),
    rating,
    organization,
    avatarUrl: avatar,
  };
};

interface NormalizedListPayload {
  items: any[];
  total: number;
}

const normalizeListPayload = (payload: any): NormalizedListPayload => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      total: payload.length,
    };
  }
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.results)) {
      return {
        items: payload.results,
        total: toNumber(payload.total) ?? payload.results.length,
      };
    }
    if (Array.isArray(payload.data)) {
      return {
        items: payload.data,
        total: toNumber(payload.total ?? payload.count) ?? payload.data.length,
      };
    }
    if (Array.isArray(payload.items)) {
      const meta = payload.meta ?? payload.pagination ?? {};
      return {
        items: payload.items,
        total: toNumber(payload.total ?? meta.total ?? meta.total_count) ?? payload.items.length,
      };
    }
  }
  return { items: [], total: 0 };
};

export const rankingService = {
  getUserRankings: async (
    params: UserRankingParams = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<UserRankingEntry>> => {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * limit;
    const rule: ContestRule = params.rule === 'OI' ? 'OI' : 'ACM';

    const response: AxiosResponse = await apiClient.get(
      `${USER_RANKING_ENDPOINT}/`,
      {
        params: {
          limit,
          offset,
          rule,
        },
        signal: options.signal,
      },
    );

    const payload = unwrapOjPayload<any>(response.data);
    const { items, total } = normalizeListPayload(payload);
    const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
    const normalizedItems = items.map((item, index) =>
      adaptUserRankingEntry(item, index, offset),
    );

    return {
      data: normalizedItems,
      total,
      page,
      limit,
      totalPages,
    };
  },

  getOrganizationRankings: async (
    params: OrganizationRankingParams = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<OrganizationRankingEntry>> => {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * limit;

    const base = ORGANIZATION_RANKING_ENDPOINT || '/organization_rank';
    const normalizedBase = base.endsWith('/') && !base.includes('?') ? base.slice(0, -1) : base;
    const searchParams = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    const separator = normalizedBase.includes('?') ? '&' : '?';
    const endpoint = `${normalizedBase}${separator}${searchParams.toString()}`;

    const response = await apiClient.get<{
      items?: Array<Record<string, unknown>>;
      results?: Array<Record<string, unknown>>;
      data?: Array<Record<string, unknown>>;
      total?: number;
      total_count?: number;
      count?: number;
      limit?: number;
      page?: number;
      offset?: number;
    }>(endpoint, {
      signal: options.signal,
    });

    const payload = response.data;

    const rawItems = Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.results)
        ? payload.results
        : Array.isArray(payload.data)
          ? payload.data
          : [];

    const total = toNumber(payload.total ?? payload.total_count ?? payload.count) ?? rawItems.length;
    const normalizedItems: OrganizationRankingEntry[] = rawItems.map((item, index) => {
      const rank = toNumber(item.rank) ?? offset + index + 1;
      const totalSolved = toNumber((item as any).total_solved ?? (item as any).totalAccepted ?? (item as any).total_accepted);
      const totalSubmission = toNumber((item as any).total_submission ?? (item as any).totalSubmission);

      return {
        rank,
        name: pickString(
          item.name,
          (item as any).organization_name,
          (item as any).organizationName,
        ) ?? `조직 ${rank}`,
        description: pickString(
          (item as any).description,
          (item as any).organization_description,
        ),
        totalMembers: toNumber((item as any).total_members ?? (item as any).members),
        totalSolved: totalSolved,
        totalSubmission: totalSubmission,
        accuracy: normalizePercentage(
          (item as any).accuracy,
          totalSolved,
          totalSubmission,
        ),
      };
    });

    const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;

    return {
      data: normalizedItems,
      total,
      page,
      limit,
      totalPages,
    };
  },
};

export type RankingService = typeof rankingService;
