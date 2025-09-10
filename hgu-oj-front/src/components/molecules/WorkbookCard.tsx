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
    <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-800 line-clamp-2 flex-1">
          {workbook.title}
        </h3>
        <span className="text-xs text-gray-500 ml-2 flex-shrink-0 bg-gray-100 px-2 py-1 rounded-full">
          {workbook.problemCount}문제
        </span>
      </div>
      
      <p className="text-gray-600 mb-3 text-sm line-clamp-2">
        {workbook.description.replace(/<[^>]*>/g, '')}
      </p>
      
      <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
        <span>작성자: {workbook.createdBy.username}</span>
        <span>{new Date(workbook.createdTime).toLocaleDateString()}</span>
      </div>
      
      <Button
        onClick={handleClick}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2"
      >
        문제집 보기
      </Button>
    </Card>
  );
};
