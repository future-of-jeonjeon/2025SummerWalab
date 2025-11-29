import { Problem, Workbook } from '../types';
import { apiClient, MS_API_BASE } from './api';
import { mapProblem } from '../utils/problemMapper';
import { WorkbookFilter } from '../stores/workbookStore';

const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');



const MICRO_API_BASE = `${trimTrailingSlash(MS_API_BASE)}/workbook`;

const buildUrl = (path = '', params?: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }
  const query = searchParams.toString();
  return `${MICRO_API_BASE}${path}${query ? `?${query}` : ''}`;
};

export const workbookService = {
  getWorkbooks: async (filter?: WorkbookFilter) => {
    const url = buildUrl('/', {
      search: filter?.search,
      limit: filter?.limit,
    });

    const response = await apiClient.get<Workbook[]>(url);
    return response.data;
  },

  getWorkbook: async (id: number): Promise<Workbook> => {
    const response = await apiClient.get<Workbook>(buildUrl(`/${id}`));
    return response.data;
  },

  getWorkbookProblems: async (id: number): Promise<{
    success: boolean;
    data: Array<{
      id: number;
      problemId?: number;
      problem: Problem;
      order: number;
      addedTime: string;
    }>;
    workbook: Workbook;
  }> => {
    const response = await apiClient.get<any[]>(buildUrl(`/${id}/problems`));
    const rawProblems = response.data;

    const normalizedProblems = (Array.isArray(rawProblems) ? rawProblems : [])
      .map((item: any) => {
        const rawProblem = item.problem
          ? {
            ...item.problem,
            tags: item.problem?.tags ?? item.tags ?? item.problem_tags ?? item.problemTags,
          }
          : undefined;

        return {
          id: item.id,
          problemId: item.problem_id ?? item.problemId,
          problem: rawProblem ? mapProblem(rawProblem) : undefined,
          order: item.order,
          addedTime: item.added_time ?? item.addedTime ?? '',
        };
      })
      .filter((item: any) => !!item.problem) as Array<{
        id: number;
        problemId?: number;
        problem: Problem;
        order: number;
        addedTime: string;
      }>;

    const workbook = await workbookService.getWorkbook(id);

    return {
      success: true,
      data: normalizedProblems,
      workbook,
    };
  },
};
