import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { organizationService } from '../services/organizationService';
import { Organization, OrganizationPayload } from '../types';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/atoms/Button';

import { OrganizationLogo } from '../components/atoms/OrganizationLogo';
import { OrganizationContestManager } from '../features/organization/components/OrganizationContestManager';

export const OrganizationManagePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isAdmin = user?.admin_type === 'Admin' || user?.admin_type === 'Super Admin';
    const isEditMode = !!id;

    const [activeTab, setActiveTab] = useState<'general' | 'members' | 'contests'>('general');

    const [formData, setFormData] = useState<OrganizationPayload>({
        name: '',
        description: '',
        img_url: null,
    });
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [hasPermission, setHasPermission] = useState(false);
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        const checkPermissionAndFetch = async () => {
            if (!user) {
                navigate('/');
                return;
            }

            // Case 1: Creating a new organization - Only System Admin
            if (!isEditMode) {
                if (isAdmin) {
                    setHasPermission(true);
                    setInitializing(false);
                } else {
                    alert('권한이 없습니다.');
                    navigate('/');
                }
                return;
            }

            // Case 2: Managing existing organization - System Admin OR Org Admin
            if (id) {
                try {
                    const data = await organizationService.get(parseInt(id, 10));
                    setOrganization(data);
                    setFormData({
                        name: data.name,
                        description: data.description || '',
                        img_url: data.img_url || null,
                    });

                    const isOrgAdmin = data.members?.some(
                        m => m.username === user.username && (m.role === 'ORG_ADMIN' || m.role === 'ORG_SUPER_ADMIN')
                    );

                    if (isAdmin || isOrgAdmin) {
                        setHasPermission(true);
                    } else {
                        alert('이 단체를 관리할 권한이 없습니다.');
                        navigate(`/organizations/${id}`);
                    }
                } catch (err) {
                    setError('단체를 불러오는데 실패했습니다.');
                    console.error(err);
                } finally {
                    setInitializing(false);
                }
            }
        };

        checkPermissionAndFetch();
    }, [id, isAdmin, navigate, isEditMode, user]);

    if (initializing) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-slate-950">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!hasPermission) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isEditMode && id) {
                await organizationService.update(parseInt(id, 10), formData);
                alert('변경사항이 저장되었습니다.');
                // Refresh data
                const data = await organizationService.get(parseInt(id, 10));
                setOrganization(data);
            } else {
                const newOrg = await organizationService.create(formData);
                navigate(`/organizations/${newOrg.id}`);
            }
        } catch (err) {
            setError('저장에 실패했습니다.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };



    const handleRemoveMember = async (userId: number) => {
        if (!id || !window.confirm('정말 이 멤버를 삭제하시겠습니까?')) return;
        try {
            await organizationService.removeMember(parseInt(id, 10), userId);
            // Refresh organization data
            const data = await organizationService.get(parseInt(id, 10));
            setOrganization(data);
        } catch (err) {
            alert('멤버 삭제에 실패했습니다.');
            console.error(err);
        }
    };

    const handleDeleteOrganization = async () => {
        if (!id || !window.confirm('정말 이 단체를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
        try {
            await organizationService.remove(parseInt(id, 10));
            navigate('/organizations');
        } catch (err) {
            alert('단체 삭제에 실패했습니다.');
            console.error(err);
        }
    };

    const handleCopyInviteLink = async () => {
        if (!organization) return;
        try {
            // 1. Generate Invite Code from Backend
            const inviteCode = await organizationService.generateInviteCode(organization.id);

            // 2. Construct URL with query param
            const inviteUrl = `${window.location.origin}/organizations/${organization.id}/join?code=${inviteCode}`;

            await navigator.clipboard.writeText(inviteUrl);
            alert('초대 링크가 클립보드에 복사되었습니다. (24시간 유효)');
        } catch (err) {
            console.error(err);
            alert('초대 링크 생성에 실패했습니다.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-screen-2xl 2xl:px-10 py-8 flex flex-col md:flex-row gap-8">

                {/* Mobile Nav Placeholder (Simplified) - visible only on small screens */}
                <div className="md:hidden mb-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="font-bold text-gray-900 dark:text-slate-100">Admin Settings</span>
                    <span className="text-sm text-blue-600" onClick={() => navigate(isEditMode ? `/organizations/${id}` : '/organizations')}>Back</span>
                </div>

                {/* Sidebar - Boxed Card Style */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden sticky top-24">
                        <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">단체 관리</h2>
                        </div>
                        <nav className="p-2 space-y-1">
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'general'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-sky-900/30 dark:text-sky-300'
                                    : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                일반 설정
                            </button>
                            {isEditMode && (
                                <button
                                    onClick={() => setActiveTab('members')}
                                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'members'
                                        ? 'bg-blue-50 text-blue-700 dark:bg-sky-900/30 dark:text-sky-300'
                                        : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    멤버 관리
                                </button>
                            )}
                            {isEditMode && (
                                <button
                                    onClick={() => setActiveTab('contests')}
                                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'contests'
                                        ? 'bg-blue-50 text-blue-700 dark:bg-sky-900/30 dark:text-sky-300'
                                        : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    대회 관리
                                </button>
                            )}

                        </nav>
                        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800">
                            <Button
                                variant="secondary"
                                className="w-full justify-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-sm"
                                onClick={() => navigate(isEditMode ? `/organizations/${id}` : '/organizations')}
                            >
                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                나가기
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">


                    {/* Header */}
                    <div className="mb-10">
                        <nav className="text-sm text-gray-500 dark:text-slate-400 mb-2">
                            <span className="cursor-pointer" onClick={() => navigate('/organizations')}>Organization</span> &gt;
                            <span className="cursor-pointer font-medium text-gray-700 dark:text-slate-300"> {organization?.name || 'Organization'}</span> &gt;
                            <span className="font-medium text-gray-900 dark:text-slate-100"> {activeTab === 'general' ? 'General Settings' : activeTab === 'members' ? 'Members' : 'Contests'}</span>
                        </nav>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100">
                            {activeTab === 'general' ? '일반 설정' : activeTab === 'members' ? '멤버 관리' : '대회 관리'}
                        </h1>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* General Settings Tab */}
                    {activeTab === 'general' && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-8">
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-6">
                                    <div className="flex justify-center mb-6">
                                        <OrganizationLogo
                                            src={formData.img_url}
                                            alt={formData.name || 'Organization'}
                                            size="xl"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
                                            단체 이름
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            required
                                            className="block w-full rounded-lg border-gray-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3 border bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">학생 및 교직원에게 표시될 이름입니다.</p>
                                    </div>

                                    <div>
                                        <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
                                            설명
                                        </label>
                                        <textarea
                                            id="description"
                                            rows={5}
                                            className="block w-full rounded-lg border-gray-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3 border bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                                            value={formData.description || ''}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                                        <Button type="submit" disabled={loading} className="px-8">
                                            {loading ? '저장 중...' : '변경사항 저장'}
                                        </Button>
                                    </div>
                                </div>
                            </form>

                            {isEditMode && (
                                <div className="mt-12 pt-10 border-t border-gray-100 dark:border-slate-800">
                                    <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Danger Zone</h3>
                                                <div className="mt-2 text-sm text-red-700 dark:text-red-200">
                                                    <p>단체를 삭제하면 모든 데이터가 영구적으로 제거됩니다. 이 작업은 되돌릴 수 없습니다.</p>
                                                </div>
                                                <div className="mt-4">
                                                    <Button
                                                        variant="outline"
                                                        className="border-red-600 text-red-600 hover:bg-red-50 focus:ring-red-500 bg-transparent"
                                                        onClick={handleDeleteOrganization}
                                                    >
                                                        단체 삭제
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Members Tab */}
                    {activeTab === 'members' && isEditMode && organization && (
                        <div className="space-y-6">
                            {/* Invite Box - Changed to Invitation Link */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-4">새 멤버 초대</h3>
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-slate-100">초대 링크 생성</h4>
                                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">이 링크를 공유하여 누구나 단체에 가입할 수 있도록 하세요.</p>
                                    </div>
                                    <Button onClick={handleCopyInviteLink} variant="primary">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                        초대 링크 복사
                                    </Button>
                                </div>
                            </div>

                            {/* Members List */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">멤버 목록</h3>
                                    <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 py-1 px-3 rounded-full text-xs font-bold">
                                        Total: {organization.members?.length || 0}
                                    </span>
                                </div>
                                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {organization.members?.map((member) => (
                                        <li key={member.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                                            <div className="flex items-center">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{member.realName || member.username}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.role === 'ORG_ADMIN' || member.role === 'ORG_SUPER_ADMIN'
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300'
                                                    }`}>
                                                    {member.role || 'MEMBER'}
                                                </span>
                                                <button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    className="text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    title="Remove Member"
                                                >
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                    {(!organization.members || organization.members.length === 0) && (
                                        <li className="px-6 py-8 text-center text-gray-500 dark:text-slate-400 italic">
                                            멤버가 없습니다.
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Contests Tab */}
                    {activeTab === 'contests' && isEditMode && (
                        <OrganizationContestManager />
                    )}
                </div>
            </div>
        </div>
    );
};
