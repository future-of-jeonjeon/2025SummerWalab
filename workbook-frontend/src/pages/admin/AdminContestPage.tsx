import React, { useState, useEffect } from 'react';
import { Button } from '../../components/common/Button';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { contestApi, type Contest, type ContestCreate } from '../../services/contest';
import { 
  Trophy, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Save,
  X,
  Calendar,
  Users,
  Clock,
  Lock
} from 'lucide-react';

export const AdminContestPage: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingContest, setEditingContest] = useState<Contest | null>(null);
  const [formData, setFormData] = useState<ContestCreate>({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    ruleType: 'ACM',
    password: '',
    isPublic: true,
  });

  useEffect(() => {
    loadContests();
  }, []);

  const loadContests = async () => {
    try {
      setLoading(true);
      const response = await contestApi.getContests({ limit: 100 });
      setContests(response.results);
    } catch (err: any) {
      setError('컨테스트를 불러오는데 실패했습니다.');
      console.error('Error loading contests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await contestApi.createContest(formData);
      setShowCreateForm(false);
      resetForm();
      loadContests();
    } catch (err: any) {
      setError('컨테스트 생성에 실패했습니다.');
      console.error('Error creating contest:', err);
    }
  };

  const handleUpdateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContest) return;

    try {
      await contestApi.updateContest(editingContest.id, formData);
      setEditingContest(null);
      resetForm();
      loadContests();
    } catch (err: any) {
      setError('컨테스트 수정에 실패했습니다.');
      console.error('Error updating contest:', err);
    }
  };

  const handleDeleteContest = async (id: number) => {
    if (!confirm('정말로 이 컨테스트를 삭제하시겠습니까?')) return;

    try {
      await contestApi.deleteContest(id);
      loadContests();
    } catch (err: any) {
      setError('컨테스트 삭제에 실패했습니다.');
      console.error('Error deleting contest:', err);
    }
  };

  const handleEditContest = (contest: Contest) => {
    setEditingContest(contest);
    setFormData({
      title: contest.title,
      description: contest.description,
      startTime: new Date(contest.startTime).toISOString().slice(0, 16),
      endTime: new Date(contest.endTime).toISOString().slice(0, 16),
      ruleType: contest.ruleType,
      password: contest.password || '',
      isPublic: contest.isPublic,
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      ruleType: 'ACM',
      password: '',
      isPublic: true,
    });
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingContest(null);
    resetForm();
  };

  const filteredContests = contests.filter(contest =>
    contest.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contest.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContestStatus = (contest: Contest) => {
    const now = new Date();
    const startTime = new Date(contest.startTime);
    const endTime = new Date(contest.endTime);

    if (now < startTime) return 'upcoming';
    if (now >= startTime && now <= endTime) return 'ongoing';
    return 'finished';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'finished':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming':
        return '예정';
      case 'ongoing':
        return '진행중';
      case 'finished':
        return '종료';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">컨테스트 관리</h1>
            <p className="text-gray-600">
              컨테스트를 생성, 수정, 삭제할 수 있습니다
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            새 컨테스트 만들기
          </Button>
        </div>
      </div>

      {/* 검색 */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="컨테스트 검색..."
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
      {(showCreateForm || editingContest) && (
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">
              {editingContest ? '컨테스트 수정' : '새 컨테스트 만들기'}
            </h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={editingContest ? handleUpdateContest : handleCreateContest} className="space-y-4">
              <Input
                label="제목"
                name="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="컨테스트 제목을 입력하세요"
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
                  placeholder="컨테스트 설명을 입력하세요"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시작 시간
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    종료 시간
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    규칙 타입
                  </label>
                  <select
                    value={formData.ruleType}
                    onChange={(e) => setFormData(prev => ({ ...prev, ruleType: e.target.value as 'ACM' | 'OI' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ACM">ACM</option>
                    <option value="OI">OI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    비밀번호 (선택사항)
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

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
                    공개 컨테스트
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  {editingContest ? '수정' : '생성'}
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

      {/* 컨테스트 목록 */}
      {filteredContests.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? '검색 결과가 없습니다' : '컨테스트가 없습니다'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? '다른 검색어를 시도해보세요' : '첫 번째 컨테스트를 만들어보세요'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              컨테스트 만들기
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredContests.map((contest) => {
            const status = getContestStatus(contest);
            return (
              <Card key={contest.id} className="group hover:shadow-lg transition-all duration-300">
                <CardBody className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {contest.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                          {getStatusText(status)}
                        </span>
                        {!contest.isPublic && (
                          <Lock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {contest.description}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>시작: {formatDate(contest.startTime)}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>종료: {formatDate(contest.endTime)}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          <span>{contest.participantCount || 0}명 참가</span>
                        </div>
                        <div className="flex items-center">
                          <Trophy className="w-4 h-4 mr-2" />
                          <span>{contest.ruleType}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditContest(contest)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        수정
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteContest(contest.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        삭제
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
