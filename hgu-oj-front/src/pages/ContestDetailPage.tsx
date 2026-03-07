import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useContest, useContestRank } from '../hooks/useContests';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/atoms/Button';
import { Card } from '../components/atoms/Card';
import { useContestTimer } from '../features/contestDetail/hooks/useContestTimer';
import { useContestAccessState } from '../features/contestDetail/hooks/useContestAccessState';
import { useContestAnnouncementsManager } from '../features/contestDetail/hooks/useContestAnnouncementsManager';
import { useContestProblemsController } from '../features/contestDetail/hooks/useContestProblemsController';
import { useContestUserManagement } from '../features/contestDetail/hooks/useContestUserManagement';
import { ContestOverviewTab } from '../features/contestDetail/components/ContestOverviewTab';
import { ContestAnnouncementsSection } from '../features/contestDetail/components/ContestAnnouncementsSection';
import { ContestProblemsTab } from '../features/contestDetail/components/ContestProblemsTab';
import { ContestRankTab } from '../features/contestDetail/components/ContestRankTab';
import { ContestUserManagementTab } from '../features/contestDetail/components/ContestUserManagementTab';
import { ContestSubmissionDetailsTab } from '../features/contestDetail/components/ContestSubmissionDetailsTab';

import type { ContestTab } from '../features/contestDetail/types';

// Removed status label

const baseTabs: Array<{ id: ContestTab; label: string; requiresAccess?: boolean }> = [
  { id: 'overview', label: '메인' },
  { id: 'problems', label: '대회 문제', requiresAccess: true },
  { id: 'rank', label: '랭크', requiresAccess: true },
];

const parseTabFromSearch = (search: string, availableTabs: Array<{ id: ContestTab }>): ContestTab | null => {
  const params = new URLSearchParams(search);
  const candidate = params.get('tab') as ContestTab | null;
  if (candidate && availableTabs.some((item) => item.id === candidate)) {
    return candidate;
  }
  return null;
};

