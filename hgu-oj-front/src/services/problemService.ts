import { api } from './api';
import { Problem, PaginatedResponse, ProblemFilter } from '../types';

const normalizeStatusValue = (status: any): string | undefined => {
  if (status === null || status === undefined) return undefined;
  const normalized = String(status).trim();
  if (normalized.length === 0) return undefined;
  return normalized;
};

const isAcceptedStatus = (status: any): boolean => {
  const normalized = normalizeStatusValue(status);
  if (!normalized) return false;
  const upper = normalized.toUpperCase();
  return upper === 'AC' || upper === 'ACCEPTED' || upper === '0';
};

const adaptSamples = (samples: any): Array<{ input: string; output: string }> | undefined => {
  if (!Array.isArray(samples)) return undefined;
  const adapted = samples
    .map((sample: any) => {
      const input = typeof sample?.input === 'string'
        ? sample.input
        : typeof sample?.sample_input === 'string'
          ? sample.sample_input
          : '';
      const output = typeof sample?.output === 'string'
        ? sample.output
        : typeof sample?.sample_output === 'string'
          ? sample.sample_output
          : '';
      if (!input && !output) {
        return undefined;
      }
      return { input, output };
    })
    .filter((entry): entry is { input: string; output: string } => !!entry);
  return adapted.length > 0 ? adapted : undefined;
};

const normalizeTags = (value: any): string[] | undefined => {
  if (!value) return undefined;
  const source = Array.isArray(value) ? value : [value];
  const tags = source
    .map((tag) => {
      if (!tag) return undefined;
      if (typeof tag === 'string') return tag;
      if (typeof tag === 'object') {
        if ('name' in tag && tag.name) return String(tag.name);
        if ('tag' in tag && tag.tag) return String(tag.tag);
        if ('tagName' in tag && tag.tagName) return String(tag.tagName);
        if ('value' in tag && tag.value) return String(tag.value);
      }
      return undefined;
    })
    .filter((tag): tag is string => Boolean(tag));
  return tags.length > 0 ? tags : undefined;
};

// 적응형 매퍼: 마이크로서비스 또는 OJ 백엔드 형태 모두 지원
const adaptProblem = (p: any): Problem => {
  if (!p) {
    return {
      id: 0,
      title: '',
      description: '',
      difficulty: 'Low',
      timeLimit: 0,
      memoryLimit: 0,
      createTime: '',
    } as Problem;
  }
  // Detect micro-service schema (snake_case)
  const isMicro = Object.prototype.hasOwnProperty.call(p, 'time_limit');
  const rawDisplayId = p?._id ?? p?.display_id ?? p?.displayId ?? p?.id;
  if (isMicro) {
    return {
      id: p.id,
      displayId: rawDisplayId ? String(rawDisplayId) : undefined,
      title: p.title,
      description: p.description || '',
      difficulty: (p.difficulty as any) || 'Low',
      timeLimit: p.time_limit,
      memoryLimit: p.memory_limit,
      // best-effort extra stats mapping
      submissionNumber: p.submission_number,
      acceptedNumber: p.accepted_number,
      inputDescription: p.input_description || undefined,
      outputDescription: p.output_description || undefined,
      samples: adaptSamples(p.samples),
      hint: p.hint || undefined,
      createTime: p.create_time,
      lastUpdateTime: p.last_update_time,
      tags: normalizeTags(
        p.tags
        ?? p.problem_tags
        ?? p.problemTags
        ?? p.tag_list
        ?? p.tagList,
      ),
      languages: p.languages || undefined,
      createdBy: p.created_by || undefined,
      myStatus: normalizeStatusValue(p.my_status ?? p.myStatus),
      solved: isAcceptedStatus(p.my_status ?? p.myStatus),
    } as Problem;
  }
  // Assume already in frontend camelCase schema
  const rawStatus = normalizeStatusValue(p.my_status ?? p.myStatus ?? (p as any).myStatus);
  const solved = rawStatus !== undefined ? isAcceptedStatus(rawStatus) : p.solved;
  const normalizedSamples = adaptSamples(p.samples ?? (p as any).Samples);
  return {
    ...(p as Problem),
    displayId: rawDisplayId ? String(rawDisplayId) : (p as Problem).displayId,
    myStatus: rawStatus,
    solved,
    samples: normalizedSamples ?? (p as Problem).samples,
  } as Problem;
};

