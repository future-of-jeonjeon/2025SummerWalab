import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../atoms/Button';

// 더미 알림 데이터
const dummyNotifications = [
  { id: 1, title: '대회 시작 예정', message: 'H Code Round가 10분 뒤 시작됩니다.', time: '10분 전', isRead: false },
  { id: 2, title: '문제 제출 결과', message: 'A번 문제가 정답 처리되었습니다. (+15점)', time: '1시간 전', isRead: true },
  { id: 3, title: '공지사항', message: '새로운 랭킹 시스템이 도입되었습니다.', time: '1일 전', isRead: true },
];

export const NavBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const isAdmin = user?.admin_type === 'Admin' || user?.admin_type === 'Super Admin';
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-screen-2xl 2xl:px-10">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            {/* 로고 */}
            <Link to="/" className="flex items-center focus:outline-none">
              <span className="text-xl font-bold text-black">H Code Round</span>
            </Link>

            {/* 네비게이션 메뉴 */}
            <div className="flex items-center space-x-6">
              <Link
                to="/problems"
                className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${isActive('/problems')
                  ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                  : 'text-black hover:text-gray-600'
                  }`}
              >
                문제
              </Link>
              <Link
                to="/workbooks"
                className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${isActive('/workbooks')
                  ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                  : 'text-black hover:text-gray-600'
                  }`}
              >
                문제집
              </Link>
              <Link
                to="/contests"
                className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${isActive('/contests')
                  ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                  : 'text-black hover:text-gray-600'
                  }`}
              >
                대회
              </Link>
              <Link
                to="/organizations"
                className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${isActive('/organizations')
                  ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                  : 'text-black hover:text-gray-600'
                  }`}
              >
                단체
              </Link>
              {isAuthenticated && (
                <Link
                  to="/contribution"
                  className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${isActive('/contribution')
                    ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                    : 'text-black hover:text-gray-600'
                    }`}
                >
                  기여
                </Link>
              )}
              <Link
                to="/ranking"
                className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${isActive('/ranking')
                  ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                  : 'text-black hover:text-gray-600'
                  }`}
              >
                랭킹
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${isActive('/admin')
                    ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                    : 'text-black hover:text-gray-600'
                    }`}
                >
                  관리
                </Link>
              )}
            </div>
          </div>

          {/* 사용자 메뉴 & 알림 영역 */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  안녕하세요 <span className="font-medium">{user?.username}</span> 님
                </span>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors focus:outline-none"
                  >
                    <span className="sr-only">알림 보기</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                    {dummyNotifications.length > 0 && (
                      <span className="absolute top-1 right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
                      </span>
                    )}
                  </button>

                  {/* 알림 드롭다운 패널 */}
                  {isNotificationOpen && (
                    <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-900">알림</h3>
                        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">모두 읽음 처리</button>
                      </div>
                      <div className="max-h-96 overflow-y-auto w-full no-scrollbar">
                        {dummyNotifications.length > 0 ? (
                          <ul className="divide-y divide-gray-100 w-full">
                            {dummyNotifications.map(notification => (
                              <li key={notification.id} className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-blue-50/30' : ''}`}>
                                <div className="flex gap-3">
                                  <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                    <p className="text-xs text-gray-500">{notification.message}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">{notification.time}</p>
                                  </div>
                                  {!notification.isRead && (
                                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="p-6 text-center text-sm text-gray-500">
                            새로운 알림이 없습니다.
                          </div>
                        )}
                      </div>
                      <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
                        <button className="text-xs font-medium text-gray-600 hover:text-gray-900">
                          알림 설정 가기
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    size="sm"
                  >
                    로그아웃
                  </Button>
                  <Button
                    onClick={() => navigate('/mypage')}
                    variant="outline"
                    size="sm"
                  >
                    마이페이지
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => navigate('/login')}
                  variant="outline"
                  size="sm"
                >
                  로그인
                </Button>
                <Button
                  onClick={() => navigate('/register')}
                  size="sm"
                >
                  회원가입
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
