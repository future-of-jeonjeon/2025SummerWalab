export const PROBLEM_STATUS_LABELS = {
  solved: '해결',
  wrong: '오답',
  untouched: '미도전',
  partial: '부분 정답',
  attempted: '시도',
} as const;

export const PROBLEM_SUMMARY_LABELS = {
  total: '전체',
  solved: PROBLEM_STATUS_LABELS.solved,
  wrong: PROBLEM_STATUS_LABELS.wrong,
  untouched: PROBLEM_STATUS_LABELS.untouched,
  attempted: PROBLEM_STATUS_LABELS.attempted,
} as const;

export type ProblemStatusKey = keyof typeof PROBLEM_STATUS_LABELS;
