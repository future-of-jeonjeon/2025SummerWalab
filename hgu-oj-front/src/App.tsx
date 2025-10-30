import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './hooks/useQueryClient';
import { HomePage } from './pages/HomePage';
import { ProblemListPage } from './pages/ProblemListPage';
import { ProblemDetailPage } from './pages/ProblemDetailPage';
import { WorkbookListPage } from './pages/WorkbookListPage';
import { WorkbookDetailPage } from './pages/WorkbookDetailPage';
import { ContestListPage } from './pages/ContestListPage';
import { ContestDetailPage } from './pages/ContestDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { NavBar } from './components/organisms/NavBar';
import { AdminPage } from './pages/AdminPage';
import MyPage from './pages/MyPage';

const AppShell: React.FC = () => {
  const location = useLocation();
  const hideNavOnProblemDetail = /^\/problems\/(?:[^/]+)$/.test(location.pathname);
  return (
    <div className="min-h-screen bg-gray-50">
      {!hideNavOnProblemDetail && <NavBar />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/problems" element={<ProblemListPage />} />
        <Route path="/problems/:id" element={<ProblemDetailPage />} />
        <Route path="/workbooks" element={<WorkbookListPage />} />
        <Route path="/workbooks/:id" element={<WorkbookDetailPage />} />
        <Route path="/contests" element={<ContestListPage />} />
        <Route path="/contests/:id" element={<ContestDetailPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppShell />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
