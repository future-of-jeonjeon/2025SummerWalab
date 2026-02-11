import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { organizationService } from '../services/organizationService';
import { Organization } from '../types';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/atoms/Button';
import { OrganizationLogo } from '../components/atoms/OrganizationLogo';
import { OrganizationApplyModal } from '../components/organisms/OrganizationApplyModal';

export const OrganizationListPage: React.FC = () => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const { isAuthenticated } = useAuthStore();
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

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

    const handlePageChange = (newPage: number) => {
        setSearchParams({ page: newPage.toString() });
        window.scrollTo(0, 0);
    };

    const totalPages = Math.ceil(total / size);

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">단체</h1>

                    </div>
                    {isAuthenticated && (
                        <Button
                            onClick={() => setIsApplyModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-200 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            단체 신청하기
                        </Button>
                    )}
                </div>
                {/* Content Section */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <>
                        {organizations.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {organizations.map((org) => (
                                    <Link
                                        key={org.id}
                                        to={`/organizations/${org.id}`}
                                        className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 flex flex-col h-full overflow-hidden group cursor-pointer"
                                    >
                                        {/* Card Header with Logo/Placeholder */}
                                        <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center relative">
                                            <OrganizationLogo
                                                src={org.img_url}
                                                alt={org.name}
                                                size="lg"
                                            />

                                        </div>

                                        {/* Card Content */}
                                        <div className="p-6 flex-1 flex flex-col">
                                            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                                                {org.name}
                                            </h3>
                                            <p className="text-gray-500 text-sm flex-1 line-clamp-3">
                                                {org.description || '설명이 없습니다.'}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">등록된 단체가 없습니다</h3>

                            </div>
                        )}

                        {/* Pagination settings */}
                        {totalPages > 1 && (
                            <div className="flex justify-center mt-12 gap-2">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1}
                                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>

                                {[...Array(totalPages)].map((_, idx) => {
                                    const pageNum = idx + 1;
                                    const isCurrent = pageNum === page;
                                    // Show roughly around current page
                                    if (pageNum < page - 2 || pageNum > page + 2) {
                                        if (pageNum === 1 || pageNum === totalPages) {
                                            // Always show first and last
                                        } else {
                                            return null; // Hide others
                                        }
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isCurrent
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}
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
