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

  const { contestPhase, serverClock, timeLeft, startTimeDisplay, endTimeDisplay } = useContestTimer(contest);
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
    const myEntry = rankEntries.find((entry) => entry.user.id === authUser.id);
    return myEntry?.totalScore ?? 0;
  }, [rankEntries, authUser?.id]);

  const myRank = useMemo(() => {
    if (!authUser?.id) return null;
    const myEntry = rankEntries.find((entry) => entry.user.id === authUser.id);
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
    (problem: { displayId?: string | number; _id?: string | number; id?: number }) => {
      const displayId = problem.displayId ?? (problem as { _id?: string | number })._id ?? problem.id;
      const query = new URLSearchParams();
      query.set('contestId', String(contestId));
      if (displayId != null) {
        query.set('displayId', String(displayId));
      }
      const externalId = String(problem._id ?? problem.displayId ?? problem.id ?? '').trim();
      if (externalId) {
        navigate(`/problems/${encodeURIComponent(externalId)}?${query.toString()}`);
      }
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
        <p className="text-gray-600">{error instanceof Error ? error.message : '정보를 가져오는 중 오류가 발생했습니다.'}</p>
        <Button variant="secondary" className="mt-6 w-fit min-w-[180px]" onClick={() => navigate('/contests')}>
          대회 목록으로 이동
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {contestLockedForUser && (
          <Card className="mb-6 border border-amber-200 bg-amber-50 px-6 py-4 text-amber-800 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-100">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold">{lockBannerText}</span>
              <span className="text-sm">
                현재 서버 시간: <span className="font-mono text-base">{serverClock}</span>
              </span>
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

        <div className="flex flex-col lg:flex-row gap-6 mt-6">
          <aside className="w-[180px] min-w-[180px] max-w-[180px] space-y-2">
            {tabs.map((tab) => {
              const disabled = disabledTabs(tab.id);
              const isActive = activeTab === tab.id;
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
                  className={`w-full text-center whitespace-nowrap px-4 py-3 rounded-lg font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-blue-50'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </aside>

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
