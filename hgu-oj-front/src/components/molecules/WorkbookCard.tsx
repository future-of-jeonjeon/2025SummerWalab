import React from 'react';
import { Card } from '../atoms/Card';
import { Workbook } from '../../types';

interface WorkbookCardProps {
  workbook: Workbook;
  onClick: (workbookId: number) => void;
  onTagClick?: (tag: string) => void;
}

export const WorkbookCard: React.FC<WorkbookCardProps> = ({ workbook, onClick, onTagClick }) => {
  const handleClick = () => onClick(workbook.id);

  // 임시 더미 카테고리/태그 지원이 백엔드에서 되면 아래 slice 같은 부분 조정 필요
  // 우선은 API 데이터 기반 태그만 렌더링하도록 변경합니다.
  const displayTags = workbook.tags || [];

  return (
    <Card
      onClick={handleClick}
      className="mx-auto w-full p-5 bg-white border border-gray-200 hover:border-blue-400 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 cursor-pointer h-[280px] flex flex-col rounded-2xl relative"
    >
      {/* 1. Header: Author and Problem Count */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-blue-500 flex items-center gap-1.5 line-clamp-1">
          {workbook.writer}
        </h3>
        <span className="px-2.5 py-1 text-[11px] font-bold text-gray-600 bg-gray-100 rounded-full shrink-0">
          총 {workbook.problemCount || 0}문제
        </span>
      </div>

      {/* 2. Title & Category */}
      <div className="mb-4">
        {workbook.category && (
          <span className="text-[11px] font-bold text-gray-500 tracking-wider mb-2 block">
            {workbook.category}
          </span>
        )}
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
              onClick={(e) => {
                if (onTagClick) {
                  e.stopPropagation();
                  onTagClick(tag);
                }
              }}
              className={`text-[12px] font-medium text-gray-600 bg-white border border-gray-200 px-2.5 py-0.5 rounded shadow-sm whitespace-nowrap ${onTagClick ? 'hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 transition-colors' : ''}`}
            >
              #{tag}
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
