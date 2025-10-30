import { Organization, OrganizationListResponse, OrganizationMember } from '../types';

type RequestOptions = {
  signal?: AbortSignal;
};

type RawOrganizationMember = {
  id?: number | string;
  user_id?: number | string;
  username?: string | number;
  real_name?: string;
  realName?: string;
  email?: string;
  admin_type?: string;
  adminType?: string;
};

type RawOrganization = {
  id?: number | string;
  organization_id?: number | string;
  name?: string | number;
  description?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  members?: RawOrganizationMember[];
  [key: string]: unknown;
};

type RawOrganizationListResponse = {
  items?: RawOrganization[];
  results?: RawOrganization[];
  data?: RawOrganization[];
  total?: number;
  count?: number;
  page?: number;
  current_page?: number;
  size?: number;
  limit?: number;
  page_size?: number;
  [key: string]: unknown;
};

export type OrganizationPayload = {
  name: string;
  description?: string | null;
};

export type OrganizationListParams = {
  page?: number;
  size?: number;
};

const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');

const rawBase = (import.meta.env.VITE_MS_API_BASE as string | undefined) || '/ms/api';
const MS_API_BASE = trimTrailingSlash(rawBase);
const ORGANIZATION_API_BASE = `${MS_API_BASE}/organization`;

const ensureBase = () => {
  if (!MS_API_BASE) {
    throw new Error('Micro-service API base URL is not configured.');
  }
  return ORGANIZATION_API_BASE;
};

const buildUrl = (path = '', params?: Record<string, unknown>) => {
  const base = ensureBase();
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const search = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return;
        }
        search.append(key, value.join(','));
        return;
      }
      const strValue = String(value).trim();
      if (!strValue) {
        return;
      }
      search.append(key, strValue);
    });
  }
  const query = search.toString();
  return `${base}${normalizedPath}${query ? `?${query}` : ''}`;
};

const parseJson = async <T>(response: Response): Promise<T | null> => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.warn('Failed to parse JSON from organization service response', error);
    return null;
  }
};

const isRawOrganization = (value: unknown): value is RawOrganization =>
  typeof value === 'object' && value !== null;

const adaptMember = (data: RawOrganizationMember | undefined): OrganizationMember => {
  const idSource = data?.id ?? data?.user_id ?? 0;
  const usernameSource = data?.username ?? '';
  return {
    id: Number(idSource),
    username: typeof usernameSource === 'string' ? usernameSource : String(usernameSource),
    realName: typeof data?.real_name === 'string' ? data.real_name : data?.realName,
    email: typeof data?.email === 'string' ? data.email : undefined,
    adminType: typeof data?.admin_type === 'string' ? data.admin_type : data?.adminType,
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

const ensureOk = (response: Response) => {
  if (!response.ok) {
    throw new Error(`Organization request failed with status ${response.status}`);
  }
};

export const organizationService = {
  list: async (
    { page = 1, size = 20 }: OrganizationListParams = {},
    options?: RequestOptions,
  ): Promise<OrganizationListResponse> => {
    const url = buildUrl('', { page, size });
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      signal: options?.signal,
    });
    ensureOk(response);
    const payload = await parseJson<unknown>(response);
    return adaptListResponse(payload, { page, size });
  },

  get: async (organizationId: number, options?: RequestOptions): Promise<Organization> => {
    const url = buildUrl(`/${organizationId}`);
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      signal: options?.signal,
    });
    ensureOk(response);
    const payload = await parseJson<RawOrganization | null>(response);
    if (!payload) {
      throw new Error('Organization detail response is empty.');
    }
    return adaptOrganization(payload);
  },

  create: async (payload: OrganizationPayload, options?: RequestOptions): Promise<Organization> => {
    const url = buildUrl('/');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      signal: options?.signal,
      body: JSON.stringify(payload),
    });
    ensureOk(response);
    const body = await parseJson<RawOrganization | null>(response);
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
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      signal: options?.signal,
      body: JSON.stringify(payload),
    });
    ensureOk(response);
    const body = await parseJson<RawOrganization | null>(response);
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
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
      signal: options?.signal,
    });
    ensureOk(response);
  },

  addMember: async (
    organizationId: number,
    userId: number,
    options?: RequestOptions,
  ): Promise<Organization> => {
    const url = buildUrl(`/${organizationId}/users/${userId}`);
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      signal: options?.signal,
    });
    ensureOk(response);
    const body = await parseJson<RawOrganization | null>(response);
    if (!body) {
      throw new Error('Failed to parse add member response.');
    }
    return adaptOrganization(body);
  },

  removeMember: async (
    organizationId: number,
    userId: number,
    options?: RequestOptions,
  ): Promise<Organization> => {
    const url = buildUrl(`/${organizationId}/users/${userId}`);
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
      signal: options?.signal,
    });
    ensureOk(response);
    const body = await parseJson<RawOrganization | null>(response);
    if (!body) {
      return {
        id: organizationId,
        name: '',
      };
    }
    return adaptOrganization(body);
  },
};
