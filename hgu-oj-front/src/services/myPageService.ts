import { api, MS_API_BASE } from './api';
import {
  HeatmapEntry,
  MyProfile,
  MySolvedProblem,
  MyWrongProblem,
} from '../types';

type RawProfile = Record<string, any>;

interface SubmissionRecord {
  id: string;
  problemDisplayId: string;
  result: number;
  createTime: string;
}

interface ProblemSummary {
  id: number;
  displayId: string;
  title: string;
  difficulty?: string;
}

interface ProblemStatusEntry {
  displayId: string;
  numericId?: number;
  status?: number;
}

export interface ContestHistoryEntry {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  ruleType: string;
  rank?: number;
  status: number;
  totalParticipants?: number;
}

interface Cached<T> {
  data: T;
  fetchedAt: number;
}

const PROFILE_CACHE_TTL = 60 * 1000;
const SUBMISSION_CACHE_TTL = 30 * 1000;
const MAX_SUBMISSION_PAGE_SIZE = 200;
const JUDGE_STATUS_ACCEPTED = 0;

let profileCache: Cached<RawProfile> | null = null;
let submissionsCache: Cached<SubmissionRecord[]> | null = null;
const problemCache = new Map<string, ProblemSummary>();

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const toString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
};

const pad2 = (value: number): string => String(value).padStart(2, '0');

const formatDateKey = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const parseDateString = (value: string): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const fetchProfile = async (forceRefresh = false): Promise<RawProfile> => {
  if (!forceRefresh && profileCache && Date.now() - profileCache.fetchedAt < PROFILE_CACHE_TTL) {
    return profileCache.data;
  }
  const response = await api.get<any>('/profile');
  if (!response.success) {
    throw new Error(response.message ?? '프로필 정보를 불러오지 못했습니다.');
  }
  const payload = response.data ?? {};
  profileCache = { data: payload, fetchedAt: Date.now() };
  return payload;
};

const fetchSubmissions = async (forceRefresh = false): Promise<SubmissionRecord[]> => {
  if (!forceRefresh && submissionsCache && Date.now() - submissionsCache.fetchedAt < SUBMISSION_CACHE_TTL) {
    return submissionsCache.data;
  }

  let offset = 0;
  let total = Infinity;
  const collected: SubmissionRecord[] = [];

  while (offset < total) {
    const response = await api.get<any>('/submissions', {
      limit: MAX_SUBMISSION_PAGE_SIZE,
      offset,
      myself: '1',
    });
    if (!response.success) {
      throw new Error(response.message ?? '제출 기록을 불러오지 못했습니다.');
    }

    const body = response.data ?? {};
    const results: any[] = Array.isArray(body?.results)
      ? body.results
      : Array.isArray(body)
        ? body
        : [];
    total = toNumber(body?.total, offset + results.length);

    for (const item of results) {
      const displayId = toString(item?.problem ?? item?.problem_id ?? item?.problemId ?? '', '');
      const createTime =
        toString(item?.create_time ?? item?.createTime ?? item?.created_at ?? '', '');
      if (!displayId || !createTime) {
        continue;
      }
      collected.push({
        id: toString(item?.id ?? item?.submission_id ?? item?.submissionId ?? '', ''),
        problemDisplayId: displayId,
        result: toNumber(item?.result, NaN),
        createTime,
      });
    }

    if (results.length < MAX_SUBMISSION_PAGE_SIZE) {
      break;
    }
    offset += MAX_SUBMISSION_PAGE_SIZE;
  }

  submissionsCache = { data: collected, fetchedAt: Date.now() };
  return collected;
};

const collectProblemStatuses = (profile: RawProfile): ProblemStatusEntry[] => {
  const entries = new Map<string, ProblemStatusEntry>();

  const processProblems = (problems: any) => {
    if (!problems || typeof problems !== 'object') return;
    Object.entries<any>(problems).forEach(([numericId, value]) => {
      if (!value || typeof value !== 'object') return;
      const displayId = toString(value._id ?? value.display_id ?? value.displayId ?? numericId, numericId);
      const status = value.status != null ? Number(value.status) : undefined;
      const parsedNumericId = Number(numericId);
      const stored = entries.get(displayId);
      if (!stored) {
        entries.set(displayId, {
          displayId,
          numericId: Number.isFinite(parsedNumericId) ? parsedNumericId : undefined,
          status,
        });
      } else {
        if (stored.numericId === undefined && Number.isFinite(parsedNumericId)) {
          stored.numericId = parsedNumericId;
        }
        // If existing status is not AC, and new status is AC, update it.
        // Or if new status is defined, overwrite?
        // Usually AC (0) is the best status.
        if (stored.status !== JUDGE_STATUS_ACCEPTED && status === JUDGE_STATUS_ACCEPTED) {
          stored.status = status;
        } else if (stored.status === undefined && status !== undefined) {
          stored.status = status;
        }
      }
    });
  };

  processProblems(profile?.acm_problems_status?.problems);
  processProblems(profile?.oi_problems_status?.problems);
  // Exclude contest problems as per user request
  // processProblems(profile?.acm_problems_status?.contest_problems);
  // processProblems(profile?.oi_problems_status?.contest_problems);

  return Array.from(entries.values());
};

