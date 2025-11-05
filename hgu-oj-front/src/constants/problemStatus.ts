export const PROBLEM_STATUS_LABELS = {
  solved: 'solved',
  wrong: 'wrong',
  untouched: 'untouched',
  partial: 'partial',
  attempted: 'attempted',
} as const;

export const PROBLEM_SUMMARY_LABELS = {
  total: 'total',
  solved: PROBLEM_STATUS_LABELS.solved,
  wrong: PROBLEM_STATUS_LABELS.wrong,
  untouched: PROBLEM_STATUS_LABELS.untouched,
  attempted: PROBLEM_STATUS_LABELS.attempted,
} as const;

export type ProblemStatusKey = keyof typeof PROBLEM_STATUS_LABELS;
