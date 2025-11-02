import { Problem } from '../types';

export const normalizeProblemKey = (problem: Pick<Problem, 'displayId' | 'id'>): string => {
  if (typeof problem.displayId === 'string' && problem.displayId.trim().length > 0) {
    return problem.displayId.trim().toLowerCase();
  }
  if (typeof problem.id === 'number') {
    return String(problem.id).toLowerCase();
  }
  return '';
};

