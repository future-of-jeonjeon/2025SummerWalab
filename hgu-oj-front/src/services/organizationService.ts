import { Organization, OrganizationListResponse, OrganizationMember, OrganizationPayload, OrganizationApplication, OrganizationApplicationPayload, OrganizationApplicationApprovePayload } from '../types';
import { apiClient, MS_API_BASE } from './api';

type RequestOptions = {
  signal?: AbortSignal;
};

type RawUserData = {
  user_id?: number | string;
  username?: string | number;
  real_name?: string;
  realName?: string;
  email?: string;
  avatar?: string;
  admin_type?: string;
  adminType?: string;
};

type RawOrganizationMember = {
  id?: number | string;
  user_id?: number | string;
  username?: string | number;
  real_name?: string;
  realName?: string;
  email?: string;
  user?: RawUserData;
  role?: string | number;
  admin_type?: string;
  adminType?: string;
};

type RawOrganization = {
  id?: number | string;
  organization_id?: number | string; // Handle alternate key
  name?: string | number;
  description?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  members?: RawOrganizationMember[];
  member_count?: number;
};

type RawOrganizationListResponse = {
  items?: RawOrganization[];
  results?: RawOrganization[];
  data?: RawOrganization[];
  total?: number | string;
  count?: number | string;
  page?: number | string;
  current_page?: number | string;
  size?: number | string;
  limit?: number | string;
  page_size?: number | string;
};

interface OrganizationListParams {
  page?: number;
  size?: number;
  // Intentionally removed search term as per user request to remove search
}



const ensureBase = (url: string): string => {
  if (url.startsWith('http')) return url;
  const base = MS_API_BASE.endsWith('/') ? MS_API_BASE.slice(0, -1) : MS_API_BASE;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
};

const buildUrl = (path: string, params?: Record<string, string | number | undefined>): string => {
  const url = ensureBase(`/organization${path}`);
  if (!params) return url;

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
};

function isRawOrganization(data: unknown): data is RawOrganization {
  return typeof data === 'object' && data !== null;
}

const adaptMember = (data: RawOrganizationMember | undefined): OrganizationMember => {
  // Prioritize nested user object
  const user = data?.user;

  const idSource = data?.id ?? user?.user_id ?? data?.user_id ?? 0;
  const usernameSource = user?.username ?? data?.username ?? '';
  const realNameSource = user?.real_name ?? user?.realName ?? data?.real_name ?? data?.realName;
  const emailSource = user?.email ?? data?.email;
  // Extract avatar from nested user object
  const avatarSource = user?.avatar;
  const adminTypeSource = user?.admin_type ?? user?.adminType ?? data?.admin_type ?? data?.adminType;

  return {
    id: Number(idSource),
    username: typeof usernameSource === 'string' ? usernameSource : String(usernameSource),
    realName: typeof realNameSource === 'string' ? realNameSource : undefined,
    email: typeof emailSource === 'string' ? emailSource : undefined,
    avatar: typeof avatarSource === 'string' ? avatarSource : undefined,
    adminType: typeof adminTypeSource === 'string' ? adminTypeSource : undefined,
    // Provide a default role if needed, though OrganizationMember interface might not enforce it rigidly yet or uses 'role' field
    role: (typeof data?.role === 'number' || typeof data?.role === 'string' ? String(data.role) : undefined) as "MEMBER" | "ORG_ADMIN" | "ORG_SUPER_ADMIN" | undefined,
  };
};

const adaptOrganization = (raw: RawOrganization | undefined): Organization => {
  if (!isRawOrganization(raw)) {
    return {
      id: 0,
      name: '',
    };
  }

  const members = Array.isArray(raw.members)
    ? raw.members
      .map((member) => adaptMember(member))
      .filter((member) => member.id !== 0 || member.username.trim().length > 0)
    : undefined;

  const rawId = raw.id ?? raw.organization_id ?? 0;
  const rawName = raw.name ?? '';

  return {
    id: Number(rawId),
    name: typeof rawName === 'string' ? rawName : String(rawName),
    description: typeof raw.description === 'string' ? raw.description : raw.description ?? null,
    // Provide img_url mapping
    img_url: (raw as any).img_url || (raw as any).imgUrl || null,
    createdAt: typeof raw.created_at === 'string' ? raw.created_at : raw.createdAt,
    updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : raw.updatedAt,
    members: members && members.length > 0 ? members : undefined,
  };
};

