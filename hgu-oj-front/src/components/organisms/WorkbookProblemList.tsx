import React from 'react';
import { WorkbookProblem } from '../../types';
import { Button } from '../atoms/Button';
import { mapDifficulty } from '../../lib/difficulty';

interface WorkbookProblemListProps {
  problems: WorkbookProblem[];
  onProblemClick?: (problemKey: string) => void;
  onSolve?: (problemKey: string) => void;
}

export const WorkbookProblemList: React.FC<WorkbookProblemListProps> = ({
  problems,
  onProblemClick,
  onSolve,
}) => {
  const getDifficultyColor = (difficulty?: string) => {
    const label = mapDifficulty(difficulty);
    switch (label) {
      case '하':
        return 'text-green-600 bg-green-100';
      case '중':
        return 'text-yellow-600 bg-yellow-100';
      case '상':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyText = (difficulty?: string) => {
    const label = mapDifficulty(difficulty);
    if (label === '-') {
      return '정보 없음';
    }
    return label;
  };

  if (!problems.length) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 text-lg">이 문제집에는 아직 문제가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-1 text-center">순서</div>
          <div className="col-span-5">문제</div>
          <div className="col-span-2 text-center">난이도</div>
          <div className="col-span-2 text-center">시간 / 메모리</div>
          <div className="col-span-2 text-center">액션</div>
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {problems.map((item, index) => {
          const problem = item.problem;
          if (!problem) {
            return null;
          }

          const displayOrder = index + 1;
          const externalId = String(
            (problem as any)._id ?? problem._id ?? problem.displayId ?? problem.id ?? '',
          ).trim();

          return (
            <div
              key={item.id ?? `${externalId || problem.id}-${index}`}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-1 text-sm font-medium text-gray-900 text-center">
                  {displayOrder}
                </div>
                <div className="col-span-5">
                  <button
                    type="button"
                    className="text-left text-sm font-medium text-blue-600 hover:underline"
                    onClick={() => {
                      if (!externalId) return;
                      onProblemClick?.(externalId);
                    }}
                  >
                    {problem.title}
                  </button>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                    {problem.description?.replace(/<[^>]*>/g, '') || '설명이 없습니다.'}
                  </p>
                </div>
                <div className="col-span-2 text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(problem.difficulty)}`}>
                    {getDifficultyText(problem.difficulty)}
                  </span>
                </div>
                <div className="col-span-2 text-sm text-gray-500 text-center">
                  {problem.timeLimit ?? 0}ms / {problem.memoryLimit ?? 0}MB
                </div>
                <div className="col-span-2 flex justify-center">
                  <Button
                    variant="primary"
                    size="sm"
                    className="px-4"
                    onClick={() => {
                      if (!externalId) return;
                      onSolve?.(externalId);
                    }}
                  >
                    풀기
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
