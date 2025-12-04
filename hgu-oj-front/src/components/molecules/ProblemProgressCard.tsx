import React, { useMemo } from 'react';
import { Card } from '../atoms/Card';
import { ProgressBar } from '../atoms/ProgressBar';

interface ProblemProgressCardProps {
  solvedCount: number;
  totalCount: number;
  isLoading?: boolean;
  error?: unknown;
  className?: string;
}

const toMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
};

export const ProblemProgressCard: React.FC<ProblemProgressCardProps> = ({
  solvedCount,
  totalCount,
  isLoading,
  error,
  className,
}) => {
  const { percentage, remainingProblems, normalizedTotal } = useMemo(() => {
    const total = Number.isFinite(totalCount) ? Math.max(0, totalCount) : 0;
    const solved = Number.isFinite(solvedCount) ? Math.max(0, solvedCount) : 0;
    const normalized = Math.max(total, solved);
    const computedPercentage = normalized > 0 ? Math.round((solved / normalized) * 100) : 0;
    const remaining = Math.max(total - solved, 0);
    return {
      percentage: computedPercentage,
      remainingProblems: remaining,
      normalizedTotal: normalized,
    };
  }, [solvedCount, totalCount]);

  if (isLoading) {
    return (
      <Card className={`p-6 text-gray-500 ${className ?? ''}`.trim()}>
        문제 진행도를 불러오는 중입니다...
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 text-red-500 ${className ?? ''}`.trim()}>
        문제 진행도를 불러오지 못했습니다: {toMessage(error, '')}
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className ?? ''}`.trim()}>
      <div className="flex flex-col gap-5 h-full justify-between">
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-600">총 풀이 진행도</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{percentage}%</p>
          <p className="text-sm text-gray-500">
            {Math.max(0, solvedCount)} / {Math.max(0, totalCount)} 문제 해결
          </p>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <ProgressBar value={solvedCount} max={normalizedTotal} />
        </div>

        <div className="text-xs text-gray-500 text-right">
          {remainingProblems > 0 ? (
            <>남은 문제 {remainingProblems}개</>
          ) : (
            <span className="font-medium text-emerald-600">모든 문제를 해결했습니다!</span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ProblemProgressCard;
