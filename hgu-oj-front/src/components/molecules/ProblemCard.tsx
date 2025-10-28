import React from 'react';
import { Problem } from '../../types';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { mapDifficulty } from '../../lib/difficulty';

interface ProblemCardProps {
  problem: Problem;
  onSolve?: (problemId: number) => void;
  onClick?: (problemId: number) => void;
  showOrder?: boolean;
  order?: number;
}

export const ProblemCard: React.FC<ProblemCardProps> = ({ 
  problem, 
  onSolve, 
  onClick, 
  showOrder = false, 
  order 
}) => {
  const getDifficultyLabel = (difficulty: string) => {
    const label = mapDifficulty(difficulty);
    if (label === '-') {
      return '정보 없음';
    }
    return label;
  };

  const getDifficultyColor = (difficulty: string) => {
    const label = mapDifficulty(difficulty);
    switch (label) {
      case 'Easy':
        return 'text-green-600 bg-green-100';
      case 'Mid':
        return 'text-yellow-600 bg-yellow-100';
      case 'Hard':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(problem.id);
    } else if (onSolve) {
      onSolve(problem.id);
    }
  };

  return (
    <Card hover className="cursor-pointer" onClick={handleClick}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          {showOrder && order && (
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
              {order}
            </span>
          )}
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {problem.title}
          </h3>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(problem.difficulty)}`}>
          {getDifficultyLabel(problem.difficulty)}
        </span>
      </div>
      
      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
        {problem.description.replace(/<[^>]*>/g, '')}
      </p>
      
      <div className="flex justify-between items-center text-sm text-gray-500">
        <div className="flex gap-4">
          <span>시간 제한: {problem.timeLimit}ms</span>
          <span>메모리 제한: {problem.memoryLimit}MB</span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onSolve?.(problem.id);
          }}
        >
          풀기
        </Button>
      </div>
    </Card>
  );
};
