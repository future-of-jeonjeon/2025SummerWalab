import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { useStats } from '../hooks/useStats';

export const HomePage: React.FC = () => {
  const { problemCount, workbookCount, contestCount } = useStats();

  const stats = [
    {
      label: '문제 수',
      value: problemCount ?? '--',
      accent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    },
    {
      label: '문제집',
      value: workbookCount ?? '--',
      accent: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
    },
    {
      label: '진행 중인 대회',
      value: contestCount ?? '--',
      accent: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200',
    },
  ];

  const quickLinks = [
    {
      title: '문제 풀기',
      description: '실시간 채점과 다양한 언어 지원으로 바로 실력을 테스트해 보세요.',
      to: '/problems',
      accent: 'from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-transparent',
    },
    {
      title: '문제집 둘러보기',
      description: '학습 목표에 맞는 큐레이션 문제집을 선택해 단계적으로 연습하세요.',
      to: '/workbooks',
      accent: 'from-sky-500/10 to-sky-500/5 dark:from-sky-500/20 dark:to-transparent',
    },
    {
      title: '대회 참가하기',
      description: '정기적으로 열리는 대회에 참여해 실전 감각을 키워보세요.',
      to: '/contests',
      accent: 'from-cyan-500/10 to-cyan-500/5 dark:from-cyan-500/20 dark:to-transparent',
    },
  ];

  const features = [
    {
      title: '실시간 채점 시스템',
      description: '제출 즉시 결과를 확인하고, 다양한 언어와 채점 로그로 빠르게 피드백을 받습니다.',
      icon: (
        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1 4h1m-1 0v1m3-5a4 4 0 10-8 0 4 4 0 008 0zm5 4a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: '학습을 돕는 문제집',
      description: '난이도와 주제별로 정리된 문제집으로 체계적인 학습을 진행할 수 있습니다.',
      icon: (
        <svg className="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      title: '경쟁과 협업',
      description: '대회 모드와 팀 기능으로 동료들과 함께 경쟁하고 성장할 수 있습니다.',
      icon: (
        <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-1a4 4 0 00-4-4h-1m-6 5v-1a4 4 0 014-4h2a4 4 0 014 4v1M9 13l3 3 6-6m-2-5a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-12 space-y-12">
        <section className="grid gap-6 lg:grid-cols-[1.8fr,1fr] items-stretch">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-white shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/70 via-sky-500/70 to-cyan-400/70" />
            <div className="relative flex h-full flex-col justify-between p-10 space-y-10">
              <div>
                <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-medium uppercase tracking-wide">
                  Why Not Change The World?
                </span>
                <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
                  한동인을 위한 온라인 저지 플랫폼
                </h1>
                <p className="mt-4 max-w-2xl text-base sm:text-lg text-white/90">
                  매일 새로운 문제를 풀고, 팀과 함께 문제집을 구성하며, 실전과 같은 대회에 참가해 보세요.
                </p>
              </div>
            </div>
          </div>

          <Card className="rounded-3xl h-full bg-white/80 shadow-lg dark:bg-slate-900/80" padding="lg" shadow="lg">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              플랫폼 한눈에 보기
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              지금 바로 도전하고 싶은 영역을 선택해보세요.
            </p>
            <div className="mt-6 space-y-4">
              {stats.map(({ label, value, accent }) => (
                <div key={label} className="flex items-center justify-between rounded-2xl bg-slate-100/80 px-4 py-3 text-sm font-medium dark:bg-slate-800/80">
                  <span>{label}</span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${accent}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">빠르게 시작하기</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                가장 자주 사용하는 기능으로 바로 이동하세요.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickLinks.map(({ title, description, to, accent }) => (
              <Link key={title} to={to} className="group">
                <Card
                  className={`h-full overflow-hidden border-0 bg-white shadow-md transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-xl dark:bg-slate-900 ${accent ? `bg-gradient-to-br ${accent}` : ''}`}
                  padding="lg"
                  shadow="md"
                  hover
                >
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {description}
                    </p>
                  </div>
                  <div className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 transition-colors group-hover:text-blue-700 dark:text-blue-300 dark:group-hover:text-blue-200">
                    바로가기
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">HGU OJ의 핵심 기능</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              실력 향상과 협업을 위한 기능들을 한 곳에 모았습니다.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map(({ title, description, icon }) => (
              <Card key={title} className="h-full border-0 bg-white/80 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/80" padding="lg" shadow="md">
                <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200">
                  {icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <Card className="flex flex-col gap-6 rounded-3xl border-0 bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 p-8 text-white shadow-xl dark:from-blue-700 dark:via-sky-600 dark:to-cyan-500">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">지금 바로 도전해 보세요</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/90">
                꾸준한 학습이 실력을 만듭니다. 오늘 한 문제라도 해결해 보세요. 내일의 실력이 바뀝니다.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/contests" className="flex-1 sm:flex-none">
                <Button variant="secondary" className="w-full bg-white/90 text-blue-700 hover:bg-white" size="lg">
                  진행 중인 대회 보기
                </Button>
              </Link>
              <Link to="/workbooks" className="flex-1 sm:flex-none">
                <Button className="w-full sm:w-auto" size="lg">
                  학습 계획 세우기
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
};
