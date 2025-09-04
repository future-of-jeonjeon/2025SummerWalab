import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card, CardBody } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { problemApi, type Problem } from '../services/problem';
import { 
  Code, 
  Search, 
  Filter,
  Shuffle,
  TrendingUp,
  Clock,
  CheckCircle,
  Users
} from 'lucide-react';

export const ProblemListPage: React.FC = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const itemsPerPage = 20;

  useEffect(() => {
    loadProblems();
    loadTags();
  }, [currentPage, difficultyFilter, tagFilter]);

  const loadProblems = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (difficultyFilter !== 'all') {
        params.difficulty = difficultyFilter;
      }

      if (tagFilter) {
        params.tags = [tagFilter];
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await problemApi.getProblems(params);
      setProblems(response.results);
      setTotalCount(response.count);
    } catch (err: any) {
      setError('문제를 불러오는데 실패했습니다.');
      console.error('Error loading problems:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const tags = await problemApi.getProblemTags();
      const tagNames = tags.map(tag => tag.name);
      setAvailableTags(tagNames);
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadProblems();
  };

  const handleRandomProblem = async () => {
    try {
      const randomProblem = await problemApi.getRandomProblem();
      // 랜덤 문제 페이지로 이동
      window.location.href = `/problems/${randomProblem.id}`;
    } catch (err) {
      console.error('Error getting random problem:', err);
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

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return '쉬움';
      case 'medium':
        return '보통';
      case 'hard':
        return '어려움';
      default:
        return difficulty;
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (loading && problems.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">문제</h1>
            <p className="text-gray-600">
              다양한 난이도의 알고리즘 문제를 풀어보세요
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="accent" 
              onClick={handleRandomProblem}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              랜덤 문제
            </Button>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="문제 제목으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
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
            
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Search className="w-4 h-4 mr-2" />
              검색
            </Button>
          </div>
        </div>

        {/* 태그 필터 */}
        {availableTags.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTagFilter('')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  tagFilter === '' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                전체 태그
              </button>
              {availableTags.slice(0, 10).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tag)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    tagFilter === tag 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* 문제 목록 */}
      {problems.length === 0 ? (
        <div className="text-center py-20">
          <Code className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            문제를 찾을 수 없습니다
          </h3>
          <p className="text-gray-500">
            다른 검색어나 필터를 시도해보세요
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-8">
            {problems.map((problem) => (
              <Card key={problem.id} className="group hover:shadow-md transition-all duration-300">
                <CardBody className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-lg font-bold text-lg">
                        {problem.id}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {problem.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(problem.difficulty)}`}>
                            {getDifficultyText(problem.difficulty)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{problem.timeLimit}ms</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{problem.submissionCount || 0} 제출</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4" />
                            <span>{problem.acceptedCount || 0} 정답</span>
                          </div>
                        </div>
                        
                        {problem.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {problem.tags.slice(0, 5).map((tag, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                            {problem.tags.length > 5 && (
                              <span className="text-xs text-gray-400">
                                +{problem.tags.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Link to={`/problems/${problem.id}`}>
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

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                이전
              </Button>
              
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "primary" : "secondary"}
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
