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
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import { NavBar } from './components/organisms/NavBar';
import { Footer } from './components/organisms/Footer';
import { AdminPage } from './pages/AdminPage';
import MyPage from './pages/MyPage';
import { RankingPage } from './pages/RankingPage';
import UserInfoPage from './pages/UserInfoPage';
import { OrganizationListPage } from './pages/OrganizationListPage';
import { OrganizationDetailPage } from './pages/OrganizationDetailPage';
import { OrganizationManagePage } from './pages/OrganizationManagePage';
import { OrganizationJoinPage } from './pages/OrganizationJoinPage';
import { ContributionPage } from './pages/ContributionPage';
import { DevIdePage } from './pages/DevIdePage';

const AppShell: React.FC = () => {
  const location = useLocation();
  const hideOnIdeLayout = /^\/problems\/(?:[^/]+)$/.test(location.pathname) || location.pathname.startsWith('/ide');
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      {!hideOnIdeLayout && <NavBar />}
      <div className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/problems" element={<ProblemListPage />} />
          <Route path="/problems/:id" element={<ProblemDetailPage />} />
          <Route path="/workbooks" element={<WorkbookListPage />} />
          <Route path="/workbooks/:id" element={<WorkbookDetailPage />} />
          <Route path="/contests" element={<ContestListPage />} />
          <Route path="/contests/:id" element={<ContestDetailPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/user-info" element={<UserInfoPage />} />
          <Route path="/organizations" element={<OrganizationListPage />} />
          <Route path="/organizations/new" element={<OrganizationManagePage />} />
          <Route path="/organizations/:id" element={<OrganizationDetailPage />} />
          <Route path="/organizations/:id/manage" element={<OrganizationManagePage />} />
          <Route path="/organizations/:id/join" element={<OrganizationJoinPage />} />
          <Route path="/contribution" element={<ContributionPage />} />
          <Route path="/ide" element={<DevIdePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!hideOnIdeLayout && <Footer />}
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
