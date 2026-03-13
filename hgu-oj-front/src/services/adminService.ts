import { api, apiClient, MS_API_BASE } from './api';
import axios from 'axios';
import {
  ApiResponse,
  Workbook,
  WorkbookProblem,
  Problem,
  AdminUser,
  AdminUserListResponse,
  JudgeServer,
  JudgeServerListResponse,
  AdminContest,
  AdminContestListResponse,
  ContestAnnouncement,
  CreateContestRequest,
  SystemMetrics,
  TestCaseUploadResponse,
} from '../types';
import { availableLanguages } from '../lib/problemLanguage';

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y';
  }

  return Boolean(value);
};

export interface CreateProblemPayload {
  title: string;
  description: string;
  input_description: string;
  output_description: string;
  samples: Array<{ input: string; output: string }>;
  time_limit: number;
  memory_limit: number;
  languages: string[];
  template: Record<string, string>;
  difficulty: string | number;
  tags: string[];
  hint?: string | null;
  solution_code?: string;
  solution_code_language?: string;
  test_case_id: string;
  visible?: boolean;
}

export interface UpdateProblemPayload extends CreateProblemPayload {
  id: number;
}

interface AdminProblemListParams {
  keyword?: string;
  limit?: number;
  offset?: number;
}

interface AdminProblemListResponse {
  results?: any[];
  total?: number;
  offset?: number;
  limit?: number;
}

export interface AdminProblemDetail {
  id: number;
  displayId?: string;
  title: string;
  description: string;
  inputDescription: string;
  outputDescription: string;
  samples: Array<{ input: string; output: string }>;
  testCaseId: string;
  testCaseScore: Array<{ input_name: string; output_name: string; score: number }>;
  timeLimit: number;
  memoryLimit: number;
  languages: string[];
  template: Record<string, string>;
  ruleType: 'ACM' | 'OI';
  ioMode: { io_mode: string; input: string; output: string };
  spj: boolean;
  spjLanguage: string | null;
  spjCode: string | null;
  spjCompileOk: boolean;
  visible: boolean;
  difficulty: string | number;
  tags: string[];
  hint?: string | null;
  source?: string | null;
  shareSubmission: boolean;
}

export type CreateContestPayload = Omit<CreateContestRequest, 'organization_id'> & {
  organization_id?: number;
};

export interface CreateWorkbookPayload {
  title: string;
  description: string;
  is_public: boolean;
  problemIds?: number[];
}

export interface UpdateWorkbookPayload {
  title: string;
  description?: string | null;
  category?: string | null;
  is_public?: boolean;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  keyword?: string;
}

export interface UpdateUserPayload {
  id: number;
  username: string;
  real_name?: string;
  email?: string;
  password?: string;
  admin_type: string;
  problem_permission: string;
  two_factor_auth: boolean;
  open_api: boolean;
  is_disabled?: boolean;
}


export interface UpdateJudgeServerPayload {
  id: number;
  is_disabled: boolean;
}

export type UpdateContestPayload = CreateContestPayload & {
  id: number;
  password?: string | null;
};

interface ContestListParams {
  page?: number;
  limit?: number;
  keyword?: string;
}

const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');

const WORKBOOK_API_BASE = trimTrailingSlash(`${MS_API_BASE}/workbook`);
const ORGANIZATION_API_BASE = trimTrailingSlash(`${MS_API_BASE}/organization`);

const buildWorkbookUrl = (path = '') => `${WORKBOOK_API_BASE}${path}`;
const buildOrganizationUrl = (path = '') => `${ORGANIZATION_API_BASE}${path}`;

const MICRO_SERVICE_HEALTH_URL = buildWorkbookUrl('/');

const getMsBaseUrl = () => MS_API_BASE.endsWith('/') ? MS_API_BASE.slice(0, -1) : MS_API_BASE;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ProblemPollingStatus = {
  status: 'initialized' | 'processing' | 'done' | 'error';
  problem_id?: number;
  error_code?: string;
};

