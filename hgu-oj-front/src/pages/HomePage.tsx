import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

// removing problemService, submissionService, contestService

import { rankingService } from '../services/rankingService';
import { useAuthStore } from '../stores/authStore';
import { userService } from '../services/userService';
import { problemService } from '../services/problemService';
import { getDifficultyMeta } from '../lib/difficulty';
import { ProblemList } from '../components/organisms/ProblemList';

const HERO_ROTATION_MS = 5000;

const HERO_BANNERS = [
  {
    eyebrow: '실전 감각',
    title: ['당신의 한계를 넘어서는', '코딩 테스트'],
    description: '대회, 문제 풀이, 랭킹까지 한 흐름으로 이어지는 실전형 온라인 저지입니다.',
    gradientClassName: 'from-blue-400 via-cyan-300 to-indigo-500',
  },
  {
    eyebrow: '매일의 성장',
    title: ['하루 한 문제로 쌓아가는', '문제 해결력'],
    description: '데일리 챌린지와 최근 문제 탐색으로 꾸준한 학습 리듬을 만들 수 있습니다.',
    gradientClassName: 'from-emerald-300 via-teal-300 to-sky-400',
  },
  {
    eyebrow: '함께하는 루틴',
    title: ['단체와 함께 설계하는', '학습 루프'],
    description: '구성원 초대, 역할 관리, 조직 대회 운영까지 팀 단위 학습에 맞춘 흐름을 제공합니다.',
    gradientClassName: 'from-amber-200 via-orange-300 to-rose-400',
  },
  {
    eyebrow: '기록과 경쟁',
    title: ['기록으로 증명하는', '당신의 성장 곡선'],
    description: '랭킹과 풀이 기록을 통해 지금의 위치를 확인하고 다음 목표를 더 선명하게 잡아보세요.',
    gradientClassName: 'from-fuchsia-300 via-violet-300 to-blue-400',
  },
] as const;

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [isUserVerified, setIsUserVerified] = React.useState(false);
  const [activeHeroIndex, setActiveHeroIndex] = React.useState(0);

  React.useEffect(() => {
    const checkUserInfo = async () => {
      if (isAuthenticated) {
        try {
          await userService.getUserDetail();
          setIsUserVerified(true);
        } catch (error: any) {
          // 404 means user info is missing in MS server
          if (error.response?.status === 404) {
            navigate('/user-info');
          }
        }
      }
    };
    checkUserInfo();
  }, [isAuthenticated, navigate]);

  React.useEffect(() => {
    const rotationTimer = window.setInterval(() => {
      setActiveHeroIndex((prevIndex) => (prevIndex + 1) % HERO_BANNERS.length);
    }, HERO_ROTATION_MS);

    return () => window.clearInterval(rotationTimer);
  }, []);


  const {
    data: topUserRankings,
    isLoading: userRankingLoading,
  } = useQuery({
    queryKey: ['home', 'user-rankings'],
    queryFn: () => rankingService.getUserRankings({ page: 1, limit: 3 }),
    staleTime: 60 * 1000,
    enabled: isUserVerified,
  });

  const {
    data: recentProblemsData,
    isLoading: recentProblemsLoading,
  } = useQuery({
    queryKey: ['home', 'recent-problems'],
    queryFn: () =>
      problemService.getMicroProblemList({
        page: 1,
        limit: 5,
        sortField: 'number',
        sortOrder: 'desc',
      }),
    staleTime: 60 * 1000,
  });

  const {
    data: dailyChallenge,
    isLoading: dailyChallengeLoading,
  } = useQuery({
    queryKey: ['home', 'daily-challenge'],
    queryFn: ({ signal }) => problemService.getDailyChallenge({ signal }),
    staleTime: 60 * 1000,
  });

  const { data: dailyChallengeDetail } = useQuery({
    queryKey: ['home', 'daily-challenge-detail', dailyChallenge?.problemId],
    enabled: Boolean(dailyChallenge?.problemId),
    queryFn: () => problemService.getProblem(dailyChallenge!.problemId),
    staleTime: 60 * 1000,
  });

  const recentProblems = useMemo(
    () => recentProblemsData?.data ?? [],
    [recentProblemsData?.data]
  );


  const userRanking = useMemo(
    () => ({
      items: topUserRankings?.data ?? [],
      loading: userRankingLoading,
    }),
    [topUserRankings?.data, userRankingLoading],
  );

  const heroSectionClassName = isAuthenticated
    ? 'relative w-full overflow-hidden bg-[#0A101F] text-white py-6 sm:py-8'
    : 'relative w-full overflow-hidden bg-[#0A101F] text-white pt-20 pb-8 sm:pt-24 sm:pb-10';

  const heroContentClassName = isAuthenticated
    ? 'flex min-h-[18rem] flex-col justify-between sm:min-h-[19.5rem] lg:min-h-[20.5rem]'
    : 'flex min-h-[22rem] flex-col justify-between sm:min-h-[23.5rem] lg:min-h-[24.5rem]';

  const heroBannerFrameClassName = isAuthenticated
    ? 'relative mt-3 min-h-[11rem] sm:min-h-[11.5rem] lg:min-h-[12rem]'
    : 'relative mt-4 min-h-[14rem] sm:min-h-[15rem] lg:min-h-[16rem]';

  const heroTitleClassName = isAuthenticated
    ? 'mt-4 text-5xl font-extrabold tracking-tight sm:mt-5 sm:text-6xl lg:text-7xl'
    : 'mt-8 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl';

  const heroIndicatorClassName = isAuthenticated
    ? 'mt-4 flex items-center gap-3 self-end sm:mt-5 lg:absolute lg:right-8 lg:bottom-6 xl:right-10 xl:bottom-8'
    : 'mt-4 flex items-center gap-3 self-end lg:absolute lg:right-8 lg:bottom-4 xl:right-10 xl:bottom-5';



  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 pb-12">
      {/* Full-width Dark Hero Section */}
      <section className={heroSectionClassName}>
        {/* Abstract Background Floating Elements */}
        {/* Top Right Element */}
        <div className="absolute top-10 right-32 opacity-20 transform rotate-12 pointer-events-none hidden lg:block">
          <svg width="180" height="120" viewBox="0 0 180 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="176" height="116" rx="8" stroke="#4B5563" strokeWidth="4" />
            <line x1="20" y1="30" x2="100" y2="30" stroke="#4B5563" strokeWidth="6" strokeLinecap="round" />
            <line x1="20" y1="60" x2="150" y2="60" stroke="#4B5563" strokeWidth="6" strokeLinecap="round" />
            <line x1="20" y1="90" x2="120" y2="90" stroke="#4B5563" strokeWidth="6" strokeLinecap="round" />
          </svg>
        </div>
        {/* Bottom Right Braces */}
        <div className="absolute bottom-10 right-1/4 opacity-10 transform -rotate-12 pointer-events-none hidden lg:block">
          <div className="text-9xl font-mono font-bold text-slate-400">{"{ }"}</div>
        </div>
        {/* Left Side Large Text */}
        <div className="absolute top-1/2 left-0 opacity-[0.02] text-[15rem] font-bold tracking-tighter pointer-events-none leading-none -translate-y-1/2 select-none hidden 2xl:block overflow-hidden whitespace-nowrap">
          CODE ROUND
        </div>
        {/* Subtle Glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className={`max-w-3xl ${heroContentClassName}`}>
            <div>
              <h1 className={heroTitleClassName} style={{ fontFamily: '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif' }}>
                H-Code Round
              </h1>

              <div className={heroBannerFrameClassName}>
                {HERO_BANNERS.map((banner, index) => {
                  const isActive = index === activeHeroIndex;
                  return (
                    <div
                      key={banner.eyebrow}
                      aria-hidden={!isActive}
                      className={`absolute inset-0 transition-all duration-700 ease-out ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
                    >
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">
                        {banner.eyebrow}
                      </p>
                      <h2 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl" style={{ fontFamily: '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif' }}>
                        <span className={`text-transparent bg-clip-text bg-gradient-to-r ${banner.gradientClassName}`}>
                          {banner.title[0]}
                          <br />
                          {banner.title[1]}
                        </span>
                      </h2>
                      <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                        {banner.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={heroIndicatorClassName}>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              {activeHeroIndex + 1} / {HERO_BANNERS.length}
            </div>
            <div className="flex items-center gap-2">
              {HERO_BANNERS.map((banner, index) => {
                const isActive = index === activeHeroIndex;
                return (
                  <button
                    key={banner.eyebrow}
                    type="button"
                    onClick={() => setActiveHeroIndex(index)}
                    aria-label={`${banner.eyebrow} 배너 보기`}
                    className={`h-2.5 rounded-full transition-all duration-300 ${isActive ? 'w-10 bg-white' : 'w-2.5 bg-white/30 hover:bg-white/60'}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-12">
        <div className="min-w-0">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left Area: Recommended Problems */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">최근 문제</h2>
                  <Link to="/problems" className="text-sm font-medium text-blue-600 hover:text-blue-400">
                    전체 보기 &gt;
                  </Link>
                </div>
                <ProblemList
                  problems={recentProblems}
                  isLoading={recentProblemsLoading}
                  onProblemClick={(problemId) => navigate(`/problems/${problemId}`)}
                />
              </div>

              {/* Right Sidebar */}
              <div className="w-full lg:w-[22rem] xl:w-96 shrink-0 flex flex-col gap-6">
            {/* 오늘의 도전 과제 */}
            <div className="relative overflow-hidden rounded-2xl bg-[#1A1F36] text-white shadow-xl">
              <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 4V2H6v2H2v3c0 2.62 1.91 4.78 4.41 4.97A6.02 6.02 0 0011 15.92V19H8v2h8v-2h-3v-3.08a6.02 6.02 0 004.59-3.95C20.09 11.78 22 9.62 22 7V4h-4zm-2 2v3a4 4 0 11-8 0V6h8zM4 7V6h2v3.53A2.99 2.99 0 014 7zm16 0a2.99 2.99 0 01-2 2.83V6h2v1z" />
                </svg>
              </div>
              <div className="relative p-6">
                <p className="text-xs font-semibold text-slate-400 mb-2">오늘의 도전 과제</p>
                <h3 className="text-xl font-bold leading-tight mb-2">
                  {dailyChallengeLoading
                    ? '오늘의 문제를 불러오는 중...'
                    : (dailyChallenge?.title || '오늘의 문제가 아직 없습니다.')}
                </h3>
                <div className="flex items-center gap-2 mb-8">
                  {(() => {
                    const meta = getDifficultyMeta(dailyChallengeDetail?.difficulty ?? 0);
                    if (!meta) return null;
                    return (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${meta.className}`}>
                        {meta.label}
                      </span>
                    );
                  })()}
                </div>

                <button
                  className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-500 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors shadow-sm"
                  onClick={() => {
                    if (dailyChallenge?.problemId) {
                      navigate(`/problems/${dailyChallenge.problemId}`);
                    }
                  }}
                  disabled={!dailyChallenge?.problemId}
                >
                  문제 풀기
                </button>
              </div>
            </div>

            {/* TOP Ranker */}
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6 dark:bg-slate-900/60 dark:ring-slate-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">TOP Ranker</h3>
              </div>

              <div className="space-y-5">
                {userRanking.loading ? (
                  <div className="animate-pulse space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                          <div className="h-2.5 w-16 rounded bg-slate-100 dark:bg-slate-800" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : userRanking.items.length > 0 ? (
                  userRanking.items.slice(0, 3).map((user, idx) => (
                    <div key={user.rank ?? idx} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={`${user.username} avatar`}
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{user.username}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500 text-center py-4">랭커 정보가 없습니다.</div>
                )}
              </div>
            </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};
