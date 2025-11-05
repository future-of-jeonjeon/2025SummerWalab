import { Problem } from '../types';

export type ProblemAttemptState = 'solved' | 'wrong' | 'attempted' | 'untouched';

export const WRONG_STATUS_VALUES = new Set<string>([
  '-1',
  'WA',
  'WRONG',
  'WRONG_ANSWER',
  'WRONG ANSWER',
  'WRONGANSWER',
  'FAIL',
  'FAILED',
  'RUNTIME_ERROR',
  'RE',
  'TIME_LIMIT_EXCEEDED',
  'TLE',
  'MEMORY_LIMIT_EXCEEDED',
  'MLE',
  'OUTPUT_LIMIT',
  'OLE',
  'PRESENTATION_ERROR',
  'PE',
  'COMPILE_ERROR',
  'CE',
]);

export const normalizeProblemStatus = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const normalized = String(value).trim();
  if (!normalized) return '';
  if (normalized === '0') return 'AC';
  return normalized.toUpperCase();
};

export const resolveProblemStatus = (problem: Problem, options?: { override?: string }): ProblemAttemptState => {
  const overrideStatus = options?.override;
  const normalizedOverride = normalizeProblemStatus(overrideStatus);
  if (normalizedOverride) {
    if (normalizedOverride === 'AC' || normalizedOverride === 'ACCEPTED') {
      return 'solved';
    }
    if (WRONG_STATUS_VALUES.has(normalizedOverride)) {
      return 'wrong';
    }
    if (normalizedOverride === 'TRIED' || normalizedOverride === 'ATTEMPTED') {
      return 'attempted';
    }
    if (normalizedOverride === 'UNATTEMPTED' || normalizedOverride === 'NONE') {
      return 'untouched';
    }
  }

  const normalizedStatus = normalizeProblemStatus(problem.myStatus ?? (problem as any).my_status);

  if (problem.solved || normalizedStatus === 'AC' || normalizedStatus === 'ACCEPTED') {
    return 'solved';
  }
  if (!normalizedStatus) {
    return 'untouched';
  }
  if (WRONG_STATUS_VALUES.has(normalizedStatus)) {
    return 'wrong';
  }
  return 'attempted';
};

export const isSolvedProblem = (problem: Problem, options?: { override?: string }) => resolveProblemStatus(problem, options) === 'solved';
export const isWrongProblem = (problem: Problem, options?: { override?: string }) => resolveProblemStatus(problem, options) === 'wrong';
export const isUntouchedProblem = (problem: Problem, options?: { override?: string }) => resolveProblemStatus(problem, options) === 'untouched';
