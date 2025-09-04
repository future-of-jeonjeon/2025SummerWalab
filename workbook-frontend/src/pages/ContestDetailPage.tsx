import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { contestApi, type Contest, type ContestProblem } from '../services/contest';
import { 
  ArrowLeft, 
  Trophy, 
  Calendar, 
  Clock, 
  Users,
  Play,
  Lock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const ContestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<ContestProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadContest();
      loadProblems();
    }
  }, [id]);

  const loadContest = async () => {
    try {
      const contestData = await contestApi.getContest(Number(id));
      setContest(contestData);
      
      // 비공개 컨테스트이고 비밀번호가 있는 경우
      if (!contestData.isPublic && contestData.password) {
        setShowPasswordModal(true);
      }
    } catch (err: any) {
      setError('컨테스트를 불러오는데 실패했습니다.');
      console.error('Error loading contest:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProblems = async () => {
    try {
      const problemsData = await contestApi.getContestProblems(Number(id));
      setProblems(problemsData);
    } catch (err: any) {
      console.error('Error loading problems:', err);
    }
  };

  const handleJoinContest = async () => {
    if (!contest) return;

    try {
      await contestApi.joinContest(contest.id, password || undefined);
      setShowPasswordModal(false);
      setPassword('');
    } catch (err: any) {
      alert('컨테스트 참가에 실패했습니다.');
      console.error('Error joining contest:', err);
    }
  };

  const getContestStatus = () => {
    if (!contest) return 'unknown';
    
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (error || !contest) {
    return (
      <div className="text-center py-20">
        <div className="text-red-600 mb-4">
          <Trophy className="w-16 h-16 mx-auto mb-4" />
          <h3 className="text-lg font-medium">컨테스트를 찾을 수 없습니다</h3>
          <p className="text-gray-500 mt-2">{error}</p>
        </div>
        <Link to="/contests">
          <Button variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            컨테스트 목록으로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  const status = getContestStatus();

  return (
    <div className="max-w-6xl mx-auto">
      {/* 뒤로가기 버튼 */}
      <div className="mb-6">
        <Link to="/contests">
          <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            컨테스트 목록
          </Button>
        </Link>
      </div>

      {/* 컨테스트 정보 */}
      <Card className="mb-8">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  {contest.title}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                  {getStatusText(status)}
                </span>
                {!contest.isPublic && (
                  <Lock className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <p className="text-gray-600 text-lg leading-relaxed">
                {contest.description}
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardBody className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <div className="text-sm text-gray-500">시작 시간</div>
                <div className="font-medium text-gray-900">{formatDate(contest.startTime)}</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <div className="text-sm text-gray-500">종료 시간</div>
                <div className="font-medium text-gray-900">{formatDate(contest.endTime)}</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <Users className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <div className="text-sm text-gray-500">참가자</div>
                <div className="font-medium text-gray-900">{contest.participantCount || 0}명</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <Trophy className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <div className="text-sm text-gray-500">규칙</div>
                <div className="font-medium text-gray-900">{contest.ruleType}</div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 문제 목록 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">문제 목록</h2>
        
        {problems.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">문제가 없습니다</h3>
            <p className="text-gray-500">이 컨테스트에는 아직 문제가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {problems
              .sort((a, b) => a.order - b.order)
              .map((contestProblem) => (
              <Card key={contestProblem.id} className="group hover:shadow-md transition-all duration-300">
                <CardBody className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-lg font-bold text-lg">
                      {String.fromCharCode(65 + contestProblem.order - 1)}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(contestProblem.problem.difficulty)}`}>
                      {contestProblem.problem.difficulty}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {contestProblem.problem.title}
                  </h3>
                  
                  {contestProblem.problem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {contestProblem.problem.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <Link to={`/problems/${contestProblem.problem.id}`}>
                    <Button className="w-full">
                      <Play className="w-4 h-4 mr-2" />
                      문제 풀기
                    </Button>
                  </Link>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 비밀번호 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">컨테스트 참가</h3>
            </CardHeader>
            <CardBody>
              <p className="text-gray-600 mb-4">
                이 컨테스트는 비밀번호가 필요합니다.
              </p>
              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <Button onClick={handleJoinContest} className="flex-1">
                    참가하기
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPassword('');
                    }}
                    className="flex-1"
                  >
                    취소
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};
