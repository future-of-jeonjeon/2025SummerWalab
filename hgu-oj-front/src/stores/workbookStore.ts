import { create } from 'zustand';
import { Workbook } from '../types';

interface WorkbookFilter {
  search?: string;
  page?: number;
  limit?: number;
}

interface WorkbookStore {
  filter: WorkbookFilter;
  setFilter: (filter: Partial<WorkbookFilter>) => void;
  resetFilter: () => void;
}

export const useWorkbookStore = create<WorkbookStore>((set) => ({
  filter: {
    search: '',
    page: 1,
    limit: 20,
  },
  setFilter: (newFilter) =>
    set((state) => ({
      filter: { ...state.filter, ...newFilter },
    })),
  resetFilter: () =>
    set({
      filter: {
        search: '',
        page: 1,
        limit: 20,
      },
    }),
}));
