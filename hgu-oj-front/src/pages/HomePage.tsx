import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with New Color Gradient Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/90 to-secondary-500/90"></div>
        {/* Decorative curve on the right */}
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-blue-600/30 to-transparent transform rotate-12 origin-top-right"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              HGU Online Judge
            </h1>
            <p className="text-lg md:text-xl text-white mb-8 max-w-2xl mx-auto">
              Train Hard, Solve Fast, Code Like a Pro!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/problems">
                <Button className="bg-white hover:bg-gray-50 text-black px-8 py-3 text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">
                  문제 살펴보기
                </Button>
              </Link>
              <Link to="/workbooks">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">
                  문제집 둘러보기
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {/* Decorative curve at bottom */}
        <div className="absolute bottom-0 left-0 w-full h-12 bg-white transform rotate-1 origin-bottom"></div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            주요 기능
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            프로그래밍 실력을 향상시킬 수 있는 다양한 기능들을 제공합니다
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-cream-200">
            <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">실시간 채점</h3>
            <p className="text-gray-600 text-sm leading-relaxed text-center">
              코드를 제출하면 즉시 결과를 확인할 수 있는 실시간 채점 시스템
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-cream-200">
            <div className="w-12 h-12 bg-gradient-to-r from-secondary-500 to-accent-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">다양한 문제집</h3>
            <p className="text-gray-600 text-sm leading-relaxed text-center">
              초보자부터 고급자까지 단계별로 구성된 체계적인 문제집
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-cream-200">
            <div className="w-12 h-12 bg-gradient-to-r from-accent-500 to-primary-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">대회 참여</h3>
            <p className="text-gray-600 text-sm leading-relaxed text-center">
              정기적인 프로그래밍 대회를 통해 실력을 검증하고 경쟁하세요
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 group border border-gray-200">
              <div className="text-4xl font-bold text-primary-600 mb-2 group-hover:scale-110 transition-transform duration-300">100+</div>
              <div className="text-lg text-gray-600 font-medium">문제 수</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 group border border-gray-200">
              <div className="text-4xl font-bold text-secondary-600 mb-2 group-hover:scale-110 transition-transform duration-300">50+</div>
              <div className="text-lg text-gray-600 font-medium">문제집</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 group border border-gray-200">
              <div className="text-4xl font-bold text-accent-600 mb-2 group-hover:scale-110 transition-transform duration-300">10+</div>
              <div className="text-lg text-gray-600 font-medium">진행 중인 대회</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 group border border-gray-200">
              <div className="text-4xl font-bold text-blue-600 mb-2 group-hover:scale-110 transition-transform duration-300">1000+</div>
              <div className="text-lg text-gray-600 font-medium">활성 사용자</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