const unwrap = <T>(response: ApiResponse<T>): T => {
  if (!response.success) {
    const message = response.message || '요청이 실패했습니다.';
    throw new Error(message);
  }
  return response.data;
};



export const adminService = {
  getAvailableLanguages: async (): Promise<string[]> => {
    // MS Server does not have a languages endpoint, and calling /contest/languages triggers 422.
    // Falling back to existing static list as per instructions.
    return availableLanguages;
  },

  uploadProblemTestCases: async (file: File, spj: boolean): Promise<TestCaseUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('spj', spj ? 'true' : 'false');

    const response = await apiClient.post('/admin/test_case/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const body = response.data;
    const hasWrapper = body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'error');
    const success = hasWrapper ? body.error === null : true;

    if (!success) {
      const detail = body?.data ?? '테스트케이스 업로드에 실패했습니다.';
      throw new Error(typeof detail === 'string' ? detail : '테스트케이스 업로드에 실패했습니다.');
    }

    return (hasWrapper ? body.data : body) as TestCaseUploadResponse;
  },

  createProblem: async (payload: CreateProblemPayload) => {
    const response = await api.post<any>('/admin/problem/', payload);
    return unwrap(response);
  },

  createContest: async (payload: CreateContestPayload): Promise<AdminContest> => {
    const baseUrl = getMsBaseUrl();
    const response = await apiClient.post<AdminContest>(`${baseUrl}/contest`, payload);
    return mapAdminContest(response.data);
  },

  getContests: async ({ page = 1, limit = 20, keyword }: ContestListParams = {}): Promise<AdminContestListResponse> => {
    const params = {
      offset: (page - 1) * limit,
      limit,
      ...(keyword && keyword.trim().length > 0 ? { keyword: keyword.trim() } : {}),
      paging: true,
    };

    const response = await api.get<any>('/admin/contest', params);
    const data = unwrap(response);
    const results = Array.isArray(data.results) ? data.results.map(mapAdminContest) : [];

    return {
      results,
      total: Number(data.total ?? results.length),
      offset: params.offset,
      limit: params.limit,
    };
  },

  getContestDetail: async (contestId: number): Promise<AdminContest> => {
    const baseUrl = getMsBaseUrl();
    const response = await apiClient.get<AdminContest>(`${baseUrl}/contest/${contestId}`);
    return mapAdminContest(response.data);
  },

  updateContest: async (payload: UpdateContestPayload): Promise<AdminContest> => {
    const baseUrl = getMsBaseUrl();
    const response = await apiClient.put<AdminContest>(`${baseUrl}/contest/`, payload);
    return mapAdminContest(response.data);
  },

  deleteContest: async (id: number): Promise<void> => {
    const baseUrl = getMsBaseUrl();
    await apiClient.delete(`${baseUrl}/contest/${id}`);
  },

  createContestAnnouncement: async (payload: { contestId: number; title: string; content: string; visible: boolean }) => {
    const response = await api.post<ContestAnnouncement>('/admin/contest/announcement/', {
      contest_id: payload.contestId,
      title: payload.title,
      content: payload.content,
      visible: payload.visible,
    });
    return unwrap(response);
  },

  createWorkbook: async (payload: CreateWorkbookPayload): Promise<Workbook> => {
    const response = await apiClient.post<Workbook>(buildWorkbookUrl('/'), payload);
    return response.data;
  },

  getWorkbooks: async ({ page = 1, limit = 20, keyword }: { page?: number; limit?: number; keyword?: string } = {}): Promise<{
    results: Workbook[];
    total: number;
    offset: number;
    limit: number;
  }> => {
    const params = {
      page,
      limit,
      size: limit,
      keyword,
    };
    const response = await apiClient.get<any>(buildWorkbookUrl('/'), { params });
    const rawData: any = response.data;
    const payload = rawData?.data ?? rawData;

    let results: Workbook[] = [];
    let total = 0;

    if (Array.isArray(payload)) {
      results = payload;
      total = payload.length;
      if (limit) {
        const start = (page - 1) * limit;
        results = results.slice(start, start + limit);
      }
    } else if (payload && Array.isArray(payload.results)) {
      results = payload.results;
      total = payload.total || results.length;
    } else if (payload && Array.isArray(payload.items)) {
      results = payload.items;
      total = payload.total || results.length;
    } else if (payload && Array.isArray(payload.data)) {
      results = payload.data;
      total = payload.total || results.length;
    }

    const resolvedLimit =
      Number.isFinite(Number(payload?.size)) && Number(payload?.size) > 0
        ? Number(payload.size)
        : limit;

    return {
      results,
      total,
      offset: (page - 1) * resolvedLimit,
      limit: resolvedLimit,
    };
  },

  getWorkbook: async (id: number): Promise<Workbook> => {
    const response = await apiClient.get<Workbook | { data: Workbook }>(buildWorkbookUrl(`/${id}`));
    const payload: any = response.data;
    return (payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload) as Workbook;
  },

  deleteWorkbook: async (id: number): Promise<void> => {
    await apiClient.delete(buildWorkbookUrl(`/${id}`));
  },

  getWorkbookProblems: async (id: number): Promise<WorkbookProblem[]> => {
    const response = await apiClient.get<any[]>(buildWorkbookUrl(`/${id}/problems`));
    const data = response.data;

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item: any, index: number) => {
      const adapted = adaptWorkbookProblem(item);
      return {
        ...adapted,
        order: Number.isFinite(adapted.order) ? adapted.order : index,
      };
    });
  },

  updateWorkbookProblems: async (workbookId: number, problemIds: number[]): Promise<void> => {
    await apiClient.put(buildWorkbookUrl(`/${workbookId}/problems`), { problems: problemIds });
  },

  updateWorkbookMeta: async (workbookId: number, payload: UpdateWorkbookPayload): Promise<Workbook> => {
    const response = await apiClient.put<Workbook>(buildWorkbookUrl(`/${workbookId}`), {
      title: payload.title,
      description: payload.description ?? null,
      category: payload.category ?? null,
      is_public: payload.is_public ?? false,
    });
    return response.data;
  },



  getAdminProblemList: async ({ keyword, limit = 20, offset = 0 }: AdminProblemListParams = {}): Promise<{
    results: Problem[];
    total: number;
    offset: number;
    limit: number;
  }> => {
    const response = await api.get<AdminProblemListResponse>('/admin/problem', {
      paging: true,
      limit,
      offset,
      ...(keyword && keyword.trim().length > 0 ? { keyword: keyword.trim() } : {}),
    });
    const data = unwrap(response);
    const results = Array.isArray(data?.results) ? data.results : [];
    return {
      results: results.map(adaptProblem),
      total: Number(data?.total ?? results.length),
      offset: Number(data?.offset ?? offset),
      limit: Number(data?.limit ?? limit),
    };
  },

  searchAdminProblems: async ({ keyword, limit = 20, offset = 0 }: AdminProblemListParams = {}): Promise<Problem[]> => {
    const page = Math.floor(offset / limit) + 1;
    const baseUrl = getMsBaseUrl();
    const response = await apiClient.get<any>(`${baseUrl}/problem/available`, {
      params: {
        page,
        size: limit,
        ...(keyword && keyword.trim().length > 0 ? { keyword: keyword.trim() } : {}),
      }
    });
    const data = response.data;
    const results: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.items)
          ? data.items
          : [];
    return results.map(adaptProblem);
  },

  getAdminProblemDetail: async (problemId: number): Promise<AdminProblemDetail> => {
    try {
      const response = await api.get<any>('/admin/problem', { id: problemId });
      const data = unwrap(response);
      return adaptAdminProblemDetail(data);
    } catch (err: any) {
      try {
        const baseUrl = getMsBaseUrl();
        const res = await apiClient.get<any>(`${baseUrl}/problem/${problemId}`);
        return adaptAdminProblemDetail(res.data);
      } catch (fallbackErr: any) {
        throw err || fallbackErr;
      }
    }
  },

  updateAdminProblem: async (payload: UpdateProblemPayload): Promise<AdminProblemDetail> => {
    const baseUrl = getMsBaseUrl();
    let response;
    try {
      response = await apiClient.put<any>(`${baseUrl}/problem/${payload.id}`, payload);
    } catch (err: any) {
      // if forbidden, rethrow; if other errors, bubble up
      throw err;
    }
    const data = response.data;
    const pollingKey =
      typeof data?.polling_key === 'string'
        ? data.polling_key
        : typeof data?.data?.polling_key === 'string'
          ? data.data.polling_key
          : null;

    if (pollingKey) {
      for (let attempt = 0; attempt < 120; attempt += 1) {
        const pollingResponse = await apiClient.get<ProblemPollingStatus>(`${baseUrl}/problem/polling`, {
          params: { key: pollingKey },
        });
        const rawStatus = pollingResponse.data as any;
        const status: ProblemPollingStatus =
          rawStatus && typeof rawStatus === 'object' && rawStatus.data && typeof rawStatus.data === 'object'
            ? rawStatus.data
            : rawStatus;

        if (status.status === 'done') {
          const problemId = Number(status.problem_id ?? payload.id);
          if (!Number.isFinite(problemId) || problemId <= 0) {
            throw new Error('문제 수정은 완료되었지만 problem_id를 확인하지 못했습니다.');
          }
          const detail = await adminService.getAdminProblemDetail(problemId);
          return detail;
        }

        if (status.status === 'error') {
          throw new Error(`문제 수정 실패: ${status.error_code || '알 수 없는 오류'}`);
        }

        await wait(1000);
      }

      throw new Error('문제 수정 처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
    }

    return adaptAdminProblemDetail(data);
  },

  deleteProblem: async (id: number): Promise<void> => {
    const response = await apiClient.delete('/admin/problem', {
      params: { id },
    });
    const body = response.data;
    const hasWrapper = body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'error');
    const success = hasWrapper ? body.error === null : true;

    if (!success) {
      const detail = body?.data ?? '문제를 삭제하지 못했습니다.';
      throw new Error(typeof detail === 'string' ? detail : '문제를 삭제하지 못했습니다.');
    }
  },



  getContestProblems: async (contestId: number): Promise<Problem[]> => {
    const baseUrl = getMsBaseUrl();
    const adaptContestProblemList = (list: any[]) => list.map((entry: any) => {
      const source = entry?.problem && typeof entry.problem === 'object' ? entry.problem : entry;
      const adapted = adaptProblem(source) as Problem & { contestProblemId?: number };

      const contestProblemId = Number(entry?.id);
      if (Number.isFinite(contestProblemId) && contestProblemId > 0) {
        adapted.contestProblemId = contestProblemId;
      }

      if ((adapted.displayId == null || String(adapted.displayId).trim() === '') && entry?.display_id != null) {
        adapted.displayId = String(entry.display_id);
      }
      if ((!adapted.title || adapted.title === '제목 없음') && typeof entry?.title === 'string') {
        adapted.title = entry.title;
      }
      return adapted;
    });

    const msResponse = await apiClient.get<any[]>(`${baseUrl}/contest/${contestId}/problems`);
    const msData = msResponse.data;
    if (!Array.isArray(msData)) {
      throw new Error('대회 문제 API 응답 형식이 올바르지 않습니다.');
    }
    return adaptContestProblemList(msData);
  },

  addContestProblemFromPublic: async (contestId: number, problemId: number, displayId: string): Promise<void> => {
    const baseUrl = getMsBaseUrl();
    try {
      await apiClient.post(`${baseUrl}/contest/add_problem_from_public`, {
        contest_id: contestId,
        problem_id: problemId,
        display_id: displayId,
      });
      return;
    } catch {
      const response = await api.post('/admin/contest/add_problem_from_public', {
        contest_id: contestId,
        problem_id: problemId,
        display_id: displayId,
      });
      unwrap(response);
    }
  },

  updateContestProblems: async (contestId: number, problems: Problem[]): Promise<void> => {
    const baseUrl = getMsBaseUrl();
    const payload = problems.map((p, index) => ({
      problem_id: p.id,
      display_id: p.displayId ?? (p as any)._id ?? String(index + 1),
    }));
    await apiClient.put(`${baseUrl}/contest/${contestId}/problems`, payload);
  },

  deleteContestProblem: async (id: number): Promise<void> => {
    const response = await apiClient.delete('/admin/contest/problem', {
      params: { id },
    });
    const body = response.data;
    const hasWrapper = body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'error');
    const success = hasWrapper ? body.error === null : true;

    if (!success) {
      const detail = body?.data ?? '대회 문제를 삭제하지 못했습니다.';
      throw new Error(typeof detail === 'string' ? detail : '대회 문제를 삭제하지 못했습니다.');
    }
  },

  addWorkbookProblem: async (workbookId: number, problemId: number): Promise<void> => {
    await apiClient.post(buildWorkbookUrl('/problem'), {
      workbook_id: workbookId,
      problem_id: problemId,
    });
  },

  deleteWorkbookProblem: async (workbookId: number, problemId: number): Promise<void> => {
    await apiClient.delete(buildWorkbookUrl('/problem'), {
      params: {
        workbook_id: workbookId,
        problem_id: problemId,
      },
    });
  },

  updateWorkbook: async (workbookId: number, payload: UpdateWorkbookPayload): Promise<Workbook> => {
    return adminService.updateWorkbookMeta(workbookId, payload);
  },

  getUsers: async ({ page = 1, limit = 20, keyword }: UserListParams): Promise<AdminUserListResponse> => {
    const response = await api.get<AdminUserListResponse>('/admin/user', {
      paging: true,
      offset: (page - 1) * limit,
      limit,
      ...(keyword && keyword.trim().length > 0 ? { keyword: keyword.trim() } : {}),
    });
    const data = unwrap(response);

    const results: AdminUser[] = Array.isArray(data?.results)
      ? data.results.map((item: unknown) => {
        const adapt = item as AdminUser;
        return {
          ...adapt,
          real_tfa: adapt.two_factor_auth,
        };
      })
      : [];

    return {
      results,
      total: Number(data?.total ?? results.length),
      offset: Number(data?.offset ?? 0),
      limit: Number(data?.limit ?? limit),
    };
  },

  getUserDetail: async (userId: number): Promise<AdminUser> => {
    const response = await api.get<AdminUser | AdminUserListResponse>('/admin/user', { id: userId });
    const data = unwrap(response);

    if (typeof (data as AdminUserListResponse)?.results !== 'undefined') {
      const list = data as AdminUserListResponse;
      const first = list.results[0];
      if (!first) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }
      return {
        ...first,
        real_tfa: first?.real_tfa ?? first?.two_factor_auth,
      };
    }

    const user = data as AdminUser;
    return {
      ...user,
      real_tfa: user?.real_tfa ?? user?.two_factor_auth,
    };
  },

  updateUser: async (payload: UpdateUserPayload): Promise<AdminUser> => {
    const response = await api.put<AdminUser>('/admin/user', payload);
    const data = unwrap(response);
    return {
      ...data,
      real_tfa: data?.two_factor_auth,
    } as AdminUser;
  },

  getUserDetailFromMS: async (userId: number): Promise<{
    user_id: number;
    name: string;
    student_id: string;
    major_id: number;
  }> => {
    const baseUrl = MS_API_BASE.endsWith('/') ? MS_API_BASE.slice(0, -1) : MS_API_BASE;
    const response = await axios.get<{
      user_id: number;
      name: string;
      student_id: string;
      major_id: number;
    }>(`${baseUrl}/user/data/${userId}`, { withCredentials: true });

    return response.data;
  },

  deleteUser: async (userId: number | number[]): Promise<void> => {
    const ids = Array.isArray(userId) ? userId.join(',') : String(userId);
    const response = await apiClient.delete('/admin/user', {
      params: { id: ids },
    });

    const body = response.data;
    const hasWrapper = body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'error');
    const success = hasWrapper ? body.error === null : true;

    if (!success) {
      const detail = body?.data ?? '사용자를 삭제하지 못했습니다.';
      throw new Error(typeof detail === 'string' ? detail : '사용자를 삭제하지 못했습니다.');
    }
  },

  getJudgeServers: async (): Promise<JudgeServerListResponse> => {
    const response = await api.get<JudgeServerListResponse>('/admin/judge_server');
    const data = unwrap(response);
    const servers: JudgeServer[] = Array.isArray(data?.servers)
      ? data.servers.map((item) => ({
        ...item,
        cpu_usage: Number(item?.cpu_usage ?? 0),
        memory_usage: Number(item?.memory_usage ?? 0),
        task_number: Number(item?.task_number ?? 0),
        cpu_core: Number(item?.cpu_core ?? 0),
        is_disabled: Boolean(item?.is_disabled),
      }))
      : [];

    return {
      token: data?.token ?? '',
      servers,
    };
  },

  updateJudgeServer: async (payload: UpdateJudgeServerPayload): Promise<void> => {
    const response = await api.put('/admin/judge_server', payload);
    unwrap(response);
  },

  deleteJudgeServer: async (hostname: string): Promise<void> => {
    const response = await apiClient.delete('/admin/judge_server', {
      params: { hostname },
    });

    const body = response.data;
    const hasWrapper = body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'error');
    const success = hasWrapper ? body.error === null : true;

    if (!success) {
      const detail = body?.data ?? '채점 서버를 삭제하지 못했습니다.';
      throw new Error(typeof detail === 'string' ? detail : '채점 서버를 삭제하지 못했습니다.');
    }
  },

  checkMicroserviceHealth: async (): Promise<{ ok: boolean; latency: number; message?: string }> => {
    const target = MICRO_SERVICE_HEALTH_URL;
    const started = performance.now();
    try {
      await apiClient.get(target);
      const latency = performance.now() - started;
      return {
        ok: true,
        latency,
      };
    } catch (error: any) {
      const latency = performance.now() - started;
      return {
        ok: false,
        latency,
        message: error.message || '알 수 없는 오류입니다.',
      };
    }
  },

  getSystemMetrics: async (): Promise<SystemMetrics> => {
    const response = await apiClient.get<SystemMetrics>(`${MS_API_BASE}/monitor/judge-status`);
    const data = response.data;

    const filledHistory: Array<{ time: string; count: number }> = [];
    const now = new Date();
    const historyMap = new Map(data.history.map((item) => {
      const [utcHours, utcMinutes] = item.time.split(':').map(Number);
      const date = new Date();
      date.setUTCHours(utcHours, utcMinutes, 0, 0);

      const localHours = String(date.getHours()).padStart(2, '0');
      const localMinutes = String(date.getMinutes()).padStart(2, '0');
      return [`${localHours}:${localMinutes}`, item.count];
    }));

    for (let i = 59; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60000);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      filledHistory.push({
        time: timeStr,
        count: historyMap.get(timeStr) ?? 0,
      });
    }

    return {
      ...data,
      history: filledHistory,
    };
  },


  getOrganizations: async ({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}): Promise<{
    items: any[];
    total: number;
    page: number;
    size: number;
  }> => {
    const params = {
      page,
      size: limit,
    };
    const response = await apiClient.get<any>(buildOrganizationUrl(''), { params });
    const data = response.data;

    const items = data?.items || data?.data?.items || [];
    const total = data?.total || data?.data?.total || items.length;

    return {
      items,
      total,
      page,
      size: limit,
    };
  },

  createOrganization: async (name: string, description: string): Promise<void> => {
    await apiClient.post(buildOrganizationUrl('/'), { name, description });
  },

  updateOrganization: async (id: number, name: string, description: string): Promise<void> => {
    await apiClient.put(buildOrganizationUrl(`/${id}`), { name, description });
  },

  deleteOrganization: async (id: number): Promise<void> => {
    await apiClient.delete(buildOrganizationUrl(`/${id}`));
  },
};

