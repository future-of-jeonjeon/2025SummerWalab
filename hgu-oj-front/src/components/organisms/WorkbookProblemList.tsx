import React from 'react';
import { Problem } from '../../types';
import { resolveProblemStatus } from '../../utils/problemStatus';

// icons
const CheckCircleIcon = () => (
  <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const ErrorCircleIcon = () => (
  <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

const EmptyCircleIcon = () => (
  <svg className="w-6 h-6 text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <circle cx="12" cy="12" r="9" strokeWidth="2" />
  </svg>
);

interface WorkbookProblemListProps {
  problems: Problem[];
  onProblemClick: (problemKey: string) => void;
}

export const WorkbookProblemList: React.FC<WorkbookProblemListProps> = ({ problems, onProblemClick }) => {
  const getStatusIcon = (problem: Problem) => {
    const status = resolveProblemStatus(problem);
    if (status === 'solved') return <CheckCircleIcon />;
    if (status === 'wrong') return <ErrorCircleIcon />;
    return <EmptyCircleIcon />;
  };

  const renderDifficultyBadge = (problem: Problem) => {
    const rawDifficulty =
      (problem as any).difficulty ??
      (problem as any).level ??
      (problem as any).difficulty_level ??
      (problem as any).difficultyLevel ??
      (problem as any).difficulty_name ??
      (problem as any).difficultyName;

    if (!rawDifficulty) {
      return null;
    }

    const displayDifficulty = String(rawDifficulty).replace(/^Lv\.\s*/i, '');
    const level = Number(displayDifficulty);
    let badgeClass = 'bg-slate-100 text-slate-700'; // Default
    let label = `Lv.${displayDifficulty}`;

    if (!Number.isNaN(level)) {
      if (level === 1) { badgeClass = 'bg-green-100 text-green-700 text-green-800'; label = 'Easy'; }
      else if (level <= 3) { badgeClass = 'bg-orange-100 text-yellow-800'; label = 'Medium'; }
      else { badgeClass = 'bg-red-100 text-red-800'; label = 'Hard'; }
    }

    return (
      <span className={`inline-flex min-w-[70px] justify-center items-center rounded-full px-3 py-1 text-xs font-bold ${badgeClass}`}>
        {label}
      </span>
    );
  };

  const getAccuracyString = (problem: Problem) => {
    if (problem.acceptedNumber && problem.submissionNumber) {
      const acc = Math.round((problem.acceptedNumber / problem.submissionNumber) * 100);
      return `정답률 ${acc}%`;
    }
    return `정답률 0%`;
  };

  if (problems.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
        <div className="text-gray-600 dark:text-slate-300 text-lg mb-4">문제가 없습니다</div>
        <p className="text-gray-500 dark:text-slate-400">다른 조건을 선택해보세요.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="divide-y divide-gray-100 dark:divide-slate-800">
        {problems.map((problem, index) => {
          // get top 2 tags maximum
          const displayTags = problem.tags ? problem.tags.slice(0, 2) : [];
          const key = String(problem.displayId ?? problem.id);

          return (
            <div
              key={key}
              onClick={() => onProblemClick(key)}
              className="flex items-center px-6 py-5 hover:bg-gray-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer group"
            >
              {/* Status Icon */}
              <div className="flex-shrink-0 mr-4">
                {getStatusIcon(problem)}
              </div>

              {/* Problem Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 group-hover:text-blue-600 truncate mb-1.5 flex items-center gap-2">
                  <span>{index + 1}.</span> {problem.title}
                </h3>

                <div className="flex items-center gap-3 text-[13px] text-gray-500 dark:text-slate-400">
                  {/* Tags */}
                  {displayTags.length > 0 && (
                    <>
                      <div className="flex gap-1.5">
                        {displayTags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded whitespace-nowrap font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-gray-300 dark:text-slate-600">|</span>
                    </>
                  )}
                  {/* Accuracy */}
                  <span className="font-medium">{getAccuracyString(problem)}</span>
                </div>
              </div>

              {/* Difficulty Badge */}
              <div className="flex-shrink-0 ml-4">
                {renderDifficultyBadge(problem)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