const summarizeSubmissions = (submissions: SubmissionRecord[]) => {
  // submissions are returned in descending order already, so first occurrence is latest.
  const byProblem = new Map<string, { lastResult: number; lastTime: string }>();
  for (const submission of submissions) {
    const key = submission.problemDisplayId;
    if (!key || byProblem.has(key)) continue;
    const date = parseDateString(submission.createTime);
    if (!date) continue;
    byProblem.set(key, {
      lastResult: submission.result,
      lastTime: submission.createTime,
    });
  }
  return byProblem;
};

const collectWrongProblemEntries = (
  profileRaw: RawProfile,
  submissionSummary: Map<string, { lastResult: number; lastTime: string }>,
): Array<{ entry: ProblemStatusEntry; lastTime?: string }> => {
  const wrongMap = new Map<string, ProblemStatusEntry>();
  const statuses = collectProblemStatuses(profileRaw);

  for (const entry of statuses) {
    if (entry.status !== undefined && entry.status === JUDGE_STATUS_ACCEPTED) {
      continue;
    }
    const summary = submissionSummary.get(entry.displayId);
    // Only include if it exists in regular submissions and is not AC
    if (summary && summary.lastResult !== JUDGE_STATUS_ACCEPTED) {
      wrongMap.set(entry.displayId, entry);
    }
  }

  // Removed the loop that adds from submissionSummary directly, 
  // to avoid adding contest problems that are not in the regular problem profile.

  return Array.from(wrongMap.entries()).map(([displayId, entry]) => ({
    entry,
    lastTime: submissionSummary.get(displayId)?.lastTime,
  }));
};

const ensureProblemDetail = async (displayId: string): Promise<ProblemSummary | null> => {
  const cached = problemCache.get(displayId);
  if (cached) {
    return cached;
  }
  try {
    const response = await api.get<any>('/problem', { problem_id: displayId });
    if (!response.success) {
      // If problem doesn't exist or error, return null to skip it
      return null;
    }
    const raw = response.data ?? {};
    const summary: ProblemSummary = {
      id: toNumber(raw?.id ?? raw?.problem_id ?? raw?.problemId, 0),
      displayId: toString(raw?._id ?? raw?.display_id ?? raw?.displayId ?? displayId, displayId),
      title: toString(raw?.title ?? raw?.name ?? `문제 ${displayId}`, `문제 ${displayId}`),
      difficulty: raw?.difficulty ? String(raw.difficulty) : undefined,
    };
    problemCache.set(summary.displayId, summary);
    return summary;
  } catch (e) {
    return null;
  }
};

