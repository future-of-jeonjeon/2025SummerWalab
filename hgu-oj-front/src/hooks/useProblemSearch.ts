import { useCallback, useEffect, useMemo, useState } from 'react';
import { Problem } from '../types';
import { problemService } from '../services/problemService';

type SearchFetcher = (keyword: string, limit: number) => Promise<Problem[]>;

type UseProblemSearchOptions = {
  excludeIds?: Array<number | string>;
  limit?: number;
  debounceMs?: number;
  fetcher?: SearchFetcher;
};

type UseProblemSearchResult = {
  results: Problem[];
  loading: boolean;
  error: string | null;
  reset: () => void;
};

const defaultFetcher: SearchFetcher = async (keyword, limit) => {
  const response = await problemService.searchProblems(keyword, { limit });
  const items = Array.isArray(response.data) ? response.data : [];
  return items;
};

const buildExcludeKey = (ids: Array<number | string> | undefined): string => {
  if (!ids || ids.length === 0) {
    return '';
  }
  const normalized = ids.map((id) => String(id)).filter((value) => value.length > 0);
  if (normalized.length === 0) {
    return '';
  }
  const unique = Array.from(new Set(normalized));
  unique.sort();
  return unique.join(',');
};

export const useProblemSearch = (
  query: string,
  options: UseProblemSearchOptions = {}
): UseProblemSearchResult => {
  const {
    excludeIds,
    limit = 20,
    debounceMs = 300,
    fetcher: providedFetcher,
  } = options;

  const [results, setResults] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const excludeKey = useMemo(() => buildExcludeKey(excludeIds), [excludeIds]);
  const fetcher = useMemo<SearchFetcher>(() => providedFetcher ?? defaultFetcher, [providedFetcher]);

  const reset = useCallback(() => {
    setResults([]);
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      reset();
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(() => {
      fetcher(trimmed, limit)
        .then((items) => {
          if (cancelled) {
            return;
          }
          const excludeSet = excludeKey
            ? new Set(excludeKey.split(','))
            : null;
          const filtered = items.filter((problem) => {
            if (!excludeSet) {
              return true;
            }
            return !excludeSet.has(String(problem.id));
          });
          setResults(filtered.slice(0, limit));
        })
        .catch((err) => {
          if (cancelled) {
            return;
          }
          const message =
            err instanceof Error ? err.message : '문제 검색 중 오류가 발생했습니다.';
          setError(message);
          setResults([]);
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, excludeKey, limit, debounceMs, fetcher, reset]);

  return {
    results,
    loading,
    error,
    reset,
  };
};

export type { Problem };
