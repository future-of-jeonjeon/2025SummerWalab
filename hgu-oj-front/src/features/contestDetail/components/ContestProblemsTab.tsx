import React from 'react';
import type { Problem } from '../../../types';
import type { ContestLockReason } from '../types';
import { ContestProblemList } from '../../../components/organisms/ContestProblemList';
import { PROBLEM_STATUS_LABELS } from '../../../constants/problemStatus';

interface ContestProblemsTabProps {
  lockState: {
    locked: boolean;
    reason: ContestLockReason;
    message: string;
  };
  hasAccess: boolean;
  hasContestAdminOverride: boolean;
  problemsLoading: boolean;
  problemsError: unknown;
  processedContestProblems: Problem[];
  searchState: { query: string; field: 'title' | 'tag' | 'number' };
  sortState: { field: 'number' | 'submission' | 'accuracy'; order: 'asc' | 'desc' };
  statusFilter: string;
  handlers: {
    handleSearchChange: (value: string) => void;
    handleSearchSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    handleSearchFieldChange: (value: string) => void;
    handleStatusFilterChange: (value: string) => void;
    handleResetFilters: () => void;
    handleSortToggle: (field: 'number' | 'submission' | 'accuracy') => void;
  };
  onProblemClick: (problem: Problem) => void;
  myRankProgress: Record<number, string>;
}

export const ContestProblemsTab: React.FC<ContestProblemsTabProps> = ({
  lockState,
  hasAccess,
  hasContestAdminOverride,
  problemsLoading,
  problemsError,
  processedContestProblems,
  searchState,
  sortState,
  statusFilter,
  handlers,
  onProblemClick,
  myRankProgress,
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
    return <div className="text-sm text-gray-600">비밀번호 인증 후 문제를 확인할 수 있습니다.</div>;
  }

  if (problemsLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (problemsError) {
    return <div className="text-sm text-red-600">문제 목록을 불러오는 중 오류가 발생했습니다.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 sm:self-end lg:ml-auto lg:justify-end">
          <form onSubmit={handlers.handleSearchSubmit} className="flex w-full sm:w-auto sm:min-w-[360px]">
            <label htmlFor="contest-problem-search" className="sr-only">
              문제 검색
            </label>
            <input
              id="contest-problem-search"
              type="search"
              value={searchState.query}
              onChange={(event) => handlers.handleSearchChange(event.target.value)}
              placeholder="문제 검색..."
              className="w-full rounded-l-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={searchState.field}
              onChange={(event) => handlers.handleSearchFieldChange(event.target.value)}
              className="w-28 border-y border-r border-gray-300 bg-white px-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="title">제목</option>
              <option value="tag">태그</option>
              <option value="number">번호</option>
            </select>
            <button type="submit" className="min-w-[60px] rounded-r-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white text-center shadow-sm transition hover:bg-blue-700">
              검색
            </button>
          </form>
          <div className="flex w-full sm:w-auto sm:min-w-[220px] sm:justify-end">
            <label htmlFor="contest-problem-status-filter" className="sr-only">
              문제 상태 필터
            </label>
            <select
              id="contest-problem-status-filter"
              value={statusFilter}
              onChange={(event) => handlers.handleStatusFilterChange(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-28"
            >
              <option value="all">전체</option>
              <option value={PROBLEM_STATUS_LABELS.untouched}>{PROBLEM_STATUS_LABELS.untouched}</option>
              <option value={PROBLEM_STATUS_LABELS.solved}>{PROBLEM_STATUS_LABELS.solved}</option>
              <option value={PROBLEM_STATUS_LABELS.wrong}>{PROBLEM_STATUS_LABELS.wrong}</option>
            </select>
            <button
              type="button"
              onClick={handlers.handleResetFilters}
              className="ml-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 text-center shadow-sm transition hover:border-blue-400 hover:text-blue-600"
            >
              초기화
            </button>
          </div>
        </div>
      </div>

      <ContestProblemList
        problems={processedContestProblems}
        onProblemClick={onProblemClick}
        disabled={lockState.locked}
        statusOverrides={myRankProgress}
        onSortChange={handlers.handleSortToggle}
        sortField={sortState.field}
        sortOrder={sortState.order}
      />
    </div>
  );
};
