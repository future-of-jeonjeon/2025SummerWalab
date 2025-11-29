import { useCallback, useMemo, useState } from 'react';
import type { ContestRankEntry, Problem } from '../../../types';
import { useContestProblems } from '../../../hooks/useContests';
import { resolveProblemStatus } from '../../../utils/problemStatus';
import { ProblemStatusKey, isProblemStatusKey } from '../../../constants/problemStatus';

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

  const myRankProgress = useMemo(() => {
    if (!authUserId) return {} as Record<number, string>;
    const entry = rankEntries.find((item) => item.user?.id === authUserId);
    if (!entry || !entry.submissionInfo) return {} as Record<number, string>;

    type AcmSubmissionDetail = {
      is_ac?: boolean;
      ac_time?: number | string;
      error_number?: number;
      is_first_ac?: boolean;
    };

    const result: Record<number, string> = {};
    const submissionInfo = entry.submissionInfo ?? {};
    const scoreLookup = new Map<number, number>(problems.map((problem) => [problem.id, problem.totalScore ?? 0]));
    const normalizedRule = (ruleType ?? '').toUpperCase();

    if (normalizedRule === 'ACM') {
      Object.entries(submissionInfo).forEach(([problemKey, info]) => {
        const numericId = Number(problemKey);
        if (!Number.isFinite(numericId)) return;
        const detail = (typeof info === 'object' && info !== null ? info : {}) as AcmSubmissionDetail;
        if (detail.is_ac) {
          result[numericId] = 'AC';
          return;
        }
        const errorCount = typeof detail.error_number === 'number' ? detail.error_number : Number(detail.error_number ?? 0);
        if (errorCount > 0) {
          result[numericId] = 'WA';
        }
      });
    } else {
      Object.entries(submissionInfo).forEach(([problemKey, scoreValue]) => {
        const numericId = Number(problemKey);
        if (!Number.isFinite(numericId)) return;
        const score = Number(scoreValue);
        if (!Number.isFinite(score)) return;
        const fullScore = scoreLookup.get(numericId) ?? 0;
        if (fullScore > 0 && score >= fullScore) {
          result[numericId] = 'AC';
        } else if (score > 0) {
          result[numericId] = 'TRIED';
        } else {
          result[numericId] = 'WA';
        }
      });
    }

    return result;
  }, [authUserId, rankEntries, problems, ruleType]);

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
      const status = resolveProblemStatus(problem, { override: myRankProgress?.[problem.id] });
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
  }, [canViewProtectedContent, isLoading, problems, searchQuery, searchField, statusFilter, sortField, sortOrder, myRankProgress]);

  const stats = useMemo(() => {
    if (!canViewProtectedContent || isLoading) {
      return { total: 0, solved: 0, wrong: 0, untouched: 0, attempted: 0 };
    }
    return (problems ?? []).reduce(
      (acc, problem) => {
        const status = resolveProblemStatus(problem, { override: myRankProgress?.[problem.id] });
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
  }, [canViewProtectedContent, isLoading, problems, myRankProgress]);

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
    myRankProgress,
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
