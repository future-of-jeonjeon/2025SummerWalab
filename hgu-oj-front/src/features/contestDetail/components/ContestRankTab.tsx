import React from 'react';
import type { ContestRankEntry } from '../../../types';
import type { ContestLockReason } from '../types';
import { ContestRankTable } from '../../../components/organisms/ContestRankTable';

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
}

export const ContestRankTab: React.FC<ContestRankTabProps> = ({
  lockState,
  hasAccess,
  hasContestAdminOverride,
  rankLoading,
  rankError,
  entries,
}) => {
  if (lockState.locked) {
    if (lockState.reason === 'verifying') {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-gray-600">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          <span>참여 여부를 확인하는 중입니다.</span>
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
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (rankError) {
    return <div className="text-sm text-red-600">랭크 정보를 불러오는 중 오류가 발생했습니다.</div>;
  }

  return <ContestRankTable entries={entries} />;
};