const mapAdminContest = (raw: any): AdminContest => {
  const allowedRanges = Array.isArray(raw?.allowed_ip_ranges)
    ? raw.allowed_ip_ranges
    : Array.isArray(raw?.allowedIpRanges)
      ? raw.allowedIpRanges
      : [];
  const createdByRaw = raw?.created_by ?? raw?.createdBy;
  const createdBy = createdByRaw
    ? {
      id: createdByRaw.id,
      username: createdByRaw.username,
      realName: createdByRaw.real_name ?? createdByRaw.realName,
    }
    : undefined;

  return {
    id: Number(raw?.id) || 0,
    title: raw?.title ?? '',
    description: raw?.description ?? '',
    startTime: raw?.start_time ?? raw?.startTime ?? '',
    endTime: raw?.end_time ?? raw?.endTime ?? '',
    createTime: raw?.create_time ?? raw?.createTime ?? '',
    ruleType: raw?.rule_type ?? raw?.ruleType ?? 'ACM',
    visible: Boolean(raw?.visible),
    real_time_rank: Boolean(raw?.real_time_rank ?? raw?.realTimeRank),
    allowed_ip_ranges: allowedRanges,
    password: raw?.password ?? null,
    status: raw?.status,
    createdBy,
    now: raw?.now,
    languages: Array.isArray(raw?.languages) ? raw.languages : [],
    organization_id: Number(raw?.organization_id ?? raw?.organizationId ?? 0) || 0,
    organization_name: raw?.organization_name ?? raw?.organizationName ?? null,
    isOrganizationOnly: raw?.is_organization_only ?? raw?.isOrganizationOnly ?? false,
  } as AdminContest;
};

