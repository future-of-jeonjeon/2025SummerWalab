import React, { useState, useEffect } from 'react';
import { Button } from '../../components/common/Button';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { problemApi, type Problem, type ProblemCreate } from '../../services/problem';
import { 
  Code, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Save,
  X,
  Clock,
  Users,
  CheckCircle
} from 'lucide-react';

export const AdminProblemPage: React.FC = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [formData, setFormData] = useState<ProblemCreate>({
    title: '',
    description: '',
    inputDescription: '',
    outputDescription: '',
    sampleInput: '',
    sampleOutput: '',
    timeLimit: 1000,
    memoryLimit: 128,
    difficulty: 'Easy',
    tags: [],
    isPublic: true,
  });

  useEffect(() => {
    loadProblems();
  }, []);

  const loadProblems = async () => {
    try {
      setLoading(true);
      const response = await problemApi.getProblems({ limit: 100 });
      setProblems(response.results);
    } catch (err: any) {
      setError('문제를 불러오는데 실패했습니다.');
      console.error('Error loading problems:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await problemApi.createProblem(formData);
      setShowCreateForm(false);
      resetForm();
      loadProblems();
    } catch (err: any) {
      setError('문제 생성에 실패했습니다.');
      console.error('Error creating problem:', err);
    }
  };

  const handleUpdateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProblem) return;

    try {
      await problemApi.updateProblem(editingProblem.id, formData);
      setEditingProblem(null);
      resetForm();
      loadProblems();
    } catch (err: any) {
      setError('문제 수정에 실패했습니다.');
      console.error('Error updating problem:', err);
    }
  };

  const handleDeleteProblem = async (id: number) => {
    if (!confirm('정말로 이 문제를 삭제하시겠습니까?')) return;

    try {
      await problemApi.deleteProblem(id);
      loadProblems();
    } catch (err: any) {
      setError('문제 삭제에 실패했습니다.');
      console.error('Error deleting problem:', err);
    }
  };

  const handleEditProblem = (problem: Problem) => {
    setEditingProblem(problem);
    setFormData({
      title: problem.title,
      description: problem.description,
      inputDescription: problem.inputDescription,
      outputDescription: problem.outputDescription,
      sampleInput: problem.sampleInput,
      sampleOutput: problem.sampleOutput,
      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit,
      difficulty: problem.difficulty,
      tags: problem.tags,
      isPublic: problem.isPublic,
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      inputDescription: '',
      outputDescription: '',
      sampleInput: '',
      sampleOutput: '',
      timeLimit: 1000,
      memoryLimit: 128,
      difficulty: 'Easy',
      tags: [],
      isPublic: true,
    });
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingProblem(null);
    resetForm();
  };

  const filteredProblems = problems.filter(problem =>
    problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    problem.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">문제 관리</h1>
            <p className="text-gray-600">
              문제를 생성, 수정, 삭제할 수 있습니다
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            새 문제 만들기
          </Button>
        </div>
      </div>

      {/* 검색 */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="문제 검색..."
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
      {(showCreateForm || editingProblem) && (
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">
              {editingProblem ? '문제 수정' : '새 문제 만들기'}
            </h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={editingProblem ? handleUpdateProblem : handleCreateProblem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="제목"
                  name="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="문제 제목을 입력하세요"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    난이도
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as 'Easy' | 'Medium' | 'Hard' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Easy">쉬움</option>
                    <option value="Medium">보통</option>
                    <option value="Hard">어려움</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  문제 설명
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="문제 설명을 입력하세요"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    입력 설명
                  </label>
                  <textarea
                    name="inputDescription"
                    value={formData.inputDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, inputDescription: e.target.value }))}
                    placeholder="입력 형식을 설명하세요"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    출력 설명
                  </label>
                  <textarea
                    name="outputDescription"
                    value={formData.outputDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, outputDescription: e.target.value }))}
                    placeholder="출력 형식을 설명하세요"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    예제 입력
                  </label>
                  <textarea
                    name="sampleInput"
                    value={formData.sampleInput}
                    onChange={(e) => setFormData(prev => ({ ...prev, sampleInput: e.target.value }))}
                    placeholder="예제 입력을 입력하세요"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    예제 출력
                  </label>
                  <textarea
                    name="sampleOutput"
                    value={formData.sampleOutput}
                    onChange={(e) => setFormData(prev => ({ ...prev, sampleOutput: e.target.value }))}
                    placeholder="예제 출력을 입력하세요"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="시간 제한 (ms)"
                  name="timeLimit"
                  type="number"
                  value={formData.timeLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeLimit: Number(e.target.value) }))}
                  required
                />

                <Input
                  label="메모리 제한 (MB)"
                  name="memoryLimit"
                  type="number"
                  value={formData.memoryLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, memoryLimit: Number(e.target.value) }))}
                  required
                />

                <div className="flex items-center pt-6">
                  <input
                    id="isPublic"
                    name="isPublic"
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                    공개 문제
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  {editingProblem ? '수정' : '생성'}
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

      {/* 문제 목록 */}
      {filteredProblems.length === 0 ? (
        <div className="text-center py-20">
          <Code className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? '검색 결과가 없습니다' : '문제가 없습니다'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? '다른 검색어를 시도해보세요' : '첫 번째 문제를 만들어보세요'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              문제 만들기
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProblems.map((problem) => (
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
                          {problem.difficulty}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          problem.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {problem.isPublic ? '공개' : '비공개'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
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
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditProblem(problem)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      수정
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteProblem(problem.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      삭제
                    </Button>
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
