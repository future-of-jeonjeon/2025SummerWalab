import React from 'react';
import { Card } from '../atoms/Card';
import { Workbook } from '../../types';

interface WorkbookCardProps {
  workbook: Workbook;
  onClick: (workbookId: number) => void;
}

export const WorkbookCard: React.FC<WorkbookCardProps> = ({ workbook, onClick }) => {
  const handleClick = () => onClick(workbook.id);

  const dummyTags = ['기본', '입출력', '연산자', '조건문', '반복문', '배열', '문자열'];
  const displayTags = workbook.tags && workbook.tags.length > 0
    ? workbook.tags
    : dummyTags.slice(0, Math.floor(Math.random() * 4) + 3);

  return (
    <Card
      onClick={handleClick}
      className="mx-auto w-full p-5 bg-white border border-gray-200 hover:border-blue-400 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 cursor-pointer h-[280px] flex flex-col rounded-2xl relative"
    >
      {/* 1. Header: Category and Problem Count */}
      <div className="flex items-center justify-between mb-4">
        {workbook.category ? (
          <span className="text-[11px] font-bold text-gray-500 tracking-wider">
            {workbook.category}
          </span>
        ) : (
          <span className="text-[11px] font-bold text-gray-400 tracking-wider">
            기본 커리큘럼
          </span>
        )}
        <span className="px-2.5 py-1 text-[11px] font-bold text-gray-600 bg-gray-100 rounded-full">
          총 {workbook.problemCount || 0}문제
        </span>
      </div>

      {/* 2. Title & Author */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-blue-500 mb-1.5 flex items-center gap-1.5 line-clamp-1">
          User {workbook.created_by_id}
        </h3>
        <h2 className="text-xl font-extrabold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
          {workbook.title}
        </h2>
      </div>

      {/* 3. Tags Grid (Replacing Description) */}
      <div className="flex-1 mb-[18px] overflow-hidden">
        <div className="flex flex-wrap gap-1.5">
          {displayTags.map((tag, idx) => (
            <span
              key={idx}
              className="text-[12px] font-medium text-gray-600 bg-white border border-gray-200 px-2.5 py-0.5 rounded shadow-sm whitespace-nowrap"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* 4. Action Buttons */}
      <div className="mt-auto">
        <button
          className="w-full py-2.5 px-0 rounded-lg bg-[#5d7ab9] hover:bg-[#4a649b] text-white text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow"
          onClick={handleClick}
        >
          바로 시작하기
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </Card>
  );
};
