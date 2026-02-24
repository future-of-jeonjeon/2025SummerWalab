import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
    return (
        <footer className="bg-white border-t border-gray-100 mt-auto">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12 2xl:max-w-screen-2xl 2xl:px-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand & Description */}
                    <div className="col-span-1 md:col-span-1 flex flex-col items-start">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-lg font-extrabold text-[#1a1f36]">H Code Round</span>
                        </div>
                    </div>

                    {/* 플랫폼 */}
                    <div className="flex flex-col">
                        <h3 className="text-[15px] font-bold text-[#1a1f36] mb-5">플랫폼</h3>
                        <ul className="space-y-3.5">
                            <li><Link to="/problems" className="text-[14px] text-gray-500 hover:text-gray-900 font-medium transition-colors">문제</Link></li>
                            <li><Link to="/contests" className="text-[14px] text-gray-500 hover:text-gray-900 font-medium transition-colors">콘테스트</Link></li>
                            <li><Link to="/" className="text-[14px] text-gray-500 hover:text-gray-900 font-medium transition-colors">토론</Link></li>
                            <li><Link to="/ranking" className="text-[14px] text-gray-500 hover:text-gray-900 font-medium transition-colors">랭킹</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom border & Copyright */}
                <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                </div>
            </div>
        </footer>
    );
};
