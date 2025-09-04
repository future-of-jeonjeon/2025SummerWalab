import React, { useState, useEffect } from 'react';
import { Button } from '../../components/common/Button';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { workbookApi, type Workbook, type WorkbookCreate } from '../../services/workbook';
import { 
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Search,
  Calendar,
  User,
  Save,
  X
} from 'lucide-react';

export const AdminWorkbookPage: React.FC = () => {
  const [workbooks, setWorkbooks] = useState<Workbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingWorkbook, setEditingWorkbook] = useState<Workbook | null>(null);
  const [formData, setFormData] = useState<WorkbookCreate>({
    title: '',
    description: '',
    isPublic: true,
  });

  useEffect(() => {
    loadWorkbooks();
  }, []);

  const loadWorkbooks = async () => {
    try {
      setLoading(true);
      const userWorkbooks = await workbookApi.getUserWorkbooks();
      setWorkbooks(userWorkbooks);
    } catch (err: any) {
      setError('문제집을 불러오는데 실패했습니다.');
      console.error('Error loading workbooks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkbook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await workbookApi.createWorkbook(formData);
      setShowCreateForm(false);
      setFormData({ title: '', description: '', isPublic: true });
      loadWorkbooks();
    } catch (err: any) {
      setError('문제집 생성에 실패했습니다.');
      console.error('Error creating workbook:', err);
    }
  };

  const handleUpdateWorkbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkbook) return;

    try {
      await workbookApi.updateWorkbook(editingWorkbook.id, formData);
      setEditingWorkbook(null);
      setFormData({ title: '', description: '', isPublic: true });
      loadWorkbooks();
    } catch (err: any) {
      setError('문제집 수정에 실패했습니다.');
      console.error('Error updating workbook:', err);
    }
  };

  const handleDeleteWorkbook = async (id: number) => {
    if (!confirm('정말로 이 문제집을 삭제하시겠습니까?')) return;

    try {
      await workbookApi.deleteWorkbook(id);
      loadWorkbooks();
    } catch (err: any) {
      setError('문제집 삭제에 실패했습니다.');
      console.error('Error deleting workbook:', err);
    }
  };

  const handleEditWorkbook = (workbook: Workbook) => {
    setEditingWorkbook(workbook);
    setFormData({
      title: workbook.title,
      description: workbook.description,
      isPublic: workbook.isPublic,
    });
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingWorkbook(null);
    setFormData({ title: '', description: '', isPublic: true });
  };

  const filteredWorkbooks = workbooks.filter(workbook =>
    workbook.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workbook.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">문제집 관리</h1>
            <p className="text-gray-600">
              문제집을 생성, 수정, 삭제할 수 있습니다
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            새 문제집 만들기
          </Button>
        </div>
      </div>

      {/* 검색 */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="문제집 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* 생성/수정 폼 */}
      {(showCreateForm || editingWorkbook) && (
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">
              {editingWorkbook ? '문제집 수정' : '새 문제집 만들기'}
            </h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={editingWorkbook ? handleUpdateWorkbook : handleCreateWorkbook} className="space-y-4">
              <Input
                label="제목"
                name="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="문제집 제목을 입력하세요"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="문제집 설명을 입력하세요"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  id="isPublic"
                  name="isPublic"
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                  공개 문제집
                </label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  {editingWorkbook ? '수정' : '생성'}
                </Button>
                <Button type="button" variant="secondary" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />
                  취소
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* 문제집 목록 */}
      {filteredWorkbooks.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? '검색 결과가 없습니다' : '문제집이 없습니다'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? '다른 검색어를 시도해보세요' : '첫 번째 문제집을 만들어보세요'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              문제집 만들기
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEditWorkbook(workbook)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    수정
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteWorkbook(workbook.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    삭제
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
