import { useQuery } from '@tanstack/react-query';
import { problemService } from '../services/problemService';

const STALE_TIME = 5 * 60 * 1000;

export const useProblemCount = () => {
  const query = useQuery({
    queryKey: ['problems', 'total-count'],
    queryFn: () => problemService.getProblemCount(),
    staleTime: STALE_TIME,
  });

  const total = query.data ?? 0;

  return {
    total,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
};
