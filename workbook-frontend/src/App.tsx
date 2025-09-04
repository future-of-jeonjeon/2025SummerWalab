import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/common/Header';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { WorkbookListPage } from './pages/WorkbookListPage';
import { WorkbookDetailPage } from './pages/WorkbookDetailPage';
import { ProblemListPage } from './pages/ProblemListPage';
import { ProblemDetailPage } from './pages/ProblemDetailPage';
import { ContestListPage } from './pages/ContestListPage';
import { ContestDetailPage } from './pages/ContestDetailPage';
import { AdminProblemPage } from './pages/admin/AdminProblemPage';
import { AdminWorkbookPage } from './pages/admin/AdminWorkbookPage';
import { AdminContestPage } from './pages/admin/AdminContestPage';
import { authApi, type User } from './services/auth';
import './styles/theme.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authApi.isAuthenticated()) {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // 토큰이 유효하지 않은 경우 제거
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header user={user} onLogout={handleLogout} />
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            {/* 공개 라우트 */}
            <Route path="/" element={<HomePage />} />
            <Route 
              path="/login" 
              element={
                user ? <Navigate to="/" replace /> : 
                <LoginPage onLogin={handleLogin} />
              } 
            />
            <Route 
              path="/register" 
              element={
                user ? <Navigate to="/" replace /> : 
                <RegisterPage onLogin={handleLogin} />
              } 
            />
            
            {/* 인증 필요 라우트 */}
            <Route 
              path="/workbooks" 
              element={
                user ? <WorkbookListPage /> : 
                <Navigate to="/login" replace />
              } 
            />
            <Route 
              path="/workbooks/:id" 
              element={
                user ? <WorkbookDetailPage /> : 
                <Navigate to="/login" replace />
              } 
            />
            <Route 
              path="/problems" 
              element={
                user ? <ProblemListPage /> : 
                <Navigate to="/login" replace />
              } 
            />
            <Route 
              path="/problems/:id" 
              element={
                user ? <ProblemDetailPage /> : 
                <Navigate to="/login" replace />
              } 
            />
            <Route 
              path="/contests" 
              element={
                user ? <ContestListPage /> : 
                <Navigate to="/login" replace />
              } 
            />
            <Route 
              path="/contests/:id" 
              element={
                user ? <ContestDetailPage /> : 
                <Navigate to="/login" replace />
              } 
            />
            
            {/* 관리자 라우트 */}
            <Route 
              path="/admin/problems" 
              element={
                user?.isAdmin ? <AdminProblemPage /> : 
                <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/admin/workbooks" 
              element={
                user?.isAdmin ? <AdminWorkbookPage /> : 
                <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/admin/contests" 
              element={
                user?.isAdmin ? <AdminContestPage /> : 
                <Navigate to="/" replace />
              } 
            />
            
            {/* 404 페이지 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
