import React from 'react';
import { ContestRankEntry } from '../../types';

interface ContestRankTableProps {
  entries: ContestRankEntry[];
  ruleType?: string;
  currentUserId?: number;
}

export const ContestRankTable: React.FC<ContestRankTableProps> = ({ entries, ruleType: _ruleType, currentUserId }) => {
  if (!entries.length) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 dark:text-slate-400 text-lg">랭크 정보가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/70">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
          <div className="col-span-1 text-center">순위</div>
          <div className="col-span-4">참가자</div>
          <div className="col-span-3 text-center">해결 문제</div>
          <div className="col-span-4 text-center">획득 점수</div>
        </div>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-slate-700">
        {entries.map((entry, index) => (
          <div
            key={entry.id ?? index}
            className={`px-6 py-4 transition-colors ${currentUserId && entry.user.id === currentUserId ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-slate-800/80'
              }`}
          >
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-1 text-center font-semibold text-gray-800 dark:text-slate-200">{index + 1}</div>
              <div className="col-span-4">
                <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{entry.user.username}</div>
                {entry.user.studentId && (
                  <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{entry.user.studentId}</div>
                )}
              </div>
              <div className="col-span-3 text-center text-sm text-gray-700 dark:text-slate-300">
                {entry.acceptedNumber ?? 0}
              </div>
              <div className="col-span-4 text-center text-sm text-gray-700 dark:text-slate-300">
                {entry.totalScore ?? 0}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
