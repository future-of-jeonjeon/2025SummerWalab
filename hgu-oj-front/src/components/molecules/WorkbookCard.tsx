import React from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Workbook } from '../../types';

interface WorkbookCardProps {
  workbook: Workbook;
  onClick: (workbookId: number) => void;
}

export const WorkbookCard: React.FC<WorkbookCardProps> = ({ workbook, onClick }) => {
  const handleClick = () => {
    onClick(workbook.id);
  };

  return (
    <Card className="mx-auto w-full max-w-[420px] p-4 hover:shadow-lg transition-shadow cursor-pointer h-56 flex flex-col">
      {/* 제목과 문제 수 */}
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-800 line-clamp-2 flex-1 pr-2">
          {workbook.title}
        </h3>
        <span className="text-xs text-gray-500 flex-shrink-0 bg-gray-100 px-2 py-1 rounded-full">
          {workbook.problemCount || 0}문제
        </span>
      </div>
      
      {/* 설명 */}
      <div className="flex-1 mb-3">
        <p className="text-gray-600 text-sm line-clamp-3 h-12 overflow-hidden">
          {(typeof workbook.description === 'string' && workbook.description.length > 0
            ? workbook.description.replace(/<[^>]*>/g, '')
            : '설명이 없습니다.')}
        </p>
      </div>
      
      {/* 작성자와 공개여부, 날짜 */}
      <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
        <span className="truncate flex-1 mr-2">작성자: User {workbook.created_by_id || 'Unknown'}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {workbook.is_public && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
              공개
            </span>
          )}
          <span className="whitespace-nowrap">
            {workbook.created_at ? new Date(workbook.created_at).toLocaleDateString() : ''}
          </span>
        </div>
      </div>
      
      {/* 버튼 */}
      <Button
        onClick={handleClick}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 mt-auto"
      >
        문제집 보기
      </Button>
    </Card>
  );
};
