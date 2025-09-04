import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { problemApi, type Problem, type SubmissionCreate } from '../services/problem';
import { 
  ArrowLeft, 
  Code, 
  Play, 
  Clock, 
  Users,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const ProblemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadProblem();
    }
  }, [id]);

  const loadProblem = async () => {
    try {
      const problemData = await problemApi.getProblem(Number(id));
      setProblem(problemData);
    } catch (err: any) {
      setError('문제를 불러오는데 실패했습니다.');
      console.error('Error loading problem:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem || !code.trim()) return;

    setSubmitting(true);
    try {
      const submission: SubmissionCreate = {
        problemId: problem.id,
        language,
        code,
      };
      
      await problemApi.submitSolution(submission);
      alert('제출이 완료되었습니다!');
    } catch (err: any) {
      alert('제출에 실패했습니다.');
      console.error('Error submitting solution:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="text-center py-20">
        <div className="text-red-600 mb-4">
          <Code className="w-16 h-16 mx-auto mb-4" />
          <h3 className="text-lg font-medium">문제를 찾을 수 없습니다</h3>
          <p className="text-gray-500 mt-2">{error}</p>
        </div>
        <Link to="/problems">
          <Button variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            문제 목록으로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* 뒤로가기 버튼 */}
      <div className="mb-6">
        <Link to="/problems">
          <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            문제 목록
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 문제 설명 */}
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {problem.title}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(problem.difficulty)}`}>
                      {problem.difficulty}
                    </span>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{problem.timeLimit}ms</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      <span>{problem.submissionCount || 0} 제출</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      <span>{problem.acceptedCount || 0} 정답</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardBody>
              <div className="prose max-w-none">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">문제 설명</h3>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {problem.description}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">입력</h3>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {problem.inputDescription}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">출력</h3>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {problem.outputDescription}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">예제</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">입력</h4>
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border">
                        {problem.sampleInput}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">출력</h4>
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border">
                        {problem.sampleOutput}
                      </pre>
                    </div>
                  </div>
                </div>

                {problem.tags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">태그</h3>
                    <div className="flex flex-wrap gap-2">
                      {problem.tags.map((tag, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 코드 제출 */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">코드 제출</h2>
            </CardHeader>
            
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    언어
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    코드
                  </label>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="코드를 입력하세요..."
                    rows={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  loading={submitting}
                  disabled={submitting || !code.trim()}
                >
                  <Play className="w-4 h-4 mr-2" />
                  제출하기
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
