import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../atoms/Button';

export const NavBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const isAdmin = user?.admin_type === 'Admin' || user?.admin_type === 'Super Admin';

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
              <span className="text-xl font-bold text-black">HGU Code Loundge</span>
            </Link>

            {/* 네비게이션 메뉴 */}
            <div className="flex items-center space-x-6">
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
              <Link
                to="/ranking"
                className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${
                  isActive('/ranking')
                    ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                    : 'text-black hover:text-gray-600'
                }`}
              >
                랭킹
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`text-sm font-medium transition-colors duration-200 px-3 py-2 focus:outline-none ${
                    isActive('/admin')
                      ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                      : 'text-black hover:text-gray-600'
                  }`}
                >
                  관리
                </Link>
              )}
            </div>
          </div>

          {/* 사용자 메뉴 */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  안녕하세요 <span className="font-medium">{user?.username}</span> 님
                </span>
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
