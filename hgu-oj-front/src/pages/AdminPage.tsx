import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { useAuthStore } from '../stores/authStore';
import { OrganizationManager } from '../components/admin/OrganizationManager';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 2xl:max-w-screen-2xl 2xl:px-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">관리자 도구</h1>
          <p className="mt-2 text-sm text-gray-600">좌측 메뉴에서 원하는 기능을 선택하면 관련 폼이 표시됩니다.</p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full lg:w-64 flex-none space-y-3">
            {/* 서버 관리 (단일 메뉴) */}
            <div className={`rounded-lg border transition-all duration-200 overflow-hidden ${activeSection === 'server' ? 'border-[#113F67] bg-white ring-1 ring-[#113F67]' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
              <button
                onClick={() => {
                  const isExpanded = expandedCategory === 'server';
                  setExpandedCategory(isExpanded ? null : 'server');
                }}
                className="w-full px-4 py-3 text-left focus:outline-none border-b border-transparent"
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${activeSection === 'server' ? 'text-[#113F67]' : 'text-gray-900'}`}>서버 관리</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 text-gray-400 transform transition-transform duration-200 ${expandedCategory === 'server' ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="mt-1 text-xs text-gray-500">채점 서버와 서비스 상태 모니터링</div>
              </button>

              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedCategory === 'server' ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="bg-gray-50 px-2 py-2 space-y-1 border-t border-gray-100">
                  <button
                    onClick={() => setActiveSection('server')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeSection === 'server' ? 'bg-[#113F67] text-white font-medium' : 'text-gray-600 hover:bg-gray-200'}`}
                  >
                    서버 대시보드
                  </button>
                </div>
              </div>
            </div>

            {/* 문제 관리 (아코디언) */}
            <div className={`rounded-lg border transition-all duration-200 overflow-hidden ${['problem-list', 'bulk'].includes(activeSection) ? 'border-[#113F67] bg-white ring-1 ring-[#113F67]' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
              <button
                onClick={() => {
                  const isExpanded = expandedCategory === 'problem';
                  setExpandedCategory(isExpanded ? null : 'problem');
                }}
                className="w-full px-4 py-3 text-left focus:outline-none border-b border-transparent"
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${['problem-list', 'bulk'].includes(activeSection) ? 'text-[#113F67]' : 'text-gray-900'}`}>문제 관리</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 text-gray-400 transform transition-transform duration-200 ${expandedCategory === 'problem' ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="mt-1 text-xs text-gray-500">문제 등록, 수정 및 일괄 관리</div>
              </button>

              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedCategory === 'problem' ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="bg-gray-50 px-2 py-2 space-y-1 border-t border-gray-100">
                  <button
                    onClick={() => setActiveSection('problem-list')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeSection === 'problem-list' ? 'bg-[#113F67] text-white font-medium' : 'text-gray-600 hover:bg-gray-200'}`}
                  >
                    문제 목록
                  </button>
                  <button
                    onClick={() => setActiveSection('bulk')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeSection === 'bulk' ? 'bg-[#113F67] text-white font-medium' : 'text-gray-600 hover:bg-gray-200'}`}
                  >
                    문제 일괄 관리
                  </button>
                </div>
              </div>
            </div>

            {/* 대회 관리 (아코디언) */}
            <div className={`rounded-lg border transition-all duration-200 overflow-hidden ${['contest', 'contest-edit'].includes(activeSection) ? 'border-[#113F67] bg-white ring-1 ring-[#113F67]' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
              <button
                onClick={() => {
                  const isExpanded = expandedCategory === 'contest';
                  setExpandedCategory(isExpanded ? null : 'contest');
                }}
                className="w-full px-4 py-3 text-left focus:outline-none"
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${['contest', 'contest-edit'].includes(activeSection) ? 'text-[#113F67]' : 'text-gray-900'}`}>대회 관리</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 text-gray-400 transform transition-transform duration-200 ${expandedCategory === 'contest' ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="mt-1 text-xs text-gray-500">대회 생성 및 설정 수정</div>
              </button>

              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedCategory === 'contest' ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="bg-gray-50 px-2 py-2 space-y-1 border-t border-gray-100">
                  <button
                    onClick={() => setActiveSection('contest')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeSection === 'contest' ? 'bg-[#113F67] text-white font-medium' : 'text-gray-600 hover:bg-gray-200'}`}
                  >
                    대회 관리
                  </button>
                </div>
              </div>
            </div>

            {/* 문제집 관리 (아코디언) */}
            <div className={`rounded-lg border transition-all duration-200 overflow-hidden ${['workbook', 'workbook-manage'].includes(activeSection) ? 'border-[#113F67] bg-white ring-1 ring-[#113F67]' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
              <button
                onClick={() => {
                  const isExpanded = expandedCategory === 'workbook';
                  setExpandedCategory(isExpanded ? null : 'workbook');
                }}
                className="w-full px-4 py-3 text-left focus:outline-none"
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${['workbook', 'workbook-manage'].includes(activeSection) ? 'text-[#113F67]' : 'text-gray-900'}`}>문제집 관리</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 text-gray-400 transform transition-transform duration-200 ${expandedCategory === 'workbook' ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="mt-1 text-xs text-gray-500">문제집 구성 및 관리</div>
              </button>

              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedCategory === 'workbook' ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="bg-gray-50 px-2 py-2 space-y-1 border-t border-gray-100">
                  <button
                    onClick={() => setActiveSection('workbook')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${activeSection === 'workbook' ? 'bg-[#113F67] text-white font-medium' : 'text-gray-600 hover:bg-gray-200'}`}
                  >
                    문제집 관리
                  </button>
                </div>
              </div>
            </div>

            {/* 사용자 관리 (단일 메뉴) */}
            <div className={`rounded-lg border transition-all duration-200 overflow-hidden ${activeSection === 'user' ? 'border-[#113F67] bg-white ring-1 ring-[#113F67]' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
              <button
                onClick={() => setActiveSection('user')}
                className="w-full px-4 py-3 text-left focus:outline-none"
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${activeSection === 'user' ? 'text-[#113F67]' : 'text-gray-900'}`}>사용자 관리</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">사용자 권한 및 계정 관리</div>
              </button>
            </div>

            {/* 단체 관리 (단일 메뉴) */}
            <div className={`rounded-lg border transition-all duration-200 overflow-hidden ${activeSection === 'organization' ? 'border-[#113F67] bg-white ring-1 ring-[#113F67]' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
              <button
                onClick={() => setActiveSection('organization')}
                className="w-full px-4 py-3 text-left focus:outline-none"
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${activeSection === 'organization' ? 'text-[#113F67]' : 'text-gray-900'}`}>단체 관리</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">단체 등록 및 관리</div>
              </button>
            </div>
          </aside>

          <main className="flex-1">
            {renderActiveSection()}
          </main>
        </div>
      </div>
    </div>
  );
};