const adaptWorkbookProblem = (item: any): WorkbookProblem => {
  const problemData = adaptProblem(item?.problem);
  return {
    id: Number(item?.id) || 0,
    problemId: Number(item?.problem_id ?? item?.problemId ?? problemData?.id ?? 0) || 0,
    problem: problemData,
    order: Number(item?.display_order ?? item?.order ?? 0),
    addedTime: item?.added_time ?? item?.addedTime ?? '',
  };
};

const adaptProblem = (raw: any): Problem => {
  if (!raw || typeof raw !== 'object') {
    return {
      id: 0,
      title: '알 수 없는 문제',
      description: '',
      difficulty: 0,
      timeLimit: 0,
      memoryLimit: 0,
      createTime: '',
    };
  }

  const difficulty =
    raw?.lv ??
    raw?.level ??
    raw?.difficulty_level ??
    raw?.difficultyLevel ??
    raw?.difficulty ??
    raw?.Difficulty ??
    0;
  const rawVisibilitySources: unknown[] = [
    raw?.visible,
    raw?.is_public,
    raw?.isPublic,
    raw?.public,
    raw?.Visible,
  ];
  const resolvedVisibility = rawVisibilitySources.find((item) => item !== undefined && item !== null);
  const visible = parseBoolean(resolvedVisibility);

  return {
    id: Number(raw.id ?? raw.problem_id ?? raw.problemId ?? 0) || 0,
    displayId: raw.displayId ?? raw.display_id ?? raw._id,
    title: raw.title ?? '제목 없음',
    description: raw.description ?? '',
    difficulty: difficulty as Problem['difficulty'],
    timeLimit: Number(raw.time_limit ?? raw.timeLimit ?? 0) || 0,
    memoryLimit: Number(raw.memory_limit ?? raw.memoryLimit ?? 0) || 0,
    inputDescription: raw.input_description ?? raw.inputDescription,
    outputDescription: raw.output_description ?? raw.outputDescription,
    samples: Array.isArray(raw.samples) ? raw.samples : undefined,
    hint: raw.hint,
    createTime: raw.create_time ?? raw.createTime ?? '',
    lastUpdateTime: raw.last_update_time ?? raw.lastUpdateTime,
    tags: Array.isArray(raw.tags) ? raw.tags : undefined,
    languages: Array.isArray(raw.languages) ? raw.languages : undefined,
    createdBy: raw.created_by ?? raw.createdBy,
    myStatus: raw.my_status ?? raw.myStatus,
    solved: raw.solved,
    visible,
    isPublic: visible,
  };
};

