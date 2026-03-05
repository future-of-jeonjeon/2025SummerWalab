import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { organizationService } from '../services/organizationService';
import { Organization } from '../types';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/atoms/Button';
import { OrganizationLogo } from '../components/atoms/OrganizationLogo';
import { OrganizationApplyModal } from '../components/organisms/OrganizationApplyModal';
import CommonPagination from '../components/common/CommonPagination';

export const OrganizationListPage: React.FC = () => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const { isAuthenticated } = useAuthStore();
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

    const page = parseInt(searchParams.get('page') || '1', 10);
    const size = 12; // Adjusted size for grid

    useEffect(() => {
        const fetchOrganizations = async () => {
            setLoading(true);
            try {
                const response = await organizationService.list({ page, size });
                setOrganizations(response.items);
                setTotal(response.total);
            } catch (error) {
                console.error('Failed to fetch organizations', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrganizations();
    }, [page]);

    useEffect(() => {
        setSearchQuery(searchParams.get('search') || '');
    }, [searchParams]);

    const handlePageChange = (newPage: number) => {
        const params: Record<string, string> = { page: newPage.toString() };
        const trimmed = searchQuery.trim();
        if (trimmed) {
            params.search = trimmed;
        }
        setSearchParams(params);
        window.scrollTo(0, 0);
    };

    const normalizedSearch = searchQuery.trim().toLowerCase();
    const filteredOrganizations = normalizedSearch
        ? organizations.filter((org) =>
            org.name.toLowerCase().includes(normalizedSearch) ||
            (org.description ?? '').toLowerCase().includes(normalizedSearch),
        )
        : organizations;

    const totalPages = normalizedSearch ? 1 : Math.ceil(total / size);

    const handleSearchInputChange = (value: string) => {
        setSearchQuery(value);
        const trimmed = value.trim();
        const params: Record<string, string> = { page: '1' };
        if (trimmed) {
            params.search = trimmed;
        }
        setSearchParams(params);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-12">
            <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-end items-start md:items-center mb-8 gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                placeholder="단체 검색..."
                                value={searchQuery}
                                onChange={(e) => handleSearchInputChange(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                            />
                            <svg className="w-5 h-5 text-gray-400 dark:text-slate-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        {isAuthenticated && (
                            <Button
                                onClick={() => setIsApplyModalOpen(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                단체 신청하기
                            </Button>
                        )}
                    </div>
                </div>
                {/* Content Section */}
                {loading ? (
                    <div className="animate-pulse">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {Array.from({ length: 8 }).map((_, idx) => (
                                <div
                                    key={`org-skeleton-${idx}`}
                                    className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden"
                                >
                                    <div className="h-32 bg-gray-200 dark:bg-slate-800" />
                                    <div className="p-6 space-y-3">
                                        <div className="h-5 w-2/3 rounded bg-gray-200 dark:bg-slate-700" />
                                        <div className="h-4 w-full rounded bg-gray-200 dark:bg-slate-700" />
                                        <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-slate-700" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {filteredOrganizations.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredOrganizations.map((org) => (
                                    <Link
                                        key={org.id}
                                        to={`/organizations/${org.id}`}
                                        className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-slate-800 flex flex-col h-full overflow-hidden group cursor-pointer"
                                    >
                                        {/* Card Header with Logo/Placeholder */}
                                        <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center relative">
                                            <OrganizationLogo
                                                src={org.img_url}
                                                alt={org.name}
                                                size="lg"
                                            />

                                        </div>

                                        {/* Card Content */}
                                        <div className="p-6 flex-1 flex flex-col">
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                                                {org.name}
                                            </h3>
                                            <p className="text-gray-500 dark:text-slate-400 text-sm flex-1 line-clamp-3">
                                                {org.description || '설명이 없습니다.'}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
                                    {normalizedSearch ? '검색 결과가 없습니다' : '등록된 단체가 없습니다'}
                                </h3>

                            </div>
                        )}

                        {/* Pagination settings */}
                        <div className="mt-12">
                            <CommonPagination
                                page={page}
                                pageSize={size}
                                totalPages={totalPages}
                                totalItems={total}
                                onChangePage={handlePageChange}
                                unit="개"
                            />
                        </div>
                    </>
                )}
            </div>

            <OrganizationApplyModal
                isOpen={isApplyModalOpen}
                onClose={() => setIsApplyModalOpen(false)}
            />
        </div>
    );
};
