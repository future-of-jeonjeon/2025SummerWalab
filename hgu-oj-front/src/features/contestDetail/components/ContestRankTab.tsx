import React from 'react';
import type { ContestRankEntry } from '../../../types';
import type { ContestLockReason } from '../types';
import { ContestRankTable } from '../../../components/organisms/ContestRankTable';

import { useAuthStore } from '../../../stores/authStore';

interface ContestRankTabProps {
  lockState: {
    locked: boolean;
    reason: ContestLockReason;
    message: string;
  };
  hasAccess: boolean;
  hasContestAdminOverride: boolean;
  rankLoading: boolean;
  rankError: unknown;
  entries: ContestRankEntry[];
  ruleType?: string;
}

export const ContestRankTab: React.FC<ContestRankTabProps> = ({
  lockState,
  hasAccess,
  hasContestAdminOverride,
  rankLoading,
  rankError,
  entries,
  ruleType,
}) => {
  const user = useAuthStore((state) => state.user);

  if (lockState.locked) {
    if (lockState.reason === 'verifying') {
      return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
          <div className="p-8 flex justify-center">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      );
    }
    return <div className="text-sm text-gray-600">{lockState.message}</div>;
  }

  if (!hasAccess && !hasContestAdminOverride) {
    return <div className="text-sm text-gray-600">비밀번호 인증 후 랭크를 확인할 수 있습니다.</div>;
  }

  if (rankLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-1 h-4 bg-gray-200 rounded"></div>
            <div className="col-span-4 h-4 bg-gray-200 rounded"></div>
            <div className="col-span-3 h-4 bg-gray-200 rounded"></div>
            <div className="col-span-4 h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-6 py-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-1 h-4 bg-gray-200 rounded"></div>
                <div className="col-span-4 h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="col-span-3 h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                <div className="col-span-4 h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (rankError) {
    return <div className="text-sm text-red-600">랭크 정보를 불러오는 중 오류가 발생했습니다.</div>;
  }

  return <ContestRankTable entries={entries} ruleType={ruleType} currentUserId={Number(user?.id)} />;
};
