import { useCallback, useMemo, useState } from 'react';
import { Problem } from '../types';

export type SelectedProblem = {
  id: number;
  displayId?: string;
  title?: string;
};

export type AddProblemResult = {
  success: boolean;
  error?: string;
};

export type UseProblemSelectionResult = {
  selectedProblems: SelectedProblem[];
  addProblem: (problem: Problem) => AddProblemResult;
  removeProblem: (problemId: number) => void;
  clear: () => void;
  hasProblem: (problemId: number) => boolean;
  selectedIds: number[];
};

export const useProblemSelection = (
  initial: SelectedProblem[] = []
): UseProblemSelectionResult => {
  const [selectedProblems, setSelectedProblems] = useState<SelectedProblem[]>(initial);

  const selectedIds = useMemo(
    () => selectedProblems.map((problem) => problem.id),
    [selectedProblems]
  );

  const addProblem = useCallback(
    (problem: Problem): AddProblemResult => {
      const id = Number(problem?.id);
      if (!Number.isInteger(id) || id <= 0) {
        return { success: false, error: '유효한 문제를 선택하세요.' };
      }

      let added = false;
      let error: string | undefined;
      setSelectedProblems((prev) => {
        if (prev.some((item) => item.id === id)) {
          error = '이미 추가된 문제입니다.';
          return prev;
        }

        added = true;
        return [
          ...prev,
          {
            id,
            displayId: problem.displayId ?? undefined,
            title: problem.title,
          },
        ];
      });

      if (!added && error) {
        return { success: false, error };
      }

      return { success: added };
    },
    []
  );

  const removeProblem = useCallback((problemId: number) => {
    setSelectedProblems((prev) => prev.filter((problem) => problem.id !== problemId));
  }, []);

  const clear = useCallback(() => {
    setSelectedProblems([]);
  }, []);

  const hasProblem = useCallback(
    (problemId: number) => selectedProblems.some((problem) => problem.id === problemId),
    [selectedProblems]
  );

  return {
    selectedProblems,
    addProblem,
    removeProblem,
    clear,
    hasProblem,
    selectedIds,
  };
};