const adaptAdminProblemDetail = (raw: any): AdminProblemDetail => {
  const difficulty =
    raw?.lv ??
    raw?.level ??
    raw?.difficulty_level ??
    raw?.difficultyLevel ??
    raw?.difficulty ??
    raw?.Difficulty ??
    0;

  const samples = Array.isArray(raw?.samples)
    ? raw.samples.map((item: any) => ({
      input: typeof item?.input === 'string' ? item.input : item?.sample_input ?? '',
      output: typeof item?.output === 'string' ? item.output : item?.sample_output ?? '',
    }))
    : [];

  const testCaseScore = Array.isArray(raw?.test_case_score)
    ? raw.test_case_score.map((item: any) => ({
      input_name: item?.input_name ?? item?.inputName ?? '',
      output_name: item?.output_name ?? item?.outputName ?? '',
      score: Number(item?.score ?? 0),
    }))
    : [];

  const languages = Array.isArray(raw?.languages)
    ? raw.languages.map((lang: any) => String(lang))
    : [];

  const tags = Array.isArray(raw?.tags)
    ? raw.tags.map((tag: any) => (typeof tag === 'string' ? tag : tag?.name)).filter(Boolean)
    : [];

  const ioModeRaw = raw?.io_mode ?? raw?.ioMode ?? { io_mode: 'standard', input: 'input.txt', output: 'output.txt' };
  const rawVisible =
    raw?.visible ??
    raw?.is_public ??
    raw?.isPublic ??
    raw?.public ??
    raw?.Visible;

  return {
    id: Number(raw?.id) || 0,
    displayId: raw?._id ?? raw?.display_id ?? raw?.displayId,
    title: raw?.title ?? '',
    description: raw?.description ?? '',
    inputDescription: raw?.input_description ?? raw?.inputDescription ?? '',
    outputDescription: raw?.output_description ?? raw?.outputDescription ?? '',
    samples,
    testCaseId: raw?.test_case_id ?? '',
    testCaseScore,
    timeLimit: Number(raw?.time_limit ?? raw?.timeLimit ?? 1000),
    memoryLimit: Number(raw?.memory_limit ?? raw?.memoryLimit ?? 256),
    languages,
    template: typeof raw?.template === 'object' && raw?.template ? raw.template : {},
    ruleType: raw?.rule_type ?? raw?.ruleType ?? 'ACM',
    ioMode: {
      io_mode: ioModeRaw?.io_mode ?? ioModeRaw?.ioMode ?? 'standard',
      input: ioModeRaw?.input ?? 'input.txt',
      output: ioModeRaw?.output ?? 'output.txt',
    },
    spj: Boolean(raw?.spj),
    spjLanguage: raw?.spj_language ?? raw?.spjLanguage ?? null,
    spjCode: raw?.spj_code ?? raw?.spjCode ?? null,
    spjCompileOk: Boolean(raw?.spj_compile_ok ?? raw?.spjCompileOk),
    visible: parseBoolean(rawVisible),
    difficulty: difficulty as AdminProblemDetail['difficulty'],
    tags,
    hint: raw?.hint ?? null,
    source: raw?.source ?? null,
    shareSubmission: parseBoolean(raw?.share_submission ?? raw?.shareSubmission),
  };
};
