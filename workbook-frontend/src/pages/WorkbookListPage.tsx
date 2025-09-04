import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { workbookApi, type Workbook } from '../services/workbook';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Users, 
  Calendar,
  Filter,
  Grid,
  List
} from 'lucide-react';

export const WorkbookListPage: React.FC = () => {
  const [workbooks, setWorkbooks] = useState<Workbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');

  useEffect(() => {
    loadWorkbooks();
  }, []);

  const loadWorkbooks = async () => {
    try {
      setLoading(true);
      const [userWorkbooks, publicWorkbooks] = await Promise.all([
        workbookApi.getUserWorkbooks(),
        workbookApi.getPublicWorkbooks()
      ]);
      
      // 중복 제거하고 합치기
      const allWorkbooks = [...userWorkbooks];
      publicWorkbooks.forEach(publicWorkbook => {
        if (!allWorkbooks.find(wb => wb.id === publicWorkbook.id)) {
          allWorkbooks.push(publicWorkbook);
        }
      });
      
      setWorkbooks(allWorkbooks);
    } catch (err: any) {
      setError('문제집을 불러오는데 실패했습니다.');
      console.error('Error loading workbooks:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkbooks = workbooks.filter(workbook => {
    const matchesSearch = workbook.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workbook.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'public' && workbook.isPublic) ||
                         (filter === 'private' && !workbook.isPublic);
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">문제집</h1>
            <p className="text-gray-600">
              체계적으로 구성된 문제집으로 단계별 학습을 시작해보세요
            </p>
          </div>
          <Link to="/admin/workbooks">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              새 문제집 만들기
            </Button>
          </Link>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="문제집 제목이나 설명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filter === 'all' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setFilter('public')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filter === 'public' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                공개
              </button>
              <button
                onClick={() => setFilter('private')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filter === 'private' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                비공개
              </button>
            </div>
            
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* 문제집 목록 */}
      {filteredWorkbooks.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filter !== 'all' ? '검색 결과가 없습니다' : '문제집이 없습니다'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filter !== 'all' 
              ? '다른 검색어나 필터를 시도해보세요' 
              : '첫 번째 문제집을 만들어보세요'
            }
          </p>
          {!searchTerm && filter === 'all' && (
            <Link to="/admin/workbooks">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                문제집 만들기
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
        }>
          {filteredWorkbooks.map((workbook) => (
            <Card key={workbook.id} className="group hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {workbook.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {workbook.description}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    workbook.isPublic 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {workbook.isPublic ? '공개' : '비공개'}
                  </div>
                </div>
              </CardHeader>
              
              <CardBody className="pt-0">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <BookOpen className="w-4 h-4 mr-1" />
                      <span>{workbook.problemCount || 0}문제</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{formatDate(workbook.createdAt)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Link to={`/workbooks/${workbook.id}`} className="flex-1">
                    <Button className="w-full">
                      문제집 보기
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
