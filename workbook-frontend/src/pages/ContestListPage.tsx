import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { contestApi, type Contest } from '../services/contest';
import { 
  Trophy, 
  Search, 
  Calendar,
  Users,
  Clock,
  Play,
  Lock
} from 'lucide-react';

export const ContestListPage: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'finished'>('all');

  useEffect(() => {
    loadContests();
  }, [statusFilter]);

  const loadContests = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const response = await contestApi.getContests(params);
      setContests(response.results);
    } catch (err: any) {
      setError('컨테스트를 불러오는데 실패했습니다.');
      console.error('Error loading contests:', err);
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">컨테스트</h1>
            <p className="text-gray-600">
              실시간 코딩 대회에 참여하여 실력을 겨뤄보세요
            </p>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="컨테스트 제목으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'all' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setStatusFilter('upcoming')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'upcoming' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              예정
            </button>
            <button
              onClick={() => setStatusFilter('ongoing')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'ongoing' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              진행중
            </button>
            <button
              onClick={() => setStatusFilter('finished')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'finished' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              종료
            </button>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* 컨테스트 목록 */}
      {filteredContests.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? '검색 결과가 없습니다' : '컨테스트가 없습니다'}
          </h3>
          <p className="text-gray-500">
            {searchTerm ? '다른 검색어를 시도해보세요' : '아직 진행 중인 컨테스트가 없습니다'}
          </p>
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
                      {status === 'upcoming' && (
                        <Button variant="secondary" disabled>
                          <Clock className="w-4 h-4 mr-2" />
                          대기중
                        </Button>
                      )}
                      {status === 'ongoing' && (
                        <Link to={`/contests/${contest.id}`}>
                          <Button className="bg-green-600 hover:bg-green-700 text-white">
                            <Play className="w-4 h-4 mr-2" />
                            참가하기
                          </Button>
                        </Link>
                      )}
                      {status === 'finished' && (
                        <Link to={`/contests/${contest.id}`}>
                          <Button variant="secondary">
                            <Trophy className="w-4 h-4 mr-2" />
                            결과보기
                          </Button>
                        </Link>
                      )}
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
