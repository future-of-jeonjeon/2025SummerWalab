import React from 'react';
import { ContestRankEntry } from '../../types';

interface ContestRankTableProps {
  entries: ContestRankEntry[];
  ruleType?: string;
}

const formatTime = (seconds?: number) => {
  if (!seconds && seconds !== 0) return '-';
  const sec = Math.max(0, Math.floor(seconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s]
    .map((val) => String(val).padStart(2, '0'))
    .join(':');
};

export const ContestRankTable: React.FC<ContestRankTableProps> = ({ entries, ruleType }) => {
  if (!entries.length) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 text-lg">랭크 정보가 없습니다.</div>
      </div>
    );
  }

  const isACM = ruleType?.toUpperCase() === 'ACM';

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-1 text-center">순위</div>
          <div className="col-span-4">참가자</div>
          {isACM ? (
            <>
              <div className="col-span-2 text-center">해결 문제</div>
              <div className="col-span-2 text-center">제출 수</div>
              <div className="col-span-3 text-center">패널티</div>
            </>
          ) : (
            <div className="col-span-3 text-center">획득 점수</div>
          )}
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {entries.map((entry, index) => (
          <div key={entry.id ?? index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-1 text-center font-semibold text-gray-800">{index + 1}</div>
              <div className="col-span-4">
                <div className="text-sm font-medium text-gray-900">{entry.user.username}</div>
                {entry.user.realName && (
                  <div className="text-xs text-gray-500">{entry.user.realName}</div>
                )}
              </div>
              {isACM ? (
                <>
                  <div className="col-span-2 text-center text-sm text-gray-700">
                    {entry.acceptedNumber ?? 0}
                  </div>
                  <div className="col-span-2 text-center text-sm text-gray-700">
                    {entry.submissionNumber ?? 0}
                  </div>
                  <div className="col-span-3 text-center text-sm text-gray-700">
                    {formatTime(entry.totalTime)}
                  </div>
                </>
              ) : (
                <div className="col-span-3 text-center text-sm text-gray-700">
                  {entry.totalScore ?? 0}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
