import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { adminService, UpdateUserPayload } from '../../services/adminService';
import { DEPARTMENTS } from '../../services/userService';
import { AdminUser } from '../../types';

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

export const UserAdminSection: React.FC = () => {
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

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [msUserInfo, setMsUserInfo] = useState<{
        user_id: number;
        name: string;
        student_id: string;
        major_id: number;
    } | null>(null);

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

    useEffect(() => {
        fetchUsers(1, '');
    }, [fetchUsers]);

    const handleSelectUser = async (user: AdminUser) => {
        selectedUserIdRef.current = user.id;
        setSelectedUser(user);
        setUserFormMessage({});
        setIsModalOpen(true);

        try {
            const msData = await adminService.getUserDetailFromMS(user.id);
            setMsUserInfo(msData);
        } catch (error) {
            console.error('Failed to fetch MS user info:', error);
            setMsUserInfo(null);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
        setUserForm(null);
        setMsUserInfo(null);
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
            problem_permission: userForm.problem_permission || 'None',
            two_factor_auth: userForm.two_factor_auth ?? false,
            open_api: userForm.open_api ?? false,
        };

        if (payload.admin_type === 'Super Admin') {
            payload.problem_permission = 'All';
        } else if (payload.admin_type === 'Regular User') {
            payload.problem_permission = 'None';
        } else if (payload.admin_type === 'Admin' && payload.problem_permission === 'None') {
            payload.problem_permission = 'Own';
        }

        if (!payload.username) {
            setUserFormMessage({ error: '사용자 이름을 입력하세요.' });
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
        return () => {
            if (userSearchTimerRef.current) {
                window.clearTimeout(userSearchTimerRef.current);
            }
        };
    }, []);

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
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">아이디</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이메일</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">유형</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {userListLoading ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                                                사용자 목록을 불러오는 중입니다...
                                            </td>
                                        </tr>
                                    ) : userListError ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-sm text-red-600">{userListError}</td>
                                        </tr>
                                    ) : userList.map((item) => (
                                        <tr
                                            key={item.id}
                                            onClick={() => handleSelectUser(item)}
                                            className={`cursor-pointer transition-colors hover:bg-gray-50 ${selectedUser?.id === item.id ? 'bg-blue-50' : ''
                                                }`}
                                        >
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.username}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{item.real_name || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{item.email}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{item.admin_type}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${item.is_disabled ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                                        }`}
                                                >
                                                    {item.is_disabled ? '비활성' : '활성'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {userList.length === 0 && !userListLoading && !userListError && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                                                사용자가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    전체 <span className="font-medium">{userTotal}</span>명 · 현재 {userList.length}명 표시 중
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUserPageChange('prev')}
                                        disabled={userPage === 1}
                                    >
                                        이전
                                    </Button>
                                    <span className="flex items-center px-2 text-sm text-gray-700">
                                        {userPage} / {Math.max(1, Math.ceil(userTotal / USER_PAGE_SIZE))}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUserPageChange('next')}
                                        disabled={userPage >= Math.ceil(userTotal / USER_PAGE_SIZE)}
                                    >
                                        다음
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {isModalOpen && selectedUser && userForm && (
                        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                                <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75 backdrop-blur-sm" aria-hidden="true" onClick={handleCloseModal}></div>

                                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                                <div className="inline-block w-full overflow-hidden text-left align-bottom transition-all transform bg-white shadow-2xl rounded-2xl sm:my-8 sm:align-middle sm:max-w-2xl">
                                    <div className="px-4 pt-5 pb-4 bg-white sm:p-8">
                                        <div className="sm:flex sm:items-start">
                                            <div className="w-full mt-3 text-center sm:mt-0 sm:text-left">
                                                <h3 className="text-2xl font-bold leading-6 text-gray-900 mb-6" id="modal-title">
                                                    계정 상세 정보
                                                </h3>

                                                {userFormMessage.error && (
                                                    <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                                                        {userFormMessage.error}
                                                    </div>
                                                )}
                                                {userFormMessage.success && (
                                                    <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-600">
                                                        {userFormMessage.success}
                                                    </div>
                                                )}

                                                <div className="grid gap-6 sm:grid-cols-2">
                                                    <div className="space-y-4">
                                                        <h4 className="font-semibold text-gray-900 border-b pb-2">기본 정보</h4>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
                                                            <div className="text-sm font-bold text-gray-900 px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                                                                {selectedUser.username}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                                                            <div className="text-sm text-gray-900 px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                                                                {selectedUser.email}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">마지막 로그인</label>
                                                            <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                                                                {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : '-'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <h4 className="font-semibold text-gray-900 border-b pb-2">상세 정보 (MS)</h4>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                                                            <div className="text-sm text-gray-900 px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                                                                {msUserInfo?.name || '-'}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">학번</label>
                                                            <div className="text-sm text-gray-900 px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                                                                {msUserInfo?.student_id || '-'}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">학부 (전공)</label>
                                                            <div className="text-sm text-gray-900 px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                                                                {msUserInfo?.major_id !== undefined ? DEPARTMENTS[msUserInfo.major_id] : '-'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-8 space-y-4">
                                                    <h4 className="font-semibold text-gray-900 border-b pb-2">권한 및 설정</h4>

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
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            id="isDisabled"
                                                            checked={userForm.is_disabled}
                                                            onChange={(e) => handleUserFormChange('is_disabled', e.target.checked)}
                                                            className="h-4 w-4 rounded border-gray-300 text-[#58A0C8] focus:ring-[#58A0C8]"
                                                        />
                                                        <label htmlFor="isDisabled" className="text-sm text-gray-700">
                                                            계정 비활성화
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="mt-8 flex justify-between pt-4 border-t">
                                                    <Button
                                                        variant="outline"
                                                        onClick={handleUserDelete}
                                                        disabled={userFormLoading || userDeleteLoading}
                                                        className="text-red-600 border-red-600 hover:bg-red-50"
                                                    >
                                                        {userDeleteLoading ? '삭제 중...' : '사용자 삭제'}
                                                    </Button>
                                                    <div className="flex gap-3">
                                                        <Button
                                                            variant="outline"
                                                            onClick={handleCloseModal}
                                                        >
                                                            취소
                                                        </Button>
                                                        <Button
                                                            variant="primary"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleUserUpdate(e as any);
                                                            }}
                                                            disabled={userFormLoading}
                                                        >
                                                            {userFormLoading ? '저장 중...' : '정보 저장'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </Card>
    );
};