export const problemService = {
  // 문제 목록 조회
  getProblems: async (filter: ProblemFilter): Promise<PaginatedResponse<Problem>> => {
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 50;
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const params: Record<string, unknown> = {
      limit,
      offset: (page - 1) * limit,
    };
    const searchValue = filter.search?.trim();
    if (searchValue) {
      if (filter.searchField === 'tag') {
        params.tag = searchValue;
      } else {
        params.keyword = searchValue;
        params.search_field = filter.searchField ?? 'title';
      }
    }
    if (filter.difficulty) params.difficulty = filter.difficulty;
    if (filter.sortField) params.sort_field = filter.sortField;
    if (filter.sortOrder) params.sort_order = filter.sortOrder;

    const response = await api.get<any>('/problem', params);
    if (!response.success) {
      throw new Error(response.message || '문제 목록을 불러오지 못했습니다.');
    }

    const raw = response.data as any;
    let items: any[] = [];
    let total = 0;
    if (Array.isArray(raw)) {
      items = raw;
      total = raw.length;
    } else if (raw && Array.isArray(raw.results)) {
      items = raw.results;
      total = Number(raw.total ?? raw.results.length);
    } else {
      items = [];
      total = 0;
    }

    const adapted = items.map(adaptProblem);
    return {
      data: adapted,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil((total || adapted.length) / limit)),
    };
  },

  // 문제 상세 조회
  getProblem: async (id: number): Promise<Problem> => {
    const pageSize = 250;
    let currentPage = 1;
    let totalPages = 1;

    do {
      const { data, total } = await problemService.getProblems({ page: currentPage, limit: pageSize });
      const match = data.find((item) => item.id === id);
      if (match) {
        return match;
      }
      totalPages = Math.max(1, Math.ceil(total / pageSize));
      currentPage += 1;
    } while (currentPage <= totalPages);

    throw new Error('문제를 찾을 수 없습니다.');
  },

  // 문제 상태 맵 조회 (id -> Problem)
  getProblemStatusMap: async (ids: number[], options?: { pageSize?: number }): Promise<Record<number, Problem>> => {
    const uniqueIds = Array.from(new Set(ids.filter((value) => Number.isFinite(value))));
    if (uniqueIds.length === 0) {
      return {};
    }

    const pageSize = options?.pageSize && options.pageSize > 0 ? options.pageSize : 250;
    const found: Record<number, Problem> = {};
    let currentPage = 1;
    let totalPages = 1;

    const idSet = new Set(uniqueIds);

    while (currentPage <= totalPages && Object.keys(found).length < idSet.size) {
      const pageResult = await problemService.getProblems({ page: currentPage, limit: pageSize });
      pageResult.data.forEach((problem) => {
        if (idSet.has(problem.id)) {
          found[problem.id] = problem;
        }
      });

      const derivedTotalPages = Number.isFinite(pageResult.totalPages) && pageResult.totalPages > 0
        ? pageResult.totalPages
        : 1;
      totalPages = derivedTotalPages;
      if (pageResult.data.length === 0) {
        break;
      }
      currentPage += 1;
    }

    return found;
  },

  getContestProblem: async (contestId: number, identifier: string | number): Promise<Problem> => {
    const params: Record<string, unknown> = {
      contest_id: contestId,
    };

    if (typeof identifier === 'number' && Number.isFinite(identifier)) {
      params.problem_id = identifier;
    } else if (typeof identifier === 'string' && identifier.trim().length > 0) {
      params.problem_id = identifier.trim();
    }

    const response = await api.get<any>('/contest/problem', params);
    if (!response.success) {
      throw new Error(response.message || '대회 문제를 불러오지 못했습니다.');
    }

    const body = response.data;
    let rawProblem: any | undefined;

    const matchFromCollection = (collection: any[]): any | undefined => {
      const targetId = typeof identifier === 'number' ? identifier : undefined;
      const targetDisplayId = typeof identifier === 'string' ? identifier.trim() : undefined;
      return collection.find((item) => {
        if (!item) return false;
        if (targetId != null && Number(item.id) === Number(targetId)) {
          return true;
        }
        if (targetDisplayId) {
          const candidate = item.display_id ?? item._id ?? item.displayId ?? item.id;
          if (candidate != null && String(candidate).trim() === targetDisplayId) {
            return true;
          }
        }
        return false;
      }) ?? collection[0];
    };

    if (Array.isArray(body)) {
      rawProblem = matchFromCollection(body);
    } else if (body && Array.isArray(body.results)) {
      rawProblem = matchFromCollection(body.results);
    } else if (body && typeof body === 'object' && Object.keys(body).length) {
      rawProblem = body;
    }

    if (!rawProblem) {
      throw new Error('대회 문제를 찾을 수 없습니다.');
    }

    return adaptProblem(rawProblem);
  },

  // 문제 생성 (관리자)
  createProblem: async (problem: Omit<Problem, 'id' | 'createdAt' | 'updatedAt'>): Promise<Problem> => {
    const response = await api.post<Problem>('/problem', problem);
    return response.data;
  },

  // 문제 수정 (관리자)
  updateProblem: async (id: number, problem: Partial<Problem>): Promise<Problem> => {
    const response = await api.put<Problem>(`/problem/${id}`, problem);
    return response.data;
  },

  // 문제 삭제 (관리자)
  deleteProblem: async (id: number): Promise<void> => {
    await api.delete(`/problem/${id}`);
  },

  // 문제 검색
  searchProblems: async (query: string, filter?: Omit<ProblemFilter, 'search'>): Promise<PaginatedResponse<Problem>> => {
    // OJ에서는 /problem?keyword= 로 검색 지원
    const res = await problemService.getProblems({ ...(filter || {}), search: query, limit: 100 });
    return res;
  },
};
