import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { ProblemCard } from '../components/molecules/ProblemCard';
import { useWorkbook, useWorkbookProblems } from '../hooks/useWorkbooks';

export const WorkbookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const workbookId = id ? parseInt(id, 10) : 0;

  const { data: workbook, isLoading: workbookLoading, error: workbookError } = useWorkbook(workbookId);
  const { data: problemsData, isLoading: problemsLoading, error: problemsError } = useWorkbookProblems(workbookId);

  const handleProblemClick = (problemId: number) => {
    navigate(`/problems/${problemId}`);
  };

  const handleBackClick = () => {
    navigate('/workbooks');
  };

  if (workbookLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (workbookError || !workbook) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg mb-4">
          문제집을 찾을 수 없습니다.
        </div>
        <Button onClick={handleBackClick} className="bg-blue-600 hover:bg-blue-700 text-white">
          문제집 목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const problems = problemsData?.data || [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 뒤로가기 버튼 */}
      <Button
        onClick={handleBackClick}
        className="mb-6 bg-gray-200 hover:bg-gray-300 text-gray-700"
      >
        ← 문제집 목록으로 돌아가기
      </Button>

      {/* 문제집 정보 */}
      <Card className="p-6 mb-8">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-bold text-gray-800">{workbook.title}</h1>
          <span className="text-lg text-gray-600">
            {workbook.problemCount}문제
          </span>
        </div>
        
        <div className="text-gray-600 mb-4">
          <p className="text-sm mb-2">
            작성자: {workbook.createdBy.username} | 
            생성일: {new Date(workbook.createdTime).toLocaleDateString()}
          </p>
        </div>
        
        <div className="prose max-w-none">
          <div dangerouslySetInnerHTML={{ __html: workbook.description }} />
        </div>
      </Card>

      {/* 문제 목록 */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          포함된 문제들
        </h2>
        
        {problemsLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : problemsError ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">
              문제 목록을 불러오는 중 오류가 발생했습니다.
            </div>
            <p className="text-gray-600">{problemsError.message}</p>
          </div>
        ) : problems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-600 text-lg">
              이 문제집에는 아직 문제가 없습니다.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {problems.map((workbookProblem, index) => (
              <ProblemCard
                key={workbookProblem.id}
                problem={workbookProblem.problem}
                onClick={handleProblemClick}
                showOrder={true}
                order={index + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
