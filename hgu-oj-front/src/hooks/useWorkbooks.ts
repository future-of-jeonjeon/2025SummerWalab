import { useQuery } from '@tanstack/react-query';
import { workbookService } from '../services/workbookService';
import { WorkbookFilter } from '../stores/workbookStore';

export const useWorkbooks = (filter: WorkbookFilter) => {
  return useQuery({
    queryKey: ['workbooks', filter],
    queryFn: () => workbookService.getWorkbooks(filter),
    staleTime: 5 * 60 * 1000, // 5분
  });
};

export const useWorkbook = (id: number) => {
  return useQuery({
    queryKey: ['workbook', id],
    queryFn: () => workbookService.getWorkbook(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5분
  });
};

export const useWorkbookProblems = (id: number) => {
  return useQuery({
    queryKey: ['workbook-problems', id],
    queryFn: () => workbookService.getWorkbookProblems(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5분
  });
};
