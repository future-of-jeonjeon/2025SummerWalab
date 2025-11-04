import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { Input } from '../components/atoms/Input';
import { Button } from '../components/atoms/Button';
import {
  adminService,
  UpdateUserPayload,
} from '../services/adminService';
import { useAuthStore } from '../stores/authStore';
import {
  AdminUser,
} from '../types';
import { OrganizationAdminSection } from '../components/admin/organization/OrganizationAdminSection';
import { BulkProblemManager } from '../components/admin/BulkProblemManager';
import { ProblemCreateSection } from '../components/admin/ProblemCreateSection';
import { ProblemEditSection } from '../components/admin/ProblemEditSection';
import { ServerAdminSection } from '../components/admin/ServerAdminSection';
import { WorkbookCreateSection } from '../components/admin/WorkbookCreateSection';
import { WorkbookManageSection } from '../components/admin/WorkbookManageSection';
import { ContestCreateSection } from '../components/admin/ContestCreateSection';
import { ContestEditSection } from '../components/admin/ContestEditSection';
import { formatDateTime } from '../lib/date';
const USER_PAGE_SIZE = 20;

const mapAdminUserToForm = (user: AdminUser): UpdateUserPayload => ({
  id: user.id,
  username: user.username ?? '',
  real_name: user.real_name ?? '',
  email: user.email ?? '',
  password: '',
  admin_type: user.admin_type ?? 'Regular User',
  problem_permission: user.problem_permission ?? 'None',
  two_factor_auth: Boolean(user.two_factor_auth),
  open_api: Boolean(user.open_api),
  is_disabled: Boolean(user.is_disabled),
});

