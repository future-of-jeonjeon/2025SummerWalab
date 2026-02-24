import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { useAuthStore } from '../stores/authStore';
import { OrganizationManager } from '../components/admin/OrganizationManager';
import { OrganizationApplyManager } from '../components/admin/OrganizationApplyManager';
import { ProblemManager } from '../components/admin/ProblemManager';
import { ContestManager } from '../components/admin/ContestManager';
import { WorkbookManager } from '../components/admin/WorkbookManager';
import { ServerAdminSection } from '../components/admin/ServerAdminSection';
import { UserAdminSection } from '../components/admin/UserAdminSection';
import { BulkProblemManager } from '../components/admin/BulkProblemManager';

type AdminSection =
  | 'problem-list'
  | 'bulk'
  | 'contest'
  | 'contest-edit'
  | 'workbook'
  | 'workbook-manage'
  | 'user'
  | 'server'
  | 'organization-apply'
  | 'organization';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const isAdmin = useMemo(() => {
    const flag = user?.admin_type;
    return flag === 'Admin' || flag === 'Super Admin';
  }, [user?.admin_type]);

  const [activeSection, setActiveSection] = useState<AdminSection>('server');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('server');

  const renderActiveSection = () => {
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <div className="space-y-4 text-center">
              <h1 className="text-xl font-semibold text-gray-900">로그인이 필요합니다</h1>
              <p className="text-sm text-gray-600">관리자 기능을 사용하려면 먼저 로그인하세요.</p>
              <Button onClick={() => navigate('/login')}>
                로그인 페이지로 이동
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    if (!isAdmin) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-500">접근 권한이 없습니다.</p>
        </div>
      );
    }

    switch (activeSection) {
      case 'organization':
        return <OrganizationManager />;
      case 'organization-apply':
        return <OrganizationApplyManager />;
      case 'server':
        return <ServerAdminSection />;
      case 'problem-list':
        return <ProblemManager />;
      case 'bulk':
        return <BulkProblemManager />;
      case 'contest':
      case 'contest-edit':
        return <ContestManager />;
      case 'workbook':
      case 'workbook-manage':
        return <WorkbookManager />;
      case 'user':
        return <UserAdminSection />;
      default:
        return <ProblemManager />;
    }
  };

  const getSectionTitle = (section: AdminSection) => {
    switch (section) {
      case 'server': return '서버 관리';
      case 'problem-list': return '문제 목록';
      case 'bulk': return '문제 등록 / 내보내기';
      case 'contest': return '대회 관리';
      case 'contest-edit': return '대회 수정';
      case 'workbook': return '문제집 관리';
      case 'workbook-manage': return '문제집 관리';
      case 'user': return '사용자 관리';
      case 'organization-apply': return '단체 신청 목록';
      case 'organization': return '단체 목록';
      default: return '관리자 도구';
    }
  };

  const getSectionBreadcrumb = (section: AdminSection) => {
    switch (section) {
      case 'server': return 'Server';
      case 'problem-list':
      case 'bulk': return 'Problem';
      case 'contest':
      case 'contest-edit': return 'Contest';
      case 'workbook':
      case 'workbook-manage': return 'Workbook';
      case 'user': return 'User';
      case 'organization-apply':
      case 'organization': return 'Organization';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 2xl:max-w-screen-2xl 2xl:px-10 flex flex-col md:flex-row gap-8">

        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">관리</h2>
            </div>
            <nav className="p-2 space-y-1">
              {/* 서버 관리 */}
              <div className="overflow-hidden">
                <button
                  onClick={() => {
                    setActiveSection('server');
                    setExpandedCategory(null);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeSection === 'server'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center">
                    <span>서버 관리</span>
                  </div>
                </button>
              </div>

              {/* 문제 관리 */}
              <div className="overflow-hidden">
                <button
                  onClick={() => {
                    const isExpanded = expandedCategory === 'problem';
                    setExpandedCategory(isExpanded ? null : 'problem');
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${['problem-list', 'bulk'].includes(activeSection) || expandedCategory === 'problem'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center">
                    <span>문제 관리</span>
                  </div>
                  <svg
                    className={`h-4 w-4 transform transition-transform duration-200 ${expandedCategory === 'problem' ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedCategory === 'problem' ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-6 pr-2 py-1 space-y-1">
                    <button
                      onClick={() => setActiveSection('problem-list')}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeSection === 'problem-list' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      문제 목록
                    </button>
                    <button
                      onClick={() => setActiveSection('bulk')}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeSection === 'bulk' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      문제 등록 / 내보내기
                    </button>
                  </div>
                </div>
              </div>

              {/* 대회 관리 */}
              <div className="overflow-hidden">
                <button
                  onClick={() => {
                    const isExpanded = expandedCategory === 'contest';
                    setExpandedCategory(isExpanded ? null : 'contest');
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${['contest', 'contest-edit'].includes(activeSection) || expandedCategory === 'contest'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center">
                    <span>대회 관리</span>
                  </div>
                  <svg
                    className={`h-4 w-4 transform transition-transform duration-200 ${expandedCategory === 'contest' ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedCategory === 'contest' ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-6 pr-2 py-1 space-y-1">
                    <button
                      onClick={() => setActiveSection('contest')}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeSection === 'contest' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      대회 관리
                    </button>
                  </div>
                </div>
              </div>

              {/* 문제집 관리 */}
              <div className="overflow-hidden">
                <button
                  onClick={() => {
                    const isExpanded = expandedCategory === 'workbook';
                    setExpandedCategory(isExpanded ? null : 'workbook');
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${['workbook', 'workbook-manage'].includes(activeSection) || expandedCategory === 'workbook'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center">
                    <span>문제집 관리</span>
                  </div>
                  <svg
                    className={`h-4 w-4 transform transition-transform duration-200 ${expandedCategory === 'workbook' ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedCategory === 'workbook' ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-6 pr-2 py-1 space-y-1">
                    <button
                      onClick={() => setActiveSection('workbook')}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeSection === 'workbook' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      문제집 관리
                    </button>
                  </div>
                </div>
              </div>

              {/* 사용자 관리 */}
              <div className="overflow-hidden">
                <button
                  onClick={() => {
                    setActiveSection('user');
                    setExpandedCategory(null);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeSection === 'user'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center">
                    <span>사용자 관리</span>
                  </div>
                </button>
              </div>

              {/* 단체 관리 */}
              <div className="overflow-hidden">
                <button
                  onClick={() => {
                    const isExpanded = expandedCategory === 'organization';
                    setExpandedCategory(isExpanded ? null : 'organization');
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${['organization', 'organization-apply'].includes(activeSection) || expandedCategory === 'organization'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center">
                    <span>단체 관리</span>
                  </div>
                  <svg
                    className={`h-4 w-4 transform transition-transform duration-200 ${expandedCategory === 'organization' ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedCategory === 'organization' ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-6 pr-2 py-1 space-y-1">
                    <button
                      onClick={() => setActiveSection('organization-apply')}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeSection === 'organization-apply' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      단체 신청 목록
                    </button>
                    <button
                      onClick={() => setActiveSection('organization')}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeSection === 'organization' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      단체 목록
                    </button>
                  </div>
                </div>
              </div>
            </nav>
          </div>
        </div>

        <main className="flex-1 min-w-0">
          <div className="mb-10">
            <nav className="flex text-sm text-gray-500 mb-2">
              <span className="cursor-pointer hover:text-gray-900" onClick={() => navigate('/admin')}>Admin</span>
              <span className="mx-2">/</span>
              <span className="font-medium text-gray-900">{getSectionBreadcrumb(activeSection)}</span>
            </nav>
            <h1 className="text-3xl font-extrabold text-gray-900">
              {getSectionTitle(activeSection)}
            </h1>
          </div>
          {renderActiveSection()}
        </main>
      </div>
    </div>
  );
};
