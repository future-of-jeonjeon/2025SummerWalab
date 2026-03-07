import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ContestRankEntry, Problem } from '../../../types';
import { useContestProblems } from '../../../hooks/useContests';
import { normalizeProblemStatus, WRONG_STATUS_VALUES } from '../../../utils/problemStatus';
import type { ProblemAttemptState } from '../../../utils/problemStatus';
import { ProblemStatusKey, isProblemStatusKey } from '../../../constants/problemStatus';
import { contestService } from '../../../services/contestService';

interface UseContestProblemsControllerOptions {
  contestId: number;
  canFetch: boolean;
  canViewProtectedContent: boolean;
  fallbackProblemCount?: number;
  rankEntries: ContestRankEntry[];
  authUserId?: number;
  ruleType?: string;
}

export const useContestProblemsController = ({
  contestId,
  canFetch,
  canViewProtectedContent,
  fallbackProblemCount,
  rankEntries,
  authUserId,
  ruleType,
}: UseContestProblemsControllerOptions) => {
  const {
    data: problems = [],
    isLoading,
    error,
    refetch,
  } = useContestProblems(contestId, canFetch && canViewProtectedContent);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<'title' | 'tag' | 'number'>('title');
  const [sortField, setSortField] = useState<'number' | 'submission' | 'accuracy'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | ProblemStatusKey>('all');

  const getOverrideStatus = useCallback((problem: Problem, progress: Record<string, string>) => (
    progress[String(problem.displayId ?? '').trim()]
    ?? progress[String((problem as any)._id ?? '').trim()]
    ?? progress[String(problem.displayId ?? '').trim().toLowerCase()]
    ?? progress[String((problem as any)._id ?? '').trim().toLowerCase()]
    ?? progress[String(problem.id)]
    ?? progress[String(problem.id).toLowerCase()]
  ), []);

  const resolveContestOnlyStatus = useCallback((problem: Problem, progress: Record<string, string>): ProblemAttemptState => {
    const override = getOverrideStatus(problem, progress);
    const fallback = problem.myStatus ?? (problem as any).status ?? (problem as any).my_status;
    const normalized = normalizeProblemStatus(override ?? fallback);
    if (!normalized || normalized === 'UNATTEMPTED' || normalized === 'NONE') {
      return 'untouched';
    }
    if (normalized === 'AC' || normalized === 'ACCEPTED') {
      return 'solved';
    }
    if (WRONG_STATUS_VALUES.has(normalized)) {
      return 'wrong';
    }
    if (normalized === 'TRIED' || normalized === 'ATTEMPTED') {
      return 'attempted';
    }
    return 'attempted';
  }, [getOverrideStatus]);

  const { data: myContestSubmissions } = useQuery({
    queryKey: ['my-contest-submissions', contestId, authUserId],
    queryFn: () => contestService.getContestSubmissions(contestId, { userId: authUserId, limit: 2000 }),
    enabled: Boolean(contestId && authUserId && canViewProtectedContent),
    staleTime: 15_000,
  });

  const myRankProgress = useMemo(() => {
    if (!authUserId) return {} as Record<string, string>;
    const normalizedAuthUserId = Number(authUserId);
    const entry = rankEntries.find((item) => Number(item.user?.id) === normalizedAuthUserId);
    if (!entry || !entry.submissionInfo) return {} as Record<string, string>;

    type AcmSubmissionDetail = {
      is_ac?: boolean;
      ac_time?: number | string;
      error_number?: number;
      is_first_ac?: boolean;
    };

    const result: Record<string, string> = {};
    const submissionInfo = entry.submissionInfo ?? {};
    const scoreLookup = new Map<string, number>();
    problems.forEach((problem) => {
      const fullScore = Number(problem.totalScore ?? 0);
      const candidates = [problem.displayId, (problem as any)._id, problem.id];
      candidates.forEach((candidate) => {
        if (candidate == null) return;
        const key = String(candidate).trim();
        if (!key) return;
        scoreLookup.set(key, fullScore);
        scoreLookup.set(key.toLowerCase(), fullScore);
      });
    });
    const normalizedRule = (ruleType ?? '').toUpperCase();

    const setProgress = (problemKey: string, status: string) => {
      const key = String(problemKey).trim();
      if (!key) return;
      result[key] = status;
      result[key.toLowerCase()] = status;
    };

    if (normalizedRule === 'ACM') {
      Object.entries(submissionInfo).forEach(([problemKey, info]) => {
        const detail = (typeof info === 'object' && info !== null ? info : {}) as AcmSubmissionDetail;
        if (detail.is_ac) {
          setProgress(problemKey, 'AC');
          return;
        }
        const errorCount = typeof detail.error_number === 'number' ? detail.error_number : Number(detail.error_number ?? 0);
        if (errorCount > 0) {
          setProgress(problemKey, 'WA');
        }
      });
    } else {
      Object.entries(submissionInfo).forEach(([problemKey, scoreValue]) => {
        const score = Number(scoreValue);
        if (!Number.isFinite(score)) return;
        const fullScore = scoreLookup.get(problemKey) ?? scoreLookup.get(problemKey.toLowerCase()) ?? 0;
        if (fullScore > 0 && score >= fullScore) {
          setProgress(problemKey, 'AC');
        } else if (score > 0) {
          setProgress(problemKey, 'TRIED');
        } else {
          setProgress(problemKey, 'WA');
        }
      });
    }

    return result;
  }, [authUserId, rankEntries, problems, ruleType]);

  const mySubmissionProgress = useMemo(() => {
    const progress: Record<string, string> = {};
    const items = myContestSubmissions?.data ?? [];
    if (!Array.isArray(items) || items.length === 0) return progress;

    const isAccepted = (raw: unknown) => {
      if (raw == null) return false;
      const normalized = String(raw).trim().toLowerCase();
      return normalized === '0' || normalized === 'ac' || normalized === 'accepted';
    };

    const setProgress = (rawKey: unknown, status: 'AC' | 'TRIED') => {
      if (rawKey == null) return;
      const key = String(rawKey).trim();
      if (!key) return;
      const lower = key.toLowerCase();
      const prev = progress[key] ?? progress[lower];
      if (prev === 'AC') return;
      progress[key] = status;
      progress[lower] = status;
    };

    items.forEach((item: any) => {
      const accepted = isAccepted(item?.result ?? item?.status);
      const nextStatus: 'AC' | 'TRIED' = accepted ? 'AC' : 'TRIED';
      const keys = [
        item?.problem,
        item?.problem_id,
        item?.problemId,
        item?.problem_pk,
        item?.problemPk,
      ];
      keys.forEach((k) => setProgress(k, nextStatus));
    });

    return progress;
  }, [myContestSubmissions]);

  const mergedProgress = useMemo(() => {
    const merged: Record<string, string> = { ...myRankProgress };
    Object.entries(mySubmissionProgress).forEach(([key, status]) => {
      const prev = merged[key];
      if (prev === 'AC') return;
      merged[key] = status;
    });
    return merged;
  }, [myRankProgress, mySubmissionProgress]);

  const processedContestProblems = useMemo(() => {
    if (!canViewProtectedContent || isLoading) {
      return [] as Problem[];
    }
    const items = problems ?? [];
    const query = searchQuery.trim().toLowerCase();

    const matchesSearch = (problem: Problem) => {
      if (!query) return true;
      if (searchField === 'tag') {
        const tags = problem.tags ?? [];
        return tags.some((tag) => tag.toLowerCase().includes(query));
      }
      if (searchField === 'number') {
        const identifier = (problem.displayId ?? problem._id ?? problem.id ?? '').toString().toLowerCase();
        return identifier.includes(query);
      }
      return (problem.title ?? '').toLowerCase().includes(query);
    };

    const matchesStatus = (problem: Problem) => {
      const status = resolveContestOnlyStatus(problem, mergedProgress);
      if (statusFilter === 'all') return true;
      return status === statusFilter;
    };

    const safeNumber = (value: unknown) => {
      const numeric = Number(value);
      return Number.isNaN(numeric) ? null : numeric;
    };

    const getProblemNumber = (problem: Problem) => {
      const raw = (problem.displayId ?? problem._id ?? problem.id ?? '').toString();
      const numericOnly = raw.replace(/[^0-9]/g, '');
      return {
        numeric: numericOnly ? safeNumber(numericOnly) : null,
        raw,
      };
    };

    const getAccuracy = (problem: Problem) => {
      const submissions = Number(problem.submissionNumber ?? 0);
      const accepted = Number(problem.acceptedNumber ?? 0);
      if (!submissions) return 0;
      return accepted / submissions;
    };

    const filtered = items.filter(matchesSearch).filter(matchesStatus);
    const sorted = [...filtered].sort((a, b) => {
      let result = 0;
      if (sortField === 'submission') {
        result = (a.submissionNumber ?? 0) - (b.submissionNumber ?? 0);
      } else if (sortField === 'accuracy') {
        result = getAccuracy(a) - getAccuracy(b);
      } else {
        const aNum = getProblemNumber(a);
        const bNum = getProblemNumber(b);
        if (typeof aNum.numeric === 'number' && typeof bNum.numeric === 'number') {
          result = aNum.numeric - bNum.numeric;
        } else if (typeof aNum.numeric === 'number') {
          result = -1;
        } else if (typeof bNum.numeric === 'number') {
          result = 1;
        } else {
          result = aNum.raw.localeCompare(bNum.raw, undefined, { numeric: true, sensitivity: 'base' });
        }
      }
      return sortOrder === 'desc' ? -result : result;
    });

    return sorted;
  }, [canViewProtectedContent, isLoading, problems, searchQuery, searchField, statusFilter, sortField, sortOrder, mergedProgress, resolveContestOnlyStatus]);

  const stats = useMemo(() => {
    if (!canViewProtectedContent || isLoading) {
      return { total: 0, solved: 0, wrong: 0, untouched: 0, attempted: 0 };
    }
    return (problems ?? []).reduce(
      (acc, problem) => {
        const status = resolveContestOnlyStatus(problem, mergedProgress);
        if (status === 'solved') {
          acc.solved += 1;
        } else if (status === 'wrong') {
          acc.wrong += 1;
        } else if (status === 'untouched') {
          acc.untouched += 1;
        } else {
          acc.attempted += 1;
        }
        acc.total += 1;
        return acc;
      },
      { total: 0, solved: 0, wrong: 0, untouched: 0, attempted: 0 },
    );
  }, [canViewProtectedContent, isLoading, problems, mergedProgress, resolveContestOnlyStatus]);

  const totalProblems = useMemo(() => {
    if (stats.total > 0) {
      return stats.total;
    }
    if (Array.isArray(problems) && problems.length > 0) {
      return problems.length;
    }
    if (typeof fallbackProblemCount === 'number' && fallbackProblemCount >= 0) {
      return fallbackProblemCount;
    }
    return 0;
  }, [stats.total, problems, fallbackProblemCount]);

  const solvedProblems = stats.solved;
  const wrongProblems = stats.wrong;
  const remainingProblems = Math.max(totalProblems - solvedProblems - wrongProblems, 0);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleSearchSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery((prev) => prev.trim());
  }, []);

  const handleSearchFieldChange = useCallback((value: string) => {
    const nextField = (value || 'title') as typeof searchField;
    setSearchField(nextField);
  }, []);

  const handleSortToggle = useCallback(
    (field: 'number' | 'submission' | 'accuracy') => {
      setSortOrder((prevOrder) => {
        if (sortField === field) {
          return prevOrder === 'asc' ? 'desc' : 'asc';
        }
        return 'asc';
      });
      setSortField(field);
    },
    [sortField],
  );

  const handleStatusFilterChange = useCallback((value: string) => {
    if (value === 'all') {
      setStatusFilter('all');
      return;
    }
    if (isProblemStatusKey(value)) {
      setStatusFilter(value);
    } else {
      setStatusFilter('all');
    }
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSearchField('title');
    setSortField('number');
    setSortOrder('asc');
    setStatusFilter('all');
  }, []);

  return {
    problems,
    problemsLoading: isLoading,
    problemsError: error,
    refetchProblems: refetch,
    processedContestProblems,
    myRankProgress: mergedProgress,
    stats,
    totalProblems,
    solvedProblems,
    wrongProblems,
    remainingProblems,
    searchState: { query: searchQuery, field: searchField },
    sortState: { field: sortField, order: sortOrder },
    statusFilter,
    handlers: {
      handleSearchChange,
      handleSearchSubmit,
      handleSearchFieldChange,
      handleSortToggle,
      handleStatusFilterChange,
      handleResetFilters,
    },
  };
};
