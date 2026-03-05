import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { organizationService } from '../services/organizationService';
import { Organization } from '../types';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/atoms/Button';
import { OrganizationLogo } from '../components/atoms/OrganizationLogo';

export const OrganizationJoinPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuthStore();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState('');

    const [searchParams] = useSearchParams();
    const code = searchParams.get('code');

    useEffect(() => {
        if (!id) return;

        const fetchOrg = async () => {
            try {
                if (!code) {
                    setError('초대 코드가 필요한 페이지입니다. 잘못된 접근입니다.');
                    setLoading(false);
                    return;
                }

                // Verify the code first
                try {
                    await organizationService.verifyJoinCode(parseInt(id, 10), code);
                } catch (vErr) {
                    setError('유효하지 않거나 만료된 초대 코드입니다.');
                    setLoading(false);
                    return;
                }

                const data = await organizationService.get(parseInt(id, 10));
                setOrganization(data);
            } catch (err) {
                setError('단체를 찾을 수 없거나 접근 권한이 없습니다.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrg();
    }, [id, code]);

    const handleJoin = async () => {
        if (!isAuthenticated) {
            navigate(`/login?redirect=/organizations/${id}/join?code=${code || ''}`);
            return;
        }

        if (!id) return;

        setJoining(true);
        try {
            // Join with code (if code exists, it's passed, otherwise undefined)
            // Note: Service will verify if code is required/valid
            await organizationService.join(parseInt(id, 10), code || undefined);

            // Success - navigate to org page
            navigate(`/organizations/${id}`);
        } catch (err) {
            alert('가입에 실패했습니다. 유효하지 않은 초대 코드이거나 이미 가입된 멤버일 수 있습니다.');
            console.error(err);
            setJoining(false);
        }
    };

    const handleDecline = async () => {
        if (code) {
            // TODO: Call backend to remove redis key
            // await organizationService.declineInvite(code);
        }
        navigate('/');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-slate-950">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !organization) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-slate-950 p-4">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 text-center max-w-md w-full">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">{error || '잘못된 접근입니다.'}</h3>
                    <Button onClick={() => navigate('/')} className="w-full mt-4">홈으로 돌아가기</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f6f8fa] dark:bg-slate-950 flex flex-col items-center pt-16 md:pt-24 px-4 font-sans">
            {/* Logo Section */}
            <div className="mb-6">
                <OrganizationLogo
                    src={organization.img_url}
                    alt={organization.name}
                    size="lg"
                    className="w-16 h-16"
                />
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-slate-100 mb-8 text-center">
                {organization.name}에 가입하기
            </h1>

            {/* Main Card */}
            <div className="w-full max-w-[540px] bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm p-6 md:p-8">

                {/* Info Box - Membership Details REMOVED */}
                <div className="text-center mb-8">
                    <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                        {organization.description || '이 단체는 아직 설명이 없습니다.'}
                    </p>
                </div>

                {/* User Status - Icon REMOVED */}
                {isAuthenticated && user && (
                    <div className="flex justify-center items-center gap-1 mb-6 text-sm">
                        <span className="text-gray-500 dark:text-slate-400">로그인된 계정:</span>
                        <span className="font-semibold text-gray-900 dark:text-slate-100">{user.username}</span>
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={handleJoin}
                        disabled={joining}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-[#0969da] hover:bg-[#035bb8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                    >
                        {joining ? '가입 중...' : `${organization.name} 가입하기`}
                    </button>

                    <button
                        onClick={handleDecline}
                        className="w-full block text-center text-sm text-blue-600 hover:text-blue-800 hover:underline py-1 font-medium bg-transparent border-none cursor-pointer"
                    >
                        초대 거절하기
                    </button>
                </div>
            </div>

            {/* Footer */}
            <p className="mt-8 text-xs text-gray-400 dark:text-slate-500 text-center max-w-md leading-relaxed px-4 mb-12">
                사용자의 프로필과 제출 기록이 단체 관리자에게 공개될 수 있습니다.
            </p>
        </div>
    );
};
