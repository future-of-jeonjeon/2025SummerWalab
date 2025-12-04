import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/atoms/Button';
import { Card } from '../components/atoms/Card';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  // Registration disabled flag
  const registrationDisabled = true;

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    tfaCode: '',
  });
  const [showTFA, setShowTFA] = useState(false);

  // 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // 페이지 마운트 시 폼 상태 초기화
  useEffect(() => {
    setFormData({
      username: '',
      password: '',
      tfaCode: '',
    });
    setShowTFA(false);
    clearError();
  }, [clearError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // 입력 시 에러 클리어
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      return;
    }

    const success = await login(
      formData.username,
      formData.password,
      formData.tfaCode || undefined
    );

    if (success) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } else if (error === 'tfa_required') {
      setShowTFA(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            HGU Online Judge에 로그인하세요
          </p>
        </div>

        <Card className="mt-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error === 'tfa_required'
                  ? '2단계 인증이 필요합니다.'
                  : error
                }
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                사용자명
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="사용자명을 입력하세요"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            {showTFA && (
              <div>
                <label htmlFor="tfaCode" className="block text-sm font-medium text-gray-700">
                  2단계 인증 코드
                </label>
                <input
                  id="tfaCode"
                  name="tfaCode"
                  type="text"
                  required
                  value={formData.tfaCode}
                  onChange={handleInputChange}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="인증 코드를 입력하세요"
                />
              </div>
            )}

            <div>
              <Button
                type="submit"
                disabled={isLoading || !formData.username || !formData.password}
                className="w-full"
              >
                {isLoading ? '로그인 중...' : '로그인'}
              </Button>
            </div>

            {!registrationDisabled && (
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  계정이 없으신가요?{' '}
                  <Link
                    to="/register"
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    회원가입하기
                  </Link>
                </p>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  또는
                </span>
              </div>
            </div>

            <div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
                  const redirectUri = encodeURIComponent(import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/oauth/callback');
                  const scope = encodeURIComponent('openid email profile');
                  const responseType = 'code';
                  const state = 'login';

                  console.log('Google Login Debug Info:');
                  console.log('Client ID:', clientId);
                  console.log('Redirect URI:', decodeURIComponent(redirectUri));

                  if (!clientId) {
                    alert('Google Client ID is missing in environment variables!');
                    return;
                  }

                  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}&state=${state}`;
                  console.log('Auth URL:', authUrl);

                  window.location.href = authUrl;
                }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google 계정으로 로그인
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
