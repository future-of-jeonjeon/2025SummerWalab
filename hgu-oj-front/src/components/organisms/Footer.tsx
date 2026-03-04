import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export const Footer: React.FC = () => {
    const { isAuthenticated } = useAuthStore();
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    return (
        <footer className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 mt-auto">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12 2xl:max-w-screen-2xl 2xl:px-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand & Description */}
                    <div className="col-span-1 md:col-span-1 flex flex-col items-start">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-lg font-extrabold text-[#1a1f36] dark:text-slate-100">H Code Round</span>
                        </div>
                    </div>

                    {/* 플랫폼 */}
                    <div className="flex flex-col">
                        <ul className="space-y-3.5">
                            <li><Link to="/problems" onClick={scrollToTop} className="text-sm font-medium text-black hover:text-gray-600 dark:text-slate-100 dark:hover:text-slate-300 transition-colors">문제</Link></li>
                            <li><Link to="/workbooks" onClick={scrollToTop} className="text-sm font-medium text-black hover:text-gray-600 dark:text-slate-100 dark:hover:text-slate-300 transition-colors">문제집</Link></li>
                            <li><Link to="/contests" onClick={scrollToTop} className="text-sm font-medium text-black hover:text-gray-600 dark:text-slate-100 dark:hover:text-slate-300 transition-colors">대회</Link></li>
                            <li><Link to="/organizations" onClick={scrollToTop} className="text-sm font-medium text-black hover:text-gray-600 dark:text-slate-100 dark:hover:text-slate-300 transition-colors">단체</Link></li>
                            {isAuthenticated && (
                                <li><Link to="/contribution" onClick={scrollToTop} className="text-sm font-medium text-black hover:text-gray-600 dark:text-slate-100 dark:hover:text-slate-300 transition-colors">기여</Link></li>
                            )}
                            <li><Link to="/ranking" onClick={scrollToTop} className="text-sm font-medium text-black hover:text-gray-600 dark:text-slate-100 dark:hover:text-slate-300 transition-colors">랭킹</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom border & Copyright */}
                <div className="pt-8 border-t border-gray-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                </div>
            </div>
        </footer>
    );
};
