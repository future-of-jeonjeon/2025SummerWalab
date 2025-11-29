import { useQuery } from '@tanstack/react-query';
import { contestService } from '../services/contestService';
import { contestUserService } from '../services/contestUserService';
import { ContestJoinStatus } from '../types';

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
    staleTime: 5 * 60 * 1000,
  });
};

export const useContest = (id: number) => {
  return useQuery({
    queryKey: ['contest', id],
    queryFn: () => contestService.getContest(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useContestAnnouncements = (contestId: number, enabled: boolean) => {
  return useQuery({
    queryKey: ['contest-announcements', contestId],
    queryFn: () => contestService.getContestAnnouncements(contestId),
    enabled: enabled && !!contestId,
    staleTime: 60 * 1000,
  });
};

export const useContestProblems = (contestId: number, enabled: boolean) => {
  return useQuery({
    queryKey: ['contest-problems', contestId],
    queryFn: () => contestService.getContestProblems(contestId),
    enabled: enabled && !!contestId,
    staleTime: 60 * 1000,
  });
};

export const useContestAccess = (contestId: number, enabled: boolean) => {
  return useQuery({
    queryKey: ['contest-access', contestId],
    queryFn: () => contestService.checkContestAccess(contestId),
    enabled: enabled && !!contestId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useContestRank = (contestId: number, enabled: boolean, params?: { limit?: number; offset?: number }) => {
  return useQuery({
    queryKey: ['contest-rank', contestId, params],
    queryFn: () => contestService.getContestRank(contestId, params),
    enabled: enabled && !!contestId,
    staleTime: 60 * 1000,
  });
};

export const useContestMembership = (contestId: number, enabled: boolean) => {
  return useQuery<ContestJoinStatus>({
    queryKey: ['contest-membership', contestId],
    queryFn: () => contestUserService.getStatus(contestId),
    enabled: enabled && contestId > 0,
    staleTime: 60 * 1000,
    retry: false,
  });
};
