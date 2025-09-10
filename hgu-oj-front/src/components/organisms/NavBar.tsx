import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../atoms/Button';

export const NavBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 로고 - 왼쪽 */}
          <Link to="/" className="flex items-center space-x-3 focus:outline-none">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-blue-500 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">★</span>
            </div>
            <span className="text-xl font-bold text-black">HGU Online Judge</span>
          </Link>

          {/* 네비게이션 메뉴 - 가운데 */}
          <div className="flex items-center space-x-8">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${
                isActive('/')
                  ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                  : 'text-black hover:text-gray-600'
              }`}
            >
              메인
            </Link>
            <Link
              to="/problems"
              className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${
                isActive('/problems')
                  ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                  : 'text-black hover:text-gray-600'
              }`}
            >
              문제
            </Link>
            <Link
              to="/workbooks"
              className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${
                isActive('/workbooks')
                  ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                  : 'text-black hover:text-gray-600'
              }`}
            >
              문제집
            </Link>
            <Link
              to="/contests"
              className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${
                isActive('/contests')
                  ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                  : 'text-black hover:text-gray-600'
              }`}
            >
              대회
            </Link>
          </div>

          {/* 사용자 메뉴 - 오른쪽 */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  안녕하세요, <span className="font-medium">{user?.username}</span>님
                </span>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                >
                  로그아웃
                </Button>
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
