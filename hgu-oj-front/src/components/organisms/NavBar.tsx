import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../atoms/Button';

import { notificationService, NotificationResponse } from '../../services/notificationService';

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `방금 전`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  return `${Math.floor(diffInSeconds / 86400)}일 전`;
};

export const NavBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const isAdmin = user?.admin_type === 'Admin' || user?.admin_type === 'Super Admin';
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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

  useEffect(() => {
    if (isAuthenticated) {
      const fetchNotifications = async () => {
        try {
          const res = await notificationService.getNotifications();
          if (res.success && res.data) {
            setNotifications(res.data);
          }
          const countRes = await notificationService.getUnreadCount();
          if (countRes.success && countRes.data) {
            setUnreadCount(countRes.data.unchecked_num);
          }
        } catch (error) {
          console.error('Failed to fetch notifications', error);
        }
      };
      fetchNotifications();

      // Optional: Set up polling or WebSocket for real-time updates here
    }
  }, [isAuthenticated]);

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
    <nav className="bg-white shadow-sm dark:bg-slate-900 dark:shadow-none dark:border-b dark:border-slate-800">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-screen-2xl 2xl:px-10">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            {/* 로고 */}
            <Link to="/" className="flex items-center focus:outline-none">
              <span className="text-xl font-bold text-black dark:text-slate-100">H Code Round</span>
            </Link>

            {/* 네비게이션 메뉴 */}
            <div className="flex items-center space-x-6">
              <Link
                to="/problems"
                className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${isActive('/problems')
                  ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                  : 'text-black hover:text-gray-600 dark:text-slate-100 dark:hover:text-slate-300'
                  }`}
              >
                문제
              </Link>
              <Link
                to="/workbooks"
                className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${isActive('/workbooks')
                  ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                  : 'text-black hover:text-gray-600 dark:text-slate-100 dark:hover:text-slate-300'
                  }`}
              >
                문제집
              </Link>
              <Link
                to="/contests"
                className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${isActive('/contests')
                  ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                  : 'text-black hover:text-gray-600 dark:text-slate-100 dark:hover:text-slate-300'
                  }`}
              >
                대회
              </Link>
              <Link
                to="/organizations"
                className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${isActive('/organizations')
                  ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                  : 'text-black hover:text-gray-600 dark:text-slate-100 dark:hover:text-slate-300'
                  }`}
              >
                단체
              </Link>
              {isAuthenticated && (
                <Link
                  to="/contribution"
                  className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${isActive('/contribution')
                    ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                    : 'text-black hover:text-gray-600 dark:text-slate-100 dark:hover:text-slate-300'
                    }`}
                >
                  기여
                </Link>
              )}
              <Link
                to="/ranking"
                className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${isActive('/ranking')
                  ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                  : 'text-black hover:text-gray-600 dark:text-slate-100 dark:hover:text-slate-300'
                  }`}
              >
                랭킹
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${isActive('/admin')
                    ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                    : 'text-black hover:text-gray-600 dark:text-slate-100 dark:hover:text-slate-300'
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
                <span className="text-sm text-gray-700 dark:text-slate-300">
                  안녕하세요 <span className="font-medium">{user?.username}</span> 님
                </span>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="relative p-2 text-gray-400 hover:text-gray-500 dark:text-slate-400 dark:hover:text-slate-200 transition-colors focus:outline-none"
                  >
                    <span className="sr-only">알림 보기</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white dark:border-slate-900 text-[8px] flex items-center justify-center text-transparent">
                          {unreadCount}
                        </span>
                      </span>
                    )}
                  </button>

                  {/* 알림 드롭다운 패널 */}
                  {isNotificationOpen && (
                    <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white dark:bg-slate-900 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-slate-700 focus:outline-none z-50 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">알림</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto w-full no-scrollbar">
                        {notifications.length > 0 ? (
                          <ul className="divide-y divide-gray-100 dark:divide-slate-800 w-full">
                            {notifications.map(notification => (
                              <li
                                key={notification.id}
                                className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${!notification.is_checked ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''}`}
                                onClick={() => {
                                  setIsNotificationOpen(false);
                                  if (notification.payload?.link) {
                                    navigate(notification.payload.link);
                                  }
                                }}
                              >
                                <div className="flex gap-3">
                                  <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{notification.payload?.title || '알림'}</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">{notification.payload?.message || ''}</p>
                                    <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{formatTimeAgo(notification.created_time)}</p>
                                  </div>
                                  {!notification.is_checked && (
                                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="p-6 text-center text-sm text-gray-500 dark:text-slate-400">
                            새로운 알림이 없습니다.
                          </div>
                        )}
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
