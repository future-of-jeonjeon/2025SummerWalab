import { create } from 'zustand';
import { Problem, ProblemFilter } from '../types';

interface ProblemState {
  problems: Problem[];
  currentProblem: Problem | null;
  filter: ProblemFilter;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
}

interface ProblemActions {
  setProblems: (problems: Problem[]) => void;
  setCurrentProblem: (problem: Problem | null) => void;
  setFilter: (filter: Partial<ProblemFilter>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTotalCount: (count: number) => void;
  clearError: () => void;
}

export const useProblemStore = create<ProblemState & ProblemActions>((set) => ({
  // State
  problems: [],
  currentProblem: null,
  filter: {
    page: 1,
    limit: 20,
    searchField: 'title',
    sortField: 'number',
    sortOrder: 'asc',
  },
  totalCount: 0,
  isLoading: false,
  error: null,

  // Actions
  setProblems: (problems: Problem[]) => {
    set({ problems });
  },

  setCurrentProblem: (problem: Problem | null) => {
    set({ currentProblem: problem });
  },

  setFilter: (filter: Partial<ProblemFilter>) => {
    set((state) => ({
      filter: { ...state.filter, ...filter },
    }));
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  setTotalCount: (count: number) => {
    set({ totalCount: count });
  },

  clearError: () => {
    set({ error: null });
  },
}));
