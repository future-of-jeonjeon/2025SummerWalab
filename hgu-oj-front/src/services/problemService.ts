import { api, apiClient, MS_API_BASE } from './api';
import { Problem, PaginatedResponse, ProblemFilter } from '../types';
import { mapDifficulty } from '../lib/difficulty';
const MICRO_PROBLEM_TAG_COUNTS_ENDPOINT = MS_API_BASE
  ? `${MS_API_BASE}/problem/tags/counts`
  : undefined;
const MICRO_PROBLEM_LIST_ENDPOINT = MS_API_BASE
  ? `${MS_API_BASE}/problem/list`
  : undefined;
const DEFAULT_PAGE_LIMIT = 50;

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

const unwrapOjResponse = <T>(payload: any): T => {
  const hasWrapper =
    payload &&
    typeof payload === 'object' &&
    Object.prototype.hasOwnProperty.call(payload, 'error') &&
    Object.prototype.hasOwnProperty.call(payload, 'data');
  if (hasWrapper) {
    if (payload.error) {
      const detail = payload.data;
      const message = typeof detail === 'string' ? detail : '요청이 실패했습니다.';
      throw new Error(message);
    }
    return payload.data as T;
  }
  return payload as T;
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
    const mappedDifficulty = mapDifficulty(p.difficulty);
    return {
      id: p.id,
      displayId: rawDisplayId ? String(rawDisplayId) : undefined,
      title: p.title,
      description: p.description || '',
      difficulty: mappedDifficulty !== '-' ? mappedDifficulty as Problem['difficulty'] : (p.difficulty as any) ?? '중',
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
  const mappedDifficulty = mapDifficulty((p as Problem).difficulty ?? (p as any).difficulty);
  return {
    ...(p as Problem),
    displayId: rawDisplayId ? String(rawDisplayId) : (p as Problem).displayId,
    difficulty: mappedDifficulty !== '-' ? mappedDifficulty as Problem['difficulty'] : ((p as Problem).difficulty ?? '중'),
    myStatus: rawStatus,
    solved,
    samples: normalizedSamples ?? (p as Problem).samples,
  } as Problem;
};

type RequestOptions = {
  signal?: AbortSignal;
};

const fetchOjProblemList = async (
  filter: ProblemFilter,
  options?: RequestOptions,
): Promise<PaginatedResponse<Problem>> => {
  const limit = filter.limit && filter.limit > 0 ? filter.limit : DEFAULT_PAGE_LIMIT;
  const page = filter.page && filter.page > 0 ? filter.page : 1;
  const offset = (page - 1) * limit;

  const params: Record<string, unknown> = {
    limit,
    offset,
  };

  const searchValue = filter.search?.trim();
  if (searchValue) {
    params.keyword = searchValue;
  }

  if (filter.difficulty) {
    params.difficulty = filter.difficulty;
  }

  const tags = (filter.tags ?? [])
    .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
    .filter((tag) => tag.length > 0);
  if (tags.length > 0) {
    // OJ 백엔드에서는 단일 태그 필터만 지원
    params.tag = tags[0];
  }

  let responseData: any;
  try {
    const response = await apiClient.get('/problem/', {
      params,
      signal: options?.signal,
    });
    responseData = unwrapOjResponse<any>(response.data);
  } catch (error: any) {
    if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
      throw error;
    }
    throw new Error(error?.message || '문제 목록을 불러오지 못했습니다.');
  }

  let items: any[] = [];
  let total = 0;
  let totalPages = 1;

  const candidateCollections = [
    responseData?.problems,
    responseData?.data?.problems,
    responseData?.results,
    responseData?.data?.results,
  ];
  const candidateTotals = [
    responseData?.total,
    responseData?.data?.total,
    responseData?.count,
    responseData?.data?.count,
  ];
  const candidatePages = [
    responseData?.total_pages,
    responseData?.totalPages,
    responseData?.data?.total_pages,
    responseData?.data?.totalPages,
  ];

  const foundCollection = candidateCollections.find((collection) => Array.isArray(collection));
  if (Array.isArray(foundCollection)) {
    items = foundCollection;
  }
  const foundTotal = candidateTotals.find((value) => typeof value === 'number');
  if (typeof foundTotal === 'number') {
    total = foundTotal;
  }
  const foundTotalPages = candidatePages.find((value) => typeof value === 'number');
  if (typeof foundTotalPages === 'number') {
    totalPages = foundTotalPages;
  } else if (limit > 0) {
    totalPages = Math.max(1, Math.ceil(total / limit));
  }

  const adapted = items.map((problem) => adaptProblem(problem));

  return {
    data: adapted,
    total,
    page,
    limit,
    totalPages,
  };
};

