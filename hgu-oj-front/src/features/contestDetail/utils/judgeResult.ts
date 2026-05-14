import { PROBLEM_STATUS_LABELS } from '../../../constants/problemStatus';

const judgeStatusLabels: Record<number, string> = {
  [-2]: '컴파일 에러',
  [-1]: '오답',
  [0]: PROBLEM_STATUS_LABELS.solved,
  [1]: '시간 초과',
  [2]: '실행 시간 초과',
  [3]: '메모리 초과',
  [4]: '런타임 에러',
  [5]: '시스템 에러',
  [6]: '채점 대기',
  [7]: '채점 중',
  [8]: '부분 정답',
};

const judgeStatusStringLabels: Record<string, string> = {
  AC: PROBLEM_STATUS_LABELS.solved,
  ACCEPTED: PROBLEM_STATUS_LABELS.solved,
  SUCCESS: PROBLEM_STATUS_LABELS.solved,
  OK: PROBLEM_STATUS_LABELS.solved,
  WA: '오답',
  WR: '오답',
  WRONG: '오답',
  WRONG_ANSWER: '오답',
  WRONGANSWER: '오답',
  FAIL: '오답',
  FAILED: '오답',
  TLE: '시간 초과',
  TIME_LIMIT_EXCEEDED: '시간 초과',
  TIME_LIMIT: '시간 초과',
  MLE: '메모리 초과',
  MEMORY_LIMIT_EXCEEDED: '메모리 초과',
  RE: '런타임 에러',
  RUNTIME_ERROR: '런타임 에러',
  CE: '컴파일 에러',
  COMPILE_ERROR: '컴파일 에러',
  OLE: '출력 초과',
  OUTPUT_LIMIT_EXCEEDED: '출력 초과',
  PE: '출력 형식 오류',
  PRESENTATION_ERROR: '출력 형식 오류',
  PAC: '부분 정답',
  PARTIAL_ACCEPTED: '부분 정답',
  SE: '시스템 오류',
  SYSTEM_ERROR: '시스템 오류',
  PENDING: '채점 대기 중',
  JUDGING: '채점 중',
  RUNNING: '실행 중',
  SUBMITTED: '제출 완료',
  SUBMITTING: '제출 중',
  QUEUE: '채점 대기 중',
  PROCESSING: '채점 중',
};

export const getJudgeResultLabel = (resultValue: unknown): string => {
  if (resultValue == null) {
    return '-';
  }
  const numeric = Number(resultValue);
  if (!Number.isNaN(numeric) && numeric in judgeStatusLabels) {
    return judgeStatusLabels[numeric];
  }
  if (typeof resultValue === 'string') {
    const normalized = resultValue.trim().toUpperCase().replace(/\s+/g, '_');
    return judgeStatusStringLabels[normalized] ?? resultValue;
  }
  return String(resultValue);
};
