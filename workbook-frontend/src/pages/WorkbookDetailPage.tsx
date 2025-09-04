import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { workbookApi, type Workbook, type WorkbookProblem } from '../services/workbook';
import { 
  ArrowLeft, 
  BookOpen, 
  Calendar, 
  User, 
  Play,
  Clock,
  CheckCircle,
  Circle,
  Filter,
  Search
} from 'lucide-react';

export const WorkbookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [problems, setProblems] = useState<WorkbookProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  useEffect(() => {
    if (id) {
      loadWorkbook();
      loadProblems();
    }
  }, [id]);

  const loadWorkbook = async () => {
    try {
      const workbookData = await workbookApi.getWorkbook(Number(id));
      setWorkbook(workbookData);
    } catch (err: any) {
      setError('문제집을 불러오는데 실패했습니다.');
      console.error('Error loading workbook:', err);
    }
  };

  const loadProblems = async () => {
    try {
      const problemsData = await workbookApi.getWorkbookProblems(Number(id));
      setProblems(problemsData);
    } catch (err: any) {
      setError('문제 목록을 불러오는데 실패했습니다.');
      console.error('Error loading problems:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProblems = problems.filter(problem => {
    const matchesSearch = problem.problem.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || 
                             problem.problem.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
    return matchesSearch && matchesDifficulty;
  });

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !workbook) {
    return (
      <div className="text-center py-20">
        <div className="text-red-600 mb-4">
          <BookOpen className="w-16 h-16 mx-auto mb-4" />
          <h3 className="text-lg font-medium">문제집을 찾을 수 없습니다</h3>
          <p className="text-gray-500 mt-2">{error}</p>
        </div>
        <Link to="/workbooks">
          <Button variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            문제집 목록으로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* 뒤로가기 버튼 */}
      <div className="mb-6">
        <Link to="/workbooks">
          <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            문제집 목록
          </Button>
        </Link>
      </div>

      {/* 문제집 정보 */}
      <Card className="mb-8">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {workbook.title}
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed">
                {workbook.description}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              workbook.isPublic 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {workbook.isPublic ? '공개' : '비공개'}
            </div>
          </div>
        </CardHeader>
        
        <CardBody className="pt-0">
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center">
              <BookOpen className="w-4 h-4 mr-2" />
              <span>{problems.length}개 문제</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span>생성일: {formatDate(workbook.createdAt)}</span>
            </div>
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2" />
              <span>작성자 ID: {workbook.createdBy}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 문제 목록 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">문제 목록</h2>
        
        {problems.length > 0 && (
          <div className="flex gap-2">
            <Button variant="accent" className="bg-yellow-400 hover:bg-yellow-500 text-gray-900">
              <Play className="w-4 h-4 mr-2" />
              순차적으로 풀기
            </Button>
          </div>
        )}
      </div>

      {/* 검색 및 필터 */}
      {problems.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="문제 제목으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setDifficultyFilter('all')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  difficultyFilter === 'all' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setDifficultyFilter('easy')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  difficultyFilter === 'easy' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                쉬움
              </button>
              <button
                onClick={() => setDifficultyFilter('medium')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  difficultyFilter === 'medium' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                보통
              </button>
              <button
                onClick={() => setDifficultyFilter('hard')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  difficultyFilter === 'hard' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                어려움
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 문제 목록 */}
      {filteredProblems.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || difficultyFilter !== 'all' ? '검색 결과가 없습니다' : '문제가 없습니다'}
          </h3>
          <p className="text-gray-500">
            {searchTerm || difficultyFilter !== 'all' 
              ? '다른 검색어나 필터를 시도해보세요' 
              : '이 문제집에는 아직 문제가 없습니다'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProblems
            .sort((a, b) => a.order - b.order)
            .map((workbookProblem, index) => (
            <Card key={workbookProblem.id} className="group hover:shadow-md transition-all duration-300">
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                      {workbookProblem.order}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {workbookProblem.problem.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(workbookProblem.problem.difficulty)}`}>
                          {workbookProblem.problem.difficulty}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>시간 제한</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4" />
                          <span>정답률</span>
                        </div>
                        {workbookProblem.problem.tags.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <span>태그:</span>
                            <div className="flex space-x-1">
                              {workbookProblem.problem.tags.slice(0, 3).map((tag, tagIndex) => (
                                <span key={tagIndex} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                              {workbookProblem.problem.tags.length > 3 && (
                                <span className="text-xs text-gray-400">
                                  +{workbookProblem.problem.tags.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Link to={`/problems/${workbookProblem.problem.id}`}>
                      <Button>
                        문제 풀기
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