const buildMicroProblemListParams = (filter: ProblemFilter) => {
  const params = new URLSearchParams();
  const page = filter.page && filter.page > 0 ? filter.page : 1;
  const limit = filter.limit && filter.limit > 0 ? filter.limit : DEFAULT_PAGE_LIMIT;
  const sortField = filter.sortField ?? 'title';
  const sortMap: Record<string, string> = {
    title: 'title',
    number: 'id',
    submission: 'submission',
    accuracy: 'accuracy',
  };
  const sortOption = sortMap[sortField] ?? 'title';
  const order = (filter.sortOrder ?? 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

  params.set('page', String(page));
  params.set('page_size', String(Math.min(Math.max(limit, 1), 250)));
  params.set('sort_option', sortOption);
  params.set('order', order);

  const tags = Array.from(
    new Set(
      (filter.tags ?? [])
        .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
        .filter((tag) => tag.length > 0),
    ),
  );
  tags.forEach((tag) => params.append('tags', tag));

  return params;
};

const fetchMicroProblemList = async (
  filter: ProblemFilter,
  options?: RequestOptions,
): Promise<PaginatedResponse<Problem>> => {
  if (!MICRO_PROBLEM_LIST_ENDPOINT) {
    return fetchOjProblemList(filter, options);
  }
  const params = buildMicroProblemListParams(filter);

  try {
    const response = await apiClient.get<any>(`${MICRO_PROBLEM_LIST_ENDPOINT}?${params.toString()}`, {
      signal: options?.signal,
    });
    const payload = response.data;
    const rawProblems = Array.isArray(payload?.problems) ? payload.problems : [];
    const adapted = rawProblems.map((problem: any) => adaptProblem(problem));
    const total = Number(payload?.total ?? rawProblems.length) || 0;
    const page = Number(payload?.page ?? filter.page ?? 1) || 1;
    const limit = Number(payload?.page_size ?? filter.limit ?? DEFAULT_PAGE_LIMIT) || DEFAULT_PAGE_LIMIT;
    const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;

    return {
      data: adapted,
      total,
      page,
      limit,
      totalPages,
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    return fetchOjProblemList(filter, options);
  }
};

export const problemService = {
  // 문제 목록 조회 (기존 OJ 백엔드)
  getProblems: fetchOjProblemList,

  // 마이크로서비스 기반 문제 목록
  getMicroProblemList: fetchMicroProblemList,

  // 문제 상세 조회
  getProblem: async (identifier: string | number): Promise<Problem> => {
    const normalized = typeof identifier === 'string' ? identifier.trim() : String(identifier);
    if (!normalized) {
      throw new Error('문제를 찾기 위한 식별자가 필요합니다.');
    }
    const normalizedLower = normalized.toLowerCase();
    const numericIdentifier = Number(normalized);
    const hasNumericIdentifier = Number.isFinite(numericIdentifier);
    const pageSize = 250;
    let currentPage = 1;
    let totalPages = 1;

    do {
      const { data, total } = await problemService.getProblems({ page: currentPage, limit: pageSize });
      const match = data.find((item) => {
        const candidateValues = [
          (item as any)._id,
          (item as any).displayId,
          item.displayId,
          item.id,
        ];
        for (const value of candidateValues) {
          if (value == null) continue;
          const valueString = String(value).trim();
          if (!valueString) continue;
          if (valueString === normalized || valueString.toLowerCase() === normalizedLower) {
            return true;
          }
          if (hasNumericIdentifier && Number(value) === numericIdentifier) {
            return true;
          }
        }
        return false;
      });
      if (match) {
        return match;
      }
      totalPages = Math.max(1, Math.ceil(total / pageSize));
      currentPage += 1;
    } while (currentPage <= totalPages);

    throw new Error('문제를 찾을 수 없습니다.');
  },

  // 문제 상태 맵 조회 (id -> Problem)
  getProblemStatusMap: async (
    ids: Array<string | number>,
    options?: { pageSize?: number },
  ): Promise<Record<string, Problem>> => {
    const uniqueIds = Array.from(
      new Set(
        ids
          .map((value) => {
            if (value == null) return null;
            const stringified = typeof value === 'string' ? value.trim() : String(value);
            return stringified.length > 0 ? stringified : null;
          })
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (uniqueIds.length === 0) {
      return {};
    }

    const pageSize = options?.pageSize && options.pageSize > 0 ? options.pageSize : 250;
    const found: Record<string, Problem> = {};
    let currentPage = 1;
    let totalPages = 1;

    const idSet = new Set(uniqueIds.map((value) => value.toLowerCase()));

    while (currentPage <= totalPages && Object.keys(found).length < idSet.size) {
      const pageResult = await problemService.getProblems({ page: currentPage, limit: pageSize });
      pageResult.data.forEach((problem) => {
        const candidateValues = [
          (problem as any)._id,
          (problem as any).displayId,
          problem.displayId,
          problem.id,
        ];
        for (const value of candidateValues) {
          if (value == null) continue;
          const valueString = String(value).trim();
          if (!valueString) continue;
          const key = valueString.toLowerCase();
          if (idSet.has(key) && !found[valueString]) {
            found[valueString] = problem;
            break;
          }
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
      params.problem_id = String(identifier);
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
    const effectiveLimit = filter?.limit && filter.limit > 0 ? filter.limit : 100;
    const res = await problemService.getProblems({
      ...(filter || {}),
      limit: effectiveLimit,
      search: query,
    });
    return res;
  },

  getTagCounts: async (options?: RequestOptions): Promise<Array<{ tag: string; count: number }>> => {
    let responseData: any;
    let lastError: any;

    if (MICRO_PROBLEM_TAG_COUNTS_ENDPOINT) {
      try {
        const response = await apiClient.get<any>(MICRO_PROBLEM_TAG_COUNTS_ENDPOINT, {
          signal: options?.signal,
        });
        responseData = response.data;
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          throw error;
        }
        const status = error?.status ?? error?.response?.status;
        if (status !== 404) {
          lastError = error;
        }
      }
    }

    if (responseData === undefined) {
      try {
        const response = await apiClient.get('/problem/tags/', {
          signal: options?.signal,
        });
        responseData = unwrapOjResponse<any>(response.data);
        lastError = undefined;
      } catch (error: any) {
        if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
          throw error;
        }
        throw new Error(error?.message || '태그 정보를 불러오지 못했습니다.');
      }
    }

    if (responseData === undefined) {
      throw new Error(lastError?.message || '태그 정보를 불러오지 못했습니다.');
    }

    const collections = [
      Array.isArray(responseData) ? responseData : undefined,
      Array.isArray(responseData?.data) ? responseData.data : undefined,
      Array.isArray(responseData?.tags) ? responseData.tags : undefined,
    ];

    const source = collections.find((entry) => Array.isArray(entry)) ?? [];

    return source
      .map((item: any) => {
        const tag =
          item?.tag ??
          item?.name ??
          item?.label ??
          '';
        const count = Number(
          item?.count ??
          item?.total ??
          item?.value ??
          item?.problem_count ??
          0
        );
        if (!tag) return null;
        return { tag: String(tag), count };
      })
      .filter((item): item is { tag: string; count: number } => Boolean(item));
  },
};