const calculateStreak = (submissions: SubmissionRecord[]): number => {
  const dateSet = new Set<string>();
  for (const submission of submissions) {
    const date = parseDateString(submission.createTime);
    if (!date) continue;
    dateSet.add(formatDateKey(date));
  }
  if (dateSet.size === 0) {
    return 0;
  }

  let streak = 0;
  const today = new Date();
  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  while (streak < 365) {
    const key = formatDateKey(cursor);
    if (!dateSet.has(key)) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const buildHeatmap = (
  submissions: SubmissionRecord[],
  params?: { year?: number; months?: number },
): HeatmapEntry[] => {
  const bucket = new Map<string, number>();

  for (const submission of submissions) {
    const date = parseDateString(submission.createTime);
    if (!date) continue;
    if (params?.months) {
      const end = new Date();
      const start = new Date(end);
      start.setMonth(start.getMonth() - params.months + 1);
      start.setDate(1);
      if (date < start || date > end) {
        continue;
      }
    } else if (params?.year) {
      if (date.getFullYear() !== params.year) continue;
    }
    const key = formatDateKey(date);
    bucket.set(key, (bucket.get(key) ?? 0) + 1);
  }

  return Array.from(bucket.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
};

const paginate = <T>(items: T[], page: number, pageSize: number): T[] => {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

export const myPageService = {
  getMyProfile: async (): Promise<MyProfile> => {
    const profileRaw = await fetchProfile(true); // Force refresh
    const submissions = await fetchSubmissions(true); // Force refresh
    const streak = calculateStreak(submissions);

    const user = profileRaw?.user ?? {};

    const submissionSummary = summarizeSubmissions(submissions);

    // Calculate solvedCount from regular problems only, verified by submission history
    const statuses = collectProblemStatuses(profileRaw);
    const solvedCount = statuses.filter(s =>
      s.status === JUDGE_STATUS_ACCEPTED &&
      submissionSummary.get(s.displayId)?.lastResult === JUDGE_STATUS_ACCEPTED
    ).length;

    const wrongEntries = collectWrongProblemEntries(profileRaw, submissionSummary);
    // wrongCount is just the length of wrongEntries (which are regular problems that are not AC)
    const wrongCount = wrongEntries.length;

    return {
      id: toNumber(user?.id ?? profileRaw?.id, 0),
      username: toString(user?.username ?? profileRaw?.username, 'user'),
      avatarUrl: toString(profileRaw?.avatar ?? user?.avatar ?? '', ''),
      solvedCount,
      wrongCount,
      streak,
      displayName: toString(profileRaw?.real_name ?? user?.real_name ?? '', '') || undefined,
    };
  },

  getMyHeatmap: async (params: { months?: number; year?: number; month?: number }): Promise<HeatmapEntry[]> => {
    const submissions = await fetchSubmissions(true);
    return buildHeatmap(submissions, params);
  },

  getSolvedProblems: async (
    params?: { page?: number; pageSize?: number },
  ): Promise<{ items: MySolvedProblem[]; total: number }> => {
    const pageSize = params?.pageSize && params.pageSize > 0 ? params.pageSize : 20;
    const page = params?.page && params.page > 0 ? params.page : 1;

    const profileRaw = await fetchProfile(true);
    const submissions = await fetchSubmissions(true);
    const submissionSummary = summarizeSubmissions(submissions);
    const statuses = collectProblemStatuses(profileRaw)
      .filter((entry) =>
        entry.status === JUDGE_STATUS_ACCEPTED &&
        submissionSummary.get(entry.displayId)?.lastResult === JUDGE_STATUS_ACCEPTED
      );

    const sorted = [...statuses].sort((a, b) => {
      const aTime = submissionSummary.get(a.displayId)?.lastTime ?? '';
      const bTime = submissionSummary.get(b.displayId)?.lastTime ?? '';
      return aTime > bTime ? -1 : 1;
    });

    const paginated = paginate(sorted, page, pageSize);
    const details = await Promise.all(
      paginated.map((entry) => ensureProblemDetail(entry.displayId)),
    );
    const results: MySolvedProblem[] = details
      .filter((detail): detail is ProblemSummary => detail !== null)
      .map((detail) => ({
        id: detail.id,
        title: detail.title,
        difficulty: detail.difficulty,
      }));

    return {
      items: results,
      total: sorted.length,
    };
  },

  getWrongProblems: async (
    params?: { page?: number; pageSize?: number },
  ): Promise<{ items: MyWrongProblem[]; total: number }> => {
    const pageSize = params?.pageSize && params.pageSize > 0 ? params.pageSize : 20;
    const page = params?.page && params.page > 0 ? params.page : 1;

    const profileRaw = await fetchProfile();
    const submissions = await fetchSubmissions();
    const submissionSummary = summarizeSubmissions(submissions);

    const enriched = collectWrongProblemEntries(profileRaw, submissionSummary).map((item) => ({
      entry: item.entry,
      lastTime: item.lastTime ?? '',
    }));

    enriched.sort((a, b) => {
      if (a.lastTime === b.lastTime) return 0;
      return a.lastTime > b.lastTime ? -1 : 1;
    });

    const paginated = paginate(enriched, page, pageSize);
    const details = await Promise.all(
      paginated.map((item) => ensureProblemDetail(item.entry.displayId)),
    );
    const items: MyWrongProblem[] = details
      .map((detail, idx): MyWrongProblem | null => {
        if (!detail) return null;
        const { lastTime } = paginated[idx];
        return {
          id: detail.id,
          title: detail.title,
          lastTriedAt: lastTime || undefined,
        };
      })
      .filter((item): item is MyWrongProblem => item !== null);

    return {
      items,
      total: enriched.length,
    };
  },

  getParticipatedContests: async (): Promise<ContestHistoryEntry[]> => {
    const response = await api.get<any>(`${MS_API_BASE}/contest/participated`);
    if (!response.success) {
      throw new Error(response.message ?? '대회 기록을 불러오지 못했습니다.');
    }
    const data = response.data ?? [];
    // Assuming the MS API returns a list of contests directly or wrapped in a structure
    // Adjust mapping based on actual MS API response structure if known, otherwise assume standard list
    const items = Array.isArray(data) ? data : (data.results || data.items || []);

    return items.map((item: any) => {
      // Handle various possible structures for Contest ID
      const rawId = item.id ?? item.contest_id ?? item.contestId ?? item.contest?.id;
      const id = toNumber(rawId);

      // Handle nested contest object if present
      const title = toString(item.title ?? item.contest?.title);
      const startTime = toString(item.start_time ?? item.startTime ?? item.contest?.start_time ?? item.contest?.startTime);
      const endTime = toString(item.end_time ?? item.endTime ?? item.contest?.end_time ?? item.contest?.endTime);
      const ruleType = toString(item.rule_type ?? item.ruleType ?? item.contest?.rule_type ?? item.contest?.ruleType);
      const status = toNumber(item.status ?? item.contest?.status);

      return {
        id,
        title,
        startTime,
        endTime,
        ruleType,
        rank: item.rank ? toNumber(item.rank) : undefined,
        status,
      };
    });
  },
};

export type {
  MyProfile,
  HeatmapEntry,
  MySolvedProblem,
  MyWrongProblem,
};
