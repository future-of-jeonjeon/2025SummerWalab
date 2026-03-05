import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { organizationService } from '../services/organizationService';
import { Organization } from '../types';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/atoms/Button';
import { OrganizationLogo } from '../components/atoms/OrganizationLogo';


export const OrganizationDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isAdmin = user?.admin_type === 'Admin' || user?.admin_type === 'Super Admin';
    // const [memberSearchTerm, setMemberSearchTerm] = useState('');

    useEffect(() => {
        const fetchOrganization = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const data = await organizationService.get(parseInt(id, 10));
                setOrganization(data);
            } catch (err) {
                setError('단체를 불러오는데 실패했습니다.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrganization();
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !organization) {
        return (
            <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-12">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-lg shadow-sm text-center">
                    <div className="text-red-500 text-lg mb-4">{error || '단체를 찾을 수 없습니다.'}</div>
                    <Button onClick={() => navigate('/organizations')}>
                        목록으로 돌아가기
                    </Button>
                </div>
            </div>
        );
    }

    // Search removed as per request
    const membersToDisplay = organization.members || [];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-8">
            <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10">

                {/* Navigation Breadcrumb */}
                <nav className="flex mb-6 text-sm text-gray-500 dark:text-slate-400">
                    <span className="cursor-pointer hover:text-gray-900 dark:hover:text-slate-100" onClick={() => navigate('/organizations')}>Organizations</span>
                    <span className="mx-2">/</span>
                    <span className="text-gray-900 dark:text-slate-100 font-medium truncate">{organization.name}</span>
                </nav>

                {/* Hero Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden mb-8">
                    <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start">
                        {/* Logo */}
                        {/* Logo */}
                        <div className="flex-shrink-0">
                            <OrganizationLogo
                                src={organization.img_url}
                                alt={organization.name}
                                size="2xl"
                                className="w-32 h-32 md:w-40 md:h-40"
                            />
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-slate-100 mb-2 tracking-tight">
                                {organization.name}
                            </h1>
                            <p className="text-gray-600 dark:text-slate-300 text-lg leading-relaxed max-w-3xl mb-6">
                                {organization.description || '설명이 없습니다.'}
                            </p>

                            <div className="mt-8 flex gap-3">
                                {(isAdmin || organization.members?.some(m => m.username === user?.username && (m.role === 'ORG_ADMIN' || m.role === 'ORG_SUPER_ADMIN'))) && (
                                    <Button onClick={() => navigate(`/organizations/${id}/manage`)} className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        단체 관리
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>



                {/* Members Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">소속 멤버</h2>
                        </div>
                        {/* Search removed */}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">

                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                                {membersToDisplay.map((member) => (
                                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                                        <td className="px-8 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                                        {member.realName || member.username}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {membersToDisplay.length === 0 && (
                                    <tr>
                                        <td colSpan={1} className="px-6 py-10 text-center text-gray-500 dark:text-slate-400">
                                            멤버가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-800 px-8 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between sm:px-6">
                        {/* Simple footer for table, maybe pagination later */}
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700 dark:text-slate-300">
                                    Showing <span className="font-medium">1</span> to <span className="font-medium">{membersToDisplay.length}</span> of <span className="font-medium">{organization.members?.length || 0}</span> members
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