export const ContestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const contestId = id ? Number(id) : 0;
  const navigate = useNavigate();
  const location = useLocation();

  const { data: contest, isLoading, error } = useContest(contestId);
  const requiresPassword = useMemo(() => contest?.contestType?.toLowerCase().includes('password') ?? false, [contest?.contestType]);

  const { user: authUser } = useAuthStore();
  const isAuthenticated = Boolean(authUser?.id);
  const isRootUser = useMemo(() => authUser?.username?.toLowerCase() === 'root', [authUser?.username]);
  const normalizedAdminType = useMemo(() => (authUser?.admin_type ?? '').toLowerCase().replace(/[_-]+/g, ' '), [authUser?.admin_type]);
  const isSuperAdmin = useMemo(() => normalizedAdminType.includes('super admin'), [normalizedAdminType]);
  const hasPrivilegedAccess = isRootUser || isSuperAdmin;
  const isAdminUser = useMemo(() => authUser?.admin_type?.includes('Admin') ?? false, [authUser?.admin_type]);
  const hasContestAdminOverride = hasPrivilegedAccess || isAdminUser;
  const contestOwnerId = contest?.createdBy?.id ?? (contest as { created_by_id?: number })?.created_by_id ?? null;
  const isContestOwner = Boolean(authUser?.id && contestOwnerId && authUser.id === contestOwnerId);
  const canManageAnnouncements = hasPrivilegedAccess || isContestOwner;

  const tabs = useMemo(() => {
    const list = [...baseTabs];
    if (isAdminUser) {
      list.splice(4, 0, { id: 'user-management', label: '유저 관리' });
      list.splice(5, 0, { id: 'submission-details', label: '제출 상세정보', requiresAccess: true });
    }
    return list;
  }, [isAdminUser]);

  const [activeTab, setActiveTab] = useState<ContestTab>(() => parseTabFromSearch(location.search, tabs) ?? 'overview');

  useEffect(() => {
    const queryTab = parseTabFromSearch(location.search, tabs);
    if (queryTab && queryTab !== activeTab) {
      setActiveTab(queryTab);
    }
  }, [location.search, tabs, activeTab]);

  const handleTabChange = useCallback(
    (tabId: ContestTab) => {
      setActiveTab(tabId);
      const params = new URLSearchParams(location.search);
      params.set('tab', tabId);
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    },
    [location.pathname, location.search, navigate],
  );

  const { contestPhase, timeLeft, startTimeDisplay, endTimeDisplay } = useContestTimer(contest);
  const timeTextClass = useMemo(
    () => (timeLeft.includes('종료') ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'),
    [timeLeft],
  );

  const protectedContentRef = useRef<() => void>(() => { });
  const accessState = useContestAccessState({
    contestId,
    contest,
    contestPhase,
    requiresPassword,
    requiresApproval: contest?.requiresApproval ?? false,
    isAuthenticated,
    hasContestAdminOverride,
    onProtectedAccessGranted: () => protectedContentRef.current(),
  });

  const {
    hasAccess,
    password,
    setPassword,
    passwordError,
    accessLoading,
    passwordMutationPending,
    handlePasswordSubmit,
    contestLockReason,
    contestLockedForUser,
    lockBannerText,
    canViewProtectedContent,
    membershipLoading,
    membershipErrorMessage,
    hasJoinedContest,
    isPendingApproval,
    isRejectedMembership,
    refetchMembership,
    joinFeedback,
    handleJoinContest,
    joinActionDisabled,
    shouldShowJoinCard,
    showJoinButton,
    showLoginPrompt,
    getContestLockMessage,
  } = accessState;

  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  const canFetchAnnouncements = canManageAnnouncements || (!contestLockedForUser && (hasAccess || hasContestAdminOverride));
  const { refetchAnnouncements, ...announcementManager } = useContestAnnouncementsManager({
    contestId,
    canFetch: canFetchAnnouncements,
    onSuccess: () => setIsAnnouncementModalOpen(false),
  });

  const shouldLoadRank = canViewProtectedContent;
  const {
    data: publicRankData,
    isLoading: publicRankLoading,
    error: publicRankError,
    refetch: refetchPublicRank,
  } = useContestRank(contestId, shouldLoadRank);

  const {
    data: adminRankData,
    refetch: refetchAdminRank,
  } = useContestRank(contestId, shouldLoadRank && isAdminUser, { isAdmin: true });

  const rankEntries = publicRankData?.results ?? [];
  const adminRankEntries = adminRankData?.results ?? [];

  const myScore = useMemo(() => {
    if (!authUser?.id) return 0;
    const normalizedAuthUserId = Number(authUser.id);
    const myEntry = rankEntries.find((entry) => Number(entry.user.id) === normalizedAuthUserId);
    return myEntry?.totalScore ?? 0;
  }, [rankEntries, authUser?.id]);

  const myRank = useMemo(() => {
    if (!authUser?.id) return null;
    const normalizedAuthUserId = Number(authUser.id);
    const myEntry = rankEntries.find((entry) => Number(entry.user.id) === normalizedAuthUserId);
    return myEntry?.rank ?? null;
  }, [rankEntries, authUser?.id]);

  const totalParticipants = publicRankData?.total ?? rankEntries.length;

  const problemsController = useContestProblemsController({
    contestId,
    canFetch: contestId > 0,
    canViewProtectedContent,
    fallbackProblemCount: contest?.problemCount,
    rankEntries,
    authUserId: authUser?.id,
    ruleType: contest?.ruleType,
  });

  const { refetchProblems, processedContestProblems, myRankProgress, totalProblems, solvedProblems } =
    problemsController;

  useEffect(() => {
    protectedContentRef.current = () => {
      refetchAnnouncements();
      refetchProblems();
      refetchPublicRank();
      if (isAdminUser) {
        refetchAdminRank();
      }
    };
  }, [refetchAnnouncements, refetchProblems, refetchPublicRank, refetchAdminRank, isAdminUser]);

  useEffect(() => {
    if (activeTab === 'problems' && canViewProtectedContent) {
      refetchProblems();
      refetchPublicRank();
    }
  }, [activeTab, canViewProtectedContent, refetchProblems, refetchPublicRank]);

  const shouldLoadUserManagement = isAdminUser && activeTab === 'user-management';
  const userManagement = useContestUserManagement({
    contestId,
    shouldLoad: shouldLoadUserManagement,
    authUserId: authUser?.id,
    onMembershipRefresh: refetchMembership,
  });

  useEffect(() => {
    if (activeTab !== 'user-management') {
      userManagement.setFeedback(null);
    }
  }, [activeTab, userManagement]);

  const announcementsNode = canFetchAnnouncements ? (
    <ContestAnnouncementsSection
      canManage={canManageAnnouncements}
      manager={announcementManager}
      isModalOpen={isAnnouncementModalOpen}
      onOpenModal={() => setIsAnnouncementModalOpen(true)}
      onCloseModal={() => setIsAnnouncementModalOpen(false)}
    />
  ) : null;

  const disabledTabs = useCallback(
    (tabId: ContestTab) => {
      const tabConfig = tabs.find((item) => item.id === tabId);
      if (!tabConfig?.requiresAccess) {
        return false;
      }
      if (hasContestAdminOverride) {
        return false;
      }
      if (contestLockReason) {
        return true;
      }
      return !hasAccess;
    },
    [tabs, hasContestAdminOverride, contestLockReason, hasAccess],
  );

  // Removed contestStatus
  const lockState = {
    locked: contestLockedForUser,
    reason: contestLockReason,
  };

  const overviewJoinState = {
    shouldShowJoinCard,
    contestPhase,
    hasJoinedContest,
    isPendingApproval,
    isRejectedMembership,
    isAuthenticated,
    showLoginPrompt,
    showJoinButton,
    joinActionDisabled,
    joinFeedback,
    membershipLoading,
    membershipErrorMessage,
    onJoinClick: handleJoinContest,
    onNavigateLogin: () => navigate('/login'),
  };

  const overviewAccessState = {
    hasAccess,
    requiresPassword,
    accessLoading,
    password,
    passwordError,
    passwordPending: passwordMutationPending,
    onPasswordChange: setPassword,
    onPasswordSubmit: handlePasswordSubmit,
  };

  const onProblemClick = useCallback(
    (problem: { id?: number; _id?: string }) => {
      const problemKey = typeof problem._id === 'string' && problem._id.trim().length > 0
        ? problem._id.trim()
        : (Number.isFinite(Number(problem.id)) && Number(problem.id) > 0 ? String(problem.id) : null);
      if (!problemKey) {
        return;
      }
      const query = new URLSearchParams();
      query.set('contestId', String(contestId));
      navigate(`/problems/${encodeURIComponent(problemKey)}?${query.toString()}`);
    },
    [contestId, navigate],
  );

  if (!contestId) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg">유효하지 않은 대회입니다.</div>
        <Button className="mt-4 w-fit min-w-[180px] bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/contests')}>
          대회 목록으로 돌아가기
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg mb-4">대회를 불러오지 못했습니다.</div>
        <p className="text-gray-600 dark:text-slate-400">{error instanceof Error ? error.message : '정보를 가져오는 중 오류가 발생했습니다.'}</p>
        <Button variant="secondary" className="mt-6 w-fit min-w-[180px]" onClick={() => navigate('/contests')}>
          대회 목록으로 이동
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {contestLockedForUser && (
          <Card className="mb-6 border border-amber-200 bg-amber-50 px-6 py-4 text-amber-800 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-100">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold">{lockBannerText}</span>
            </div>
            {contestLockReason === 'not-joined' && (
              <div className="mt-2 text-sm text-amber-700 dark:text-amber-100">대회 시작 전 메인 탭에서 참여 신청을 완료해야 입장할 수 있습니다.</div>
            )}
            {contestLockReason === 'verifying' && (
              <div className="mt-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-100">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-amber-500" />
                참여 여부를 확인하는 중입니다.
              </div>
            )}
          </Card>
        )}

        {/* Mobile Nav Placeholder */}
        <div className="lg:hidden mb-4 mt-6 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <span className="font-bold text-gray-900 dark:text-slate-100">대회 메뉴</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:mt-6">
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden sticky top-24">
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60">
                <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 leading-tight">{contest?.title || '대회'}</h2>
                {contest?.organization_name && (
                  <div className="text-xs text-gray-500 dark:text-slate-400 font-medium mt-1 mb-2">
                    - {contest.organization_name}
                  </div>
                )}
                {!contest?.organization_name && <div className="mb-2"></div>}
                <div className="text-xs text-gray-500 dark:text-slate-400 font-medium tracking-wide uppercase">대회 메뉴</div>
              </div>
              <nav className="p-2 space-y-1">
                {tabs.map((tab) => {
                  const disabled = disabledTabs(tab.id);
                  const isActive = activeTab === tab.id;

                  let iconPath = null;
                  if (tab.id === 'overview') {
                    iconPath = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />;
                  } else if (tab.id === 'problems') {
                    iconPath = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />;
                  } else if (tab.id === 'rank') {
                    iconPath = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />;
                  } else if (tab.id === 'user-management') {
                    iconPath = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />;
                  } else if (tab.id === 'submission-details') {
                    iconPath = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />;
                  }

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        if (!disabled) {
                          handleTabChange(tab.id);
                        }
                      }}
                      disabled={disabled}
                      aria-disabled={disabled}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : disabled
                          ? 'text-gray-400 dark:text-slate-500 opacity-50 cursor-not-allowed'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                    >
                      {iconPath && (
                        <svg className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-300' : 'text-gray-400 dark:text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {iconPath}
                        </svg>
                      )}
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          <div className="flex-1 space-y-6 min-w-0 w-full">
            {activeTab === 'overview' && (
              <ContestOverviewTab
                contest={contest}
                timeData={{ startTimeDisplay, endTimeDisplay, timeLeftDisplay: timeLeft || '-', timeTextClass }}
                stats={{ solvedProblems, totalProblems, myScore, myRank, totalParticipants }}
                joinState={overviewJoinState}
                accessState={overviewAccessState}
                announcementsNode={announcementsNode}
              />
            )}

            {activeTab === 'problems' && (
              <ContestProblemsTab
                lockState={{
                  locked: lockState.locked,
                  reason: lockState.reason,
                  message: getContestLockMessage('problems'),
                }}
                hasAccess={hasAccess}
                hasContestAdminOverride={hasContestAdminOverride}
                canViewProtectedContent={canViewProtectedContent}
                problemsLoading={problemsController.problemsLoading}
                problemsError={problemsController.problemsError}
                processedContestProblems={processedContestProblems}
                searchState={problemsController.searchState}
                sortState={problemsController.sortState}
                statusFilter={problemsController.statusFilter}
                handlers={problemsController.handlers}
                onProblemClick={onProblemClick}
                myRankProgress={myRankProgress}
              />
            )}

            {activeTab === 'rank' && (
              <ContestRankTab
                lockState={{
                  locked: lockState.locked,
                  reason: lockState.reason,
                  message: getContestLockMessage('rank'),
                }}
                hasAccess={hasAccess}
                hasContestAdminOverride={hasContestAdminOverride}
                rankLoading={publicRankLoading}
                rankError={publicRankError}
                entries={rankEntries}
                ruleType={contest?.ruleType}
              />
            )}

            {activeTab === 'user-management' && (
              <ContestUserManagementTab
                isAdminUser={isAdminUser}
                registrations={userManagement.registrations}
                loading={userManagement.isLoading}
                errorMessage={userManagement.errorMessage}
                feedback={userManagement.feedback}
                onDecision={userManagement.handleDecision}
                decisionState={userManagement.decisionState}
              />
            )}

            {activeTab === 'submission-details' && (
              <ContestSubmissionDetailsTab
                contestId={contestId}
                isAdminUser={isAdminUser}
                rankEntries={adminRankEntries}
                problems={problemsController.problems}
              />
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
