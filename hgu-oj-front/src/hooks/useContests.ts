import { useQuery } from '@tanstack/react-query';
import { contestService } from '../services/contestService';

export const useContests = (params?: {
  page?: number;
  limit?: number;
  keyword?: string;
  ruleType?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: ['contests', params],
    queryFn: () => contestService.getContests(params),
    staleTime: 5 * 60 * 1000, // 5분
  });
};

export const useContest = (id: number) => {
  return useQuery({
    queryKey: ['contest', id],
    queryFn: () => contestService.getContest(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5분
  });
};
