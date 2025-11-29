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

export const getJudgeResultLabel = (resultValue: unknown): string => {
  if (resultValue == null) {
    return '-';
  }
  const numeric = Number(resultValue);
  if (!Number.isNaN(numeric) && numeric in judgeStatusLabels) {
    return judgeStatusLabels[numeric];
  }
  if (typeof resultValue === 'string') {
    return resultValue;
  }
  return String(resultValue);
};
