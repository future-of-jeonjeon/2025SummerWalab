import { useQuery } from '@tanstack/react-query';
import { problemService } from '../services/problemService';
import { workbookService } from '../services/workbookService';
import { contestService } from '../services/contestService';

export const useStats = () => {
  // 문제 수 조회
  const { data: problemsData } = useQuery({
    queryKey: ['problems', 'stats'],
    queryFn: () => problemService.getProblems({ page: 1, limit: 1 }),
    staleTime: 5 * 60 * 1000, // 5분
  });

  // 문제집 수 조회
  const { data: workbooksData } = useQuery({
    queryKey: ['workbooks', 'stats'],
    queryFn: () => workbookService.getWorkbooks(),
    staleTime: 5 * 60 * 1000, // 5분
  });

  // 대회 수 조회
  const { data: contestsData } = useQuery({
    queryKey: ['contests', 'stats', 'running'],
    queryFn: () => contestService.getContests({ page: 1, limit: 1, status: '0' }),
    staleTime: 5 * 60 * 1000, // 5분
  });

  return {
    problemCount: problemsData?.total || 0,
    workbookCount: workbooksData?.length || 0,
    contestCount: contestsData?.total || 0,
  };
};
