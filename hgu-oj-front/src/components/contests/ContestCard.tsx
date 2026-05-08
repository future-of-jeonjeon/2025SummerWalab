import React from 'react';
import { Contest } from '../../types';

interface ContestCardProps {
  contest: Contest;
  onClick: (contestId: number) => void;
}

const getContestStatus = (contest: Contest) => {
  const now = new Date();
  const startTime = new Date(contest.startTime);
  const endTime = new Date(contest.endTime);

  if (now < startTime) {
    return { status: 'upcoming', text: '시작 예정' };
  }
  if (now >= startTime && now <= endTime) {
    return { status: 'ongoing', text: '진행 중' };
  }
  return { status: 'ended', text: '종료됨' };
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}. ${month}. ${day}. ${hours}:${minutes}`;
};

const formatEndTime = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const ContestCard: React.FC<ContestCardProps> = ({ contest, onClick }) => {
  const statusInfo = getContestStatus(contest);
  const startTime = new Date(contest.startTime);
  const endTime = new Date(contest.endTime);
  const durationMinutes = Math.floor(
    (endTime.getTime() - startTime.getTime()) / (1000 * 60),
  );
  const dateRange = `${formatDate(startTime)} ~ ${formatEndTime(endTime)}`;

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow cursor-pointer flex flex-col sm:flex-row gap-6 relative overflow-hidden"
      onClick={() => onClick(contest.id)}
    >
      <div className="flex-shrink-0">
        <div className="w-16 h-16 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-lg">
          C{String(contest.id).padStart(2, '0')}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col items-start gap-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 truncate">
              {contest.title}
            </h3>
            {contest.organization_name && (
              <div className="text-sm text-gray-500 dark:text-slate-400 font-medium">
                - {contest.organization_name}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold text-gray-700 dark:text-slate-300">
              {statusInfo.text}
            </span>
            <span className="text-gray-300 dark:text-slate-600">|</span>
            <div className="flex items-center gap-1 text-gray-500 dark:text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>참가자 ({contest.participants}명)</span>
            </div>
          </div>

          <div className="flex gap-2 mt-1">
            {(contest.languages && contest.languages.length > 0
              ? contest.languages
              : ['C', 'C++', 'Java', 'Python3']
            ).map((lang: string) => (
              <span key={lang} className="px-2.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs font-medium">
                {lang}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{durationMinutes}분</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{dateRange}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
