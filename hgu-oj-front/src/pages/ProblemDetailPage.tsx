import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProblem } from '../hooks/useProblems';
import { CodeEditor } from '../components/organisms/CodeEditor';
import { Card } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { ExecutionResult } from '../types';

export const ProblemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const problemId = id ? parseInt(id, 10) : 0;

  const { data: problem, isLoading, error } = useProblem(problemId);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | undefined>();
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExecute = async (code: string, language: string, input?: string) => {
    setIsExecuting(true);
    try {
      // TODO: 실제 API 호출로 대체
      // const result = await executeCode({ code, language, input });
      // setExecutionResult(result);
      
      // 임시 결과
      setTimeout(() => {
        setExecutionResult({
          output: 'Hello, World!',
          executionTime: 15,
          memoryUsage: 1024,
          status: 'SUCCESS',
        });
        setIsExecuting(false);
      }, 1000);
    } catch (err) {
      setExecutionResult({
        output: '',
        error: '실행 중 오류가 발생했습니다.',
        executionTime: 0,
        memoryUsage: 0,
        status: 'ERROR',
      });
      setIsExecuting(false);
    }
  };

  const handleSubmit = async (code: string, language: string) => {
    setIsSubmitting(true);
    try {
      // TODO: 실제 API 호출로 대체
      // await submitSolution({ problemId, code, language });
      
      // 임시 처리
      setTimeout(() => {
        alert('제출이 완료되었습니다!');
        setIsSubmitting(false);
      }, 1000);
    } catch (err) {
      alert('제출 중 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">문제를 찾을 수 없습니다</h1>
          <Button onClick={() => navigate('/problems')}>
            문제 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-8rem)]">
        {/* 문제 설명 */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{problem.title}</h1>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>시간 제한: {problem.timeLimit}ms</span>
              <span>메모리 제한: {problem.memoryLimit}MB</span>
            </div>
          </div>

          <Card>
            <h2 className="text-xl font-semibold mb-4">문제 설명</h2>
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: problem.description }} />
            </div>
          </Card>

          {problem.inputDescription && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">입력 형식</h2>
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: problem.inputDescription }} />
              </div>
            </Card>
          )}

          {problem.outputDescription && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">출력 형식</h2>
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: problem.outputDescription }} />
              </div>
            </Card>
          )}

          {problem.samples && problem.samples.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">입출력 예제</h2>
              <div className="space-y-4">
                {problem.samples.map((sample, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium mb-2">입력 {index + 1}</h3>
                      <pre className="bg-gray-100 p-4 rounded text-sm font-mono whitespace-pre-wrap">
                        {sample.input}
                      </pre>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">출력 {index + 1}</h3>
                      <pre className="bg-gray-100 p-4 rounded text-sm font-mono whitespace-pre-wrap">
                        {sample.output}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {problem.hint && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">힌트</h2>
              <p className="whitespace-pre-wrap">{problem.hint}</p>
            </Card>
          )}
        </div>

        {/* 코드 에디터 */}
        <div className="h-full">
          <CodeEditor
            onExecute={handleExecute}
            onSubmit={handleSubmit}
            executionResult={executionResult}
            isExecuting={isExecuting}
            isSubmitting={isSubmitting}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
};
