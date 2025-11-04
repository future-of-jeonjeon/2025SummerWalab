import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rankingService } from '../services/rankingService';
import {
  OrganizationRankingEntry,
  UserRankingEntry,
} from '../types';
import { RankingSection } from '../components/ranking/RankingSection';
import {
  RankingTable,
  RankingTableColumn,
} from '../components/ranking/RankingTable';
import { RankingPagination } from '../components/ranking/RankingPagination';
import { Button } from '../components/atoms/Button';

const USER_RANKING_PAGE_SIZE = 25;
const ORGANIZATION_RANKING_PAGE_SIZE = 15;

const formatNumber = (value?: number): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  return value.toLocaleString();
};

const formatPercentage = (value?: number): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  return `${value.toFixed(2)}%`;
};

const fallbackAvatar = (seed: string) => {
  const colors = ['bg-blue-100 text-blue-600', 'bg-emerald-100 text-emerald-600', 'bg-indigo-100 text-indigo-600', 'bg-amber-100 text-amber-600'];
  const index = seed.charCodeAt(0) % colors.length;
  const initials = seed
    .split(/\s|_/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return {
    className: colors[index],
    initials: initials || 'U',
  };
};

const buildUserColumns = (): RankingTableColumn<UserRankingEntry>[] => [
  {
    key: 'rank',
    header: '순위',
    width: '80px',
    align: 'center',
  },
  {
    key: 'username',
    header: '사용자',
    render: (row) => {
      const displayName = row.realName ? `${row.username} · ${row.realName}` : row.username;
      const avatarSeed = row.username ?? String(row.rank);
      const fallback = fallbackAvatar(avatarSeed);

      return (
        <div className="flex items-center gap-3">
          {row.avatarUrl ? (
            <img
              src={row.avatarUrl}
              alt={row.username}
              className="h-10 w-10 rounded-full border border-gray-200 object-cover"
            />
          ) : (
            <div className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${fallback.className}`}>
              {fallback.initials}
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900 dark:text-slate-100">{displayName}</span>
            {row.organization && (
              <span className="text-xs text-gray-500 dark:text-slate-400">{row.organization}</span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    key: 'solvedCount',
    header: '푼 문제 수',
    align: 'right',
    render: (row: UserRankingEntry) => (
      <span className="font-medium text-gray-900 dark:text-slate-100">
        {formatNumber(row.solvedCount)}
      </span>
    ),
  },
  {
    key: 'submissionCount',
    header: '제출 수',
    align: 'right',
    render: (row: UserRankingEntry) => formatNumber(row.submissionCount),
  },
  {
    key: 'accuracy',
    header: '정답률',
    align: 'right',
    render: (row: UserRankingEntry) => formatPercentage(row.accuracy),
  },
];

const organizationColumns: RankingTableColumn<OrganizationRankingEntry>[] = [
  {
    key: 'rank',
    header: '순위',
    width: '80px',
    align: 'center',
  },
  {
    key: 'name',
    header: '조직',
    render: (row) => (
      <div className="flex flex-col">
        <span className="font-semibold text-gray-900 dark:text-slate-100">{row.name}</span>
        {row.description && (
          <span className="text-xs text-gray-500 dark:text-slate-400">{row.description}</span>
        )}
      </div>
    ),
  },
  {
    key: 'totalMembers',
    header: '참여자',
    align: 'right',
    render: (row) => formatNumber(row.totalMembers),
  },
  {
    key: 'totalSolved',
    header: '총 해결 수',
    align: 'right',
    render: (row) => formatNumber(row.totalSolved),
  },
  {
    key: 'totalSubmission',
    header: '총 제출 수',
    align: 'right',
    render: (row) => formatNumber(row.totalSubmission),
  },
  {
    key: 'accuracy',
    header: '평균 정답률',
    align: 'right',
    render: (row) => formatPercentage(row.accuracy),
  },
];

export const RankingPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [organizationPage, setOrganizationPage] = useState(1);
  const [activeView, setActiveView] = useState<'user' | 'organization'>('user');

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ranking', 'user', 'ACM', page, USER_RANKING_PAGE_SIZE],
    queryFn: ({ signal }) =>
      rankingService.getUserRankings(
        { page, limit: USER_RANKING_PAGE_SIZE, rule: 'ACM' },
        { signal },
      ),
    keepPreviousData: true,
  });

  const {
    data: organizationData,
    isLoading: isOrganizationLoading,
    error: organizationError,
  } = useQuery({
    queryKey: ['ranking', 'organization', organizationPage, ORGANIZATION_RANKING_PAGE_SIZE],
    queryFn: ({ signal }) =>
      rankingService.getOrganizationRankings(
        { page: organizationPage, limit: ORGANIZATION_RANKING_PAGE_SIZE },
        { signal },
      ),
    keepPreviousData: true,
  });

  const userColumns = useMemo(() => buildUserColumns(), []);
  const userRankings = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.total ?? 0;

  const organizationRankings = organizationData?.data ?? [];
  const organizationTotalPages = organizationData?.totalPages ?? 1;
  const organizationTotalItems = organizationData?.total ?? 0;

  const queryError = error instanceof Error ? error.message : undefined;
  const organizationErrorMessage = organizationError instanceof Error ? organizationError.message : undefined;

  const handlePreviousPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleOrganizationPrevious = () => {
    setOrganizationPage((prev) => Math.max(1, prev - 1));
  };

  const handleOrganizationNext = () => {
    setOrganizationPage((prev) => Math.min(organizationTotalPages, prev + 1));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 2xl:max-w-screen-2xl 2xl:px-10">
        <header className="mb-8 flex flex-col gap-4 text-gray-900 dark:text-slate-100">
          <h1 className="text-3xl font-bold tracking-tight">랭킹 센터</h1>
          <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 p-1 dark:bg-slate-800/70">
            <Button
              size="sm"
              variant={activeView === 'user' ? 'primary' : 'ghost'}
              onClick={() => setActiveView('user')}
            >
              유저 랭킹
            </Button>
            <Button
              size="sm"
              variant={activeView === 'organization' ? 'primary' : 'ghost'}
              onClick={() => setActiveView('organization')}
            >
              조직 랭킹
            </Button>
          </div>
        </header>

        <div className="space-y-8">
          {activeView === 'user' && (
            <RankingSection title="유저 랭킹">
              <RankingTable
                columns={userColumns}
                data={userRankings}
                loading={isLoading}
                error={queryError}
                skeletonRowCount={10}
              />
              <RankingPagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={USER_RANKING_PAGE_SIZE}
                onPrevious={handlePreviousPage}
                onNext={handleNextPage}
              />
            </RankingSection>
          )}

          {activeView === 'organization' && (
            <RankingSection title="조직 랭킹">
              <RankingTable
                columns={organizationColumns}
                data={organizationRankings}
                loading={isOrganizationLoading}
                error={organizationErrorMessage}
                skeletonRowCount={8}
              />
              <RankingPagination
                page={organizationPage}
                totalPages={organizationTotalPages}
                totalItems={organizationTotalItems}
                pageSize={ORGANIZATION_RANKING_PAGE_SIZE}
                onPrevious={handleOrganizationPrevious}
                onNext={handleOrganizationNext}
              />
            </RankingSection>
          )}
        </div>
      </main>
    </div>
  );
};

export default RankingPage;
