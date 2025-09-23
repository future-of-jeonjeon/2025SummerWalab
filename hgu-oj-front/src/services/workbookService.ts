import { Problem, Workbook } from '../types';
import { mapProblem } from '../utils/problemMapper';
import { WorkbookFilter } from '../stores/workbookStore';

const MICRO_API_BASE = '/ms-api/workbook';

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

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const workbooks = await response.json();
    return workbooks as Workbook[];
  },

  getWorkbook: async (id: number): Promise<Workbook> => {
    const response = await fetch(buildUrl(`/${id}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const workbook = await response.json();
    return workbook;
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
    const response = await fetch(buildUrl(`/${id}/problems`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawProblems = await response.json();

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