type AdminSection =
  | 'problem'
  | 'problem-edit'
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

  const [userList, setUserList] = useState<AdminUser[]>([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const [userListError, setUserListError] = useState<string | null>(null);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearchKeyword, setUserSearchKeyword] = useState('');
  const userSearchTimerRef = useRef<number | null>(null);
  const userSearchKeywordRef = useRef('');
  const selectedUserIdRef = useRef<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userForm, setUserForm] = useState<UpdateUserPayload | null>(null);
  const [userFormMessage, setUserFormMessage] = useState<{ success?: string; error?: string }>({});
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [userDeleteLoading, setUserDeleteLoading] = useState(false);

  const [activeSection, setActiveSection] = useState<AdminSection>('problem');

  const fetchUsers = useCallback(
    async (page: number = 1, keyword?: string) => {
      const normalizedKeyword = typeof keyword === 'string' ? keyword : userSearchKeywordRef.current;
      setUserListError(null);
      setUserListLoading(true);
      try {
        const response = await adminService.getUsers({
          page,
          limit: USER_PAGE_SIZE,
          keyword: normalizedKeyword.trim().length > 0 ? normalizedKeyword.trim() : undefined,
        });
        setUserList(response.results);
        setUserTotal(response.total);
        setUserPage(page);

        if (response.results.length === 0) {
          setSelectedUser(null);
          selectedUserIdRef.current = null;
        } else {
          const currentId = selectedUserIdRef.current;
          const next = response.results.find((item) => item.id === currentId) ?? response.results[0];
          setSelectedUser(next);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '사용자 목록을 불러오지 못했습니다.';
        setUserListError(message);
        setUserList([]);
        setSelectedUser(null);
        selectedUserIdRef.current = null;
      } finally {
        setUserListLoading(false);
      }
    },
    [],
  );

  const handleSelectUser = (user: AdminUser) => {
    selectedUserIdRef.current = user.id;
    setSelectedUser(user);
    setUserFormMessage({});
  };

  const handleUserSearchInputChange = (value: string) => {
    setUserSearchKeyword(value);
    userSearchKeywordRef.current = value;
    if (userSearchTimerRef.current) {
      window.clearTimeout(userSearchTimerRef.current);
    }
    userSearchTimerRef.current = window.setTimeout(() => {
      fetchUsers(1, value);
    }, 300);
  };

  const handleUserSearchSubmit = () => {
    if (userSearchTimerRef.current) {
      window.clearTimeout(userSearchTimerRef.current);
      userSearchTimerRef.current = null;
    }
    fetchUsers(1, userSearchKeywordRef.current);
  };

  const handleUserPageChange = (direction: 'prev' | 'next') => {
    const totalPages = Math.max(1, Math.ceil(userTotal / USER_PAGE_SIZE));
    let nextPage = userPage;
    if (direction === 'prev' && userPage > 1) {
      nextPage = userPage - 1;
    }
    if (direction === 'next' && userPage < totalPages) {
      nextPage = userPage + 1;
    }
    if (nextPage !== userPage) {
      fetchUsers(nextPage, userSearchKeywordRef.current);
    }
  };

  const handleUserFormChange = <K extends keyof UpdateUserPayload>(field: K, value: UpdateUserPayload[K]) => {
    setUserForm((prev) => {
      if (!prev) {
        return prev;
      }
      const next = { ...prev, [field]: value };
      setUserFormMessage({});
      return next;
    });
  };

  const handleUserUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userForm) {
      return;
    }

    const payload: UpdateUserPayload = {
      ...userForm,
      username: userForm.username.trim(),
      real_name: userForm.real_name?.trim() ?? '',
      email: userForm.email?.trim() ?? '',
    };

    if (!payload.username) {
      setUserFormMessage({ error: '사용자 이름을 입력하세요.' });
      return;
    }

    if (!payload.real_name) {
      setUserFormMessage({ error: '실명을 입력하세요.' });
      return;
    }

    if (!payload.email) {
      setUserFormMessage({ error: '이메일을 입력하세요.' });
      return;
    }

    if (!payload.password || payload.password.trim().length === 0) {
      delete payload.password;
    } else {
      payload.password = payload.password.trim();
    }

    setUserFormLoading(true);
    setUserFormMessage({});
    try {
      const updated = await adminService.updateUser(payload);
      setSelectedUser(updated);
      setUserForm(mapAdminUserToForm(updated));
      selectedUserIdRef.current = updated.id;
      setUserList((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      setUserFormMessage({ success: '사용자 정보를 수정했습니다.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '사용자 정보를 수정하지 못했습니다.';
      setUserFormMessage({ error: message });
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleUserDelete = async () => {
    if (!selectedUser) {
      return;
    }

    const confirmed = window.confirm(
      `${selectedUser.username} 사용자를 삭제하면 해당 사용자가 생성한 문제, 대회 등이 함께 삭제될 수 있습니다. 계속하시겠습니까?`,
    );
    if (!confirmed) {
      return;
    }

    const nextPage = userList.length <= 1 && userPage > 1 ? userPage - 1 : userPage;

    setUserDeleteLoading(true);
    try {
      await adminService.deleteUser(selectedUser.id);
      setUserFormMessage({ success: `${selectedUser.username} 사용자를 삭제했습니다.` });
      await fetchUsers(nextPage, userSearchKeywordRef.current);
    } catch (error) {
      const message = error instanceof Error ? error.message : '사용자를 삭제하지 못했습니다.';
      setUserFormMessage({ error: message });
    } finally {
      setUserDeleteLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedUser) {
      setUserForm(null);
      selectedUserIdRef.current = null;
      return;
    }

    if (selectedUserIdRef.current !== selectedUser.id) {
      setUserFormMessage({});
    }

    setUserForm(mapAdminUserToForm(selectedUser));
    selectedUserIdRef.current = selectedUser.id;
  }, [selectedUser]);

  useEffect(() => {
    if (!userForm) {
      return;
    }

    if (userForm.admin_type === 'Super Admin' && userForm.problem_permission !== 'All') {
      setUserForm((prev) => (prev ? { ...prev, problem_permission: 'All' } : prev));
    } else if (userForm.admin_type === 'Regular User' && userForm.problem_permission !== 'None') {
      setUserForm((prev) => (prev ? { ...prev, problem_permission: 'None' } : prev));
    }
  }, [userForm]);

  useEffect(() => {
    if (activeSection === 'user') {
      fetchUsers(1, userSearchKeywordRef.current);
    }
  }, [activeSection, fetchUsers]);

  useEffect(() => {
    return () => {
      if (userSearchTimerRef.current) {
        window.clearTimeout(userSearchTimerRef.current);
      }
    };
  }, []);

  const sections: Array<{ key: AdminSection; label: string; helper: string }> = [
    { key: 'server', label: '서버 관리', helper: '채점 서버와 서비스 상태 모니터링' },
    { key: 'organization', label: '조직 관리', helper: '조직 목록과 구성원 관리 도구' },
    { key: 'problem', label: '문제 등록', helper: '단일 문제 생성 및 메타데이터 관리' },
    { key: 'bulk', label: '문제 일괄 관리', helper: 'OJ 백엔드 기반 대량 등록 및 내보내기' },
    { key: 'problem-edit', label: '문제 수정', helper: '기존 문제 조회 및 정보 수정' },
    { key: 'workbook', label: '문제집 등록', helper: '문제집 메타데이터 등록' },
    { key: 'workbook-manage', label: '문제집 수정', helper: '문제집 목록 확인 및 문제 관리' },
    { key: 'contest', label: '대회 등록', helper: '대회 일정과 옵션 생성' },
    { key: 'contest-edit', label: '대회 수정', helper: '대회 정보 조회 및 수정' },
  ];

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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <div className="space-y-4 text-center">
              <h1 className="text-xl font-semibold text-gray-900">권한이 없습니다</h1>
              <p className="text-sm text-gray-600">관리자 전용 페이지입니다. 권한이 필요하면 운영자에게 문의해주세요.</p>
              <Button variant="outline" onClick={() => navigate('/')}>메인으로 돌아가기</Button>
            </div>
          </Card>
        </div>
      );
    }

    switch (activeSection) {
      case 'organization':
        return <OrganizationAdminSection />;
      case 'server':
        return <ServerAdminSection />;

      case 'problem':
        return <ProblemCreateSection />;
      case 'bulk':
        return <BulkProblemManager />;
      case 'problem-edit':
        return <ProblemEditSection />;
      case 'contest':
        return <ContestCreateSection />;
      case 'contest-edit':
        return <ContestEditSection />;
      case 'user': {
        const totalPages = Math.max(1, Math.ceil(userTotal / USER_PAGE_SIZE));
        const canPrev = userPage > 1;
        const canNext = userPage < totalPages;

        return (
          <Card padding="lg">
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-gray-900">사용자 관리</h2>
                <p className="text-sm text-gray-500">검색으로 계정을 찾고, 아래에서 권한과 상태를 수정하세요.</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="w-full sm:flex-1">
                  <Input
                    type="search"
                    label="검색"
                    placeholder="아이디, 이름, 이메일"
                    value={userSearchKeyword}
                    onChange={(e) => handleUserSearchInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUserSearchSubmit();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleUserSearchSubmit}
                  className="w-full sm:w-auto bg-[#113F67] text-white hover:bg-[#34699A] focus:ring-[#58A0C8]"
                >
                  검색
                </Button>
              </div>

              <section className="space-y-4">
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">아이디</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">이름</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">이메일</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">유형</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {userListLoading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                            사용자 목록을 불러오는 중입니다...
                          </td>
                        </tr>
                      ) : userListError ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-sm text-red-600">{userListError}</td>
                        </tr>
                      ) : userList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">조건에 맞는 사용자가 없습니다.</td>
                        </tr>
                      ) : (
                        userList.map((item) => {
                          const isActive = selectedUser?.id === item.id;
                          return (
                            <tr
                              key={item.id}
                              onClick={() => handleSelectUser(item)}
                              className={`cursor-pointer transition-colors ${isActive ? 'bg-[#E7F2F8]' : 'hover:bg-gray-50'}`}
                            >
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.username}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{item.real_name || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{item.email || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{item.admin_type}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    item.is_disabled ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                  }`}
                                >
                                  {item.is_disabled ? '비활성' : '활성'}
                                </span>
                                <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                  TFA {item.two_factor_auth ? 'ON' : 'OFF'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                  <span>전체 {userTotal.toLocaleString()}명 · 현재 {userList.length}명 표시 중</span>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => handleUserPageChange('prev')}>
                      이전
                    </Button>
                    <span className="text-sm text-gray-600">
                      {userPage} / {totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={!canNext} onClick={() => handleUserPageChange('next')}>
                      다음
                    </Button>
                  </div>
                </div>
              </section>

              <section className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-gray-900">계정 상세</h3>
                  <p className="text-xs text-gray-500">선택한 계정의 기본 정보는 읽기 전용이며, 권한과 상태만 변경 가능합니다.</p>
                </div>

                {selectedUser && userForm ? (
                  <form onSubmit={handleUserUpdate} className="space-y-5">
                    {userFormMessage.error && (
                      <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{userFormMessage.error}</div>
                    )}
                    {userFormMessage.success && (
                      <div className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-600">{userFormMessage.success}</div>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-500">아이디</div>
                        <div className="text-sm font-medium text-gray-900">{selectedUser.username}</div>
                      </div>
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-500">이름</div>
                        <div className="text-sm font-medium text-gray-900">{selectedUser.real_name || '-'}</div>
                      </div>
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-500">이메일</div>
                        <div className="text-sm font-medium text-gray-900">{selectedUser.email || '-'}</div>
                      </div>
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-500">마지막 로그인</div>
                        <div className="text-sm font-medium text-gray-900">{formatDateTime(selectedUser.last_login)}</div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">사용자 유형</label>
                        <select
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                          value={userForm.admin_type}
                          onChange={(e) => handleUserFormChange('admin_type', e.target.value)}
                        >
                          <option value="Regular User">Regular User</option>
                          <option value="Admin">Admin</option>
                          <option value="Super Admin">Super Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">문제 권한</label>
                        <select
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8] disabled:bg-gray-100"
                          value={userForm.problem_permission}
                          onChange={(e) => handleUserFormChange('problem_permission', e.target.value)}
                          disabled={userForm.admin_type !== 'Admin'}
                        >
                          <option value="None">None</option>
                          <option value="Own">Own</option>
                          <option value="All">All</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={Boolean(userForm.two_factor_auth)}
                          onChange={(e) => handleUserFormChange('two_factor_auth', e.target.checked)}
                        />
                        <span>2단계 인증 활성화</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={Boolean(userForm.open_api)}
                          onChange={(e) => handleUserFormChange('open_api', e.target.checked)}
                        />
                        <span>Open API 사용</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={Boolean(userForm.is_disabled)}
                          onChange={(e) => handleUserFormChange('is_disabled', e.target.checked)}
                        />
                        <span>계정 비활성화</span>
                      </label>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Button type="submit" loading={userFormLoading}>
                        정보 저장
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={handleUserDelete}
                        loading={userDeleteLoading}
                      >
                        사용자 삭제
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-sm text-gray-500">
                    목록에서 관리할 사용자를 선택하세요.
                  </div>
                )}
              </section>
            </div>
          </Card>
        );
      }
      case 'workbook-manage':
        return <WorkbookManageSection />;
      case 'workbook':
      default:
        return <WorkbookCreateSection />;
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
          <aside className="w-full lg:w-64 flex-none">
            <Card padding="lg">
              <nav className="space-y-2">
                {sections.map((section) => {
                  const active = activeSection === section.key;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => setActiveSection(section.key)}
                      className={`w-full rounded-md border px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#113F67] min-h-[88px] ${
                        active
                          ? 'border-[#113F67] bg-[#113F67] text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-[#113F67] hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-sm font-semibold">{section.label}</div>
                      <div className={`mt-1 text-xs ${active ? 'text-blue-100' : 'text-gray-500'}`}>
                        {section.helper}
                      </div>
                    </button>
                  );
                })}
              </nav>
            </Card>
          </aside>

          <div className="flex-1">
            {renderActiveSection()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
