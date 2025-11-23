import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { problemService } from '../services/problemService';
import { Problem, ProblemFilter } from '../types';

// 문제 목록 조회 훅
export const useProblems = (filter: ProblemFilter) => {
  return useQuery({
    queryKey: ['problems', filter],
    queryFn: ({ signal }) => problemService.getMicroProblemList(filter, { signal }),
    enabled: true,
  });
};

// 문제 상세 조회 훅
export const useProblem = (identifier: string | number | null | undefined, options?: { enabled?: boolean }) => {
  const key =
    typeof identifier === 'number'
      ? identifier
      : typeof identifier === 'string'
        ? identifier.trim()
        : undefined;

  return useQuery({
    queryKey: ['problem', key],
    queryFn: () => {
      if (!key) {
        throw new Error('Problem identifier is required');
      }
      return problemService.getProblem(key);
    },
    enabled: (options?.enabled ?? true) && !!key,
  });
};

// 문제 검색 훅
export const useSearchProblems = (query: string, filter?: Omit<ProblemFilter, 'search'>) => {
  return useQuery({
    queryKey: ['problems', 'search', query, filter],
    queryFn: () => problemService.searchProblems(query, filter),
    enabled: !!query.trim(),
  });
};

// 문제 생성 뮤테이션
export const useCreateProblem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: problemService.createProblem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
    },
  });
};

// 문제 수정 뮤테이션
export const useUpdateProblem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, problem }: { id: number; problem: Partial<Problem> }) =>
      problemService.updateProblem(id, problem),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      queryClient.invalidateQueries({ queryKey: ['problem', id] });
    },
  });
};

// 문제 삭제 뮤테이션
export const useDeleteProblem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: problemService.deleteProblem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
    },
  });
};