const adaptListResponse = (
  payload: unknown,
  fallback: { page: number; size: number },
): OrganizationListResponse => {
  if (Array.isArray(payload)) {
    return {
      items: payload.map((item) => adaptOrganization(item as RawOrganization)),
      total: payload.length,
      page: fallback.page,
      size: fallback.size,
    };
  }

  if (typeof payload === 'object' && payload !== null) {
    const rawPayload = payload as RawOrganizationListResponse;
    const rawItems =
      Array.isArray(rawPayload.items) ? rawPayload.items :
        Array.isArray(rawPayload.results) ? rawPayload.results :
          Array.isArray(rawPayload.data) ? rawPayload.data :
            [];

    const items = rawItems.map((item) => adaptOrganization(item));

    const total = Number(rawPayload.total ?? rawPayload.count ?? items.length);
    const page = Number(rawPayload.page ?? rawPayload.current_page ?? fallback.page);
    const size = Number(rawPayload.size ?? rawPayload.limit ?? rawPayload.page_size ?? fallback.size);

    return {
      items,
      total: Number.isFinite(total) ? total : items.length,
      page: Number.isFinite(page) ? page : fallback.page,
      size: Number.isFinite(size) ? size : fallback.size,
    };
  }

  return {
    items: [],
    total: 0,
    page: fallback.page,
    size: fallback.size,
  };
};



export const organizationService = {
  list: async (
    { page = 1, size = 20 }: OrganizationListParams = {},
    options?: RequestOptions,
  ): Promise<OrganizationListResponse> => {
    const url = buildUrl('', { page, size });
    const response = await apiClient.get<unknown>(url, { signal: options?.signal });
    return adaptListResponse(response.data, { page, size });
  },

  get: async (organizationId: number, options?: RequestOptions): Promise<Organization> => {
    const url = buildUrl(`/${organizationId}`);
    const response = await apiClient.get<RawOrganization>(url, { signal: options?.signal });
    const payload = response.data;
    if (!payload) {
      throw new Error('Organization detail response is empty.');
    }
    return adaptOrganization(payload);
  },

  create: async (payload: OrganizationPayload, options?: RequestOptions): Promise<Organization> => {
    const url = buildUrl('/');
    const response = await apiClient.post<RawOrganization>(url, payload, { signal: options?.signal });
    const body = response.data;
    if (!body) {
      throw new Error('Failed to parse organization create response.');
    }
    return adaptOrganization(body);
  },

  update: async (
    organizationId: number,
    payload: OrganizationPayload,
    options?: RequestOptions,
  ): Promise<Organization> => {
    const url = buildUrl(`/${organizationId}`);
    const response = await apiClient.put<RawOrganization>(url, payload, { signal: options?.signal });
    const body = response.data;
    if (!body) {
      return {
        id: organizationId,
        name: payload.name,
        description: payload.description ?? null,
      };
    }
    return adaptOrganization(body);
  },

  remove: async (organizationId: number, options?: RequestOptions): Promise<void> => {
    const url = buildUrl(`/${organizationId}`);
    await apiClient.delete(url, { signal: options?.signal });
  },



  removeMember: async (
    organizationId: number,
    userId: number,
    options?: RequestOptions,
  ): Promise<Organization> => {
    const url = buildUrl(`/${organizationId}/users/${userId}`);
    const response = await apiClient.delete<RawOrganization>(url, { signal: options?.signal });
    const body = response.data;
    if (!body) {
      return {
        id: organizationId,
        name: '',
      };
    }
    return adaptOrganization(body);
  },

  join: async (organizationId: number, joinCode?: string, options?: RequestOptions): Promise<void> => {
    const url = buildUrl(`/${organizationId}/join`);
    const params = joinCode ? { join_code: joinCode } : {};
    await apiClient.post(url, {}, { params, signal: options?.signal });
  },

  generateInviteCode: async (organizationId: number, options?: RequestOptions): Promise<string> => {
    const url = buildUrl(`/${organizationId}/join-code`);
    const response = await apiClient.post<string>(url, {}, { signal: options?.signal });
    return response.data;
  },

  verifyJoinCode: async (organizationId: number, joinCode: string, options?: RequestOptions): Promise<boolean> => {
    const url = buildUrl(`/${organizationId}/verify-join-code`, { join_code: joinCode });
    const response = await apiClient.get<boolean>(url, { signal: options?.signal });
    return response.data;
  },

  createApply: async (payload: OrganizationApplicationPayload): Promise<OrganizationApplication> => {
    const url = ensureBase('/organization/apply');
    const response = await apiClient.post<OrganizationApplication>(url, payload);
    return response.data;
  },

  getApplies: async (): Promise<OrganizationApplication[]> => {
    const url = ensureBase('/organization/apply/list');
    const response = await apiClient.get<OrganizationApplication[]>(url, { skipAuthRedirect: true } as any);
    return response.data;
  },

  handleApply: async (applyId: string, payload: OrganizationApplicationApprovePayload): Promise<void> => {
    const url = ensureBase(`/organization/apply/${applyId}/handle`);
    await apiClient.post(url, payload, { skipAuthRedirect: true } as any);
  },
};
