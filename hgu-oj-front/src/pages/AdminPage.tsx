import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import codeTemplates from '../config/codeTemplates.json';
import { Card } from '../components/atoms/Card';
import { Input } from '../components/atoms/Input';
import { Button } from '../components/atoms/Button';
import {
  adminService,
  CreateContestPayload,
  CreateProblemPayload,
  CreateWorkbookPayload,
  UpdateUserPayload,
  UpdateContestPayload,
  AdminProblemDetail,
  UpdateProblemPayload,
} from '../services/adminService';
import { problemService } from '../services/problemService';
import { useAuthStore } from '../stores/authStore';
import {
  Problem,
  Workbook,
  WorkbookProblem,
  AdminUser,
  AdminContest,
  JudgeServer,
  ServiceHealthStatus,
} from '../types';
import { RichTextEditor } from '../components/molecules/RichTextEditor';

const templateMap = codeTemplates as Record<string, string>;
const availableLanguages = Object.keys(templateMap);
const canonicalLanguageSet = new Set(availableLanguages);
const LANGUAGE_ALIAS_MAP: Record<string, string> = {
  c: 'c',
  c11: 'c',
  c99: 'c',
  cgcc: 'c',
  cclang: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  cplusplus: 'cpp',
  'g++': 'cpp',
  gplusplus: 'cpp',
  cpp17: 'cpp',
  java: 'java',
  openjdk: 'java',
  java11: 'java',
  javascript: 'javascript',
  js: 'javascript',
  node: 'javascript',
  nodejs: 'javascript',
  javascriptes: 'javascript',
  python: 'python',
  py: 'python',
  python3: 'python',
  python37: 'python',
};

const LANGUAGE_BACKEND_VALUE_MAP: Record<string, string> = {
  javascript: 'JavaScript',
  python: 'Python3',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
};

const getLanguageBackendValue = (key: string): string => LANGUAGE_BACKEND_VALUE_MAP[key] ?? key;

const getLanguageLabel = (key: string): string => {
  const backend = getLanguageBackendValue(key);
  if (backend === key) {
    return key.charAt(0).toUpperCase() + key.slice(1);
  }
  return backend;
};

const normalizeLanguageKey = (value: string): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const lower = trimmed.toLowerCase();
  if (canonicalLanguageSet.has(lower)) {
    return lower;
  }
  const sanitized = lower.replace(/[\s._-]+/g, '');
  if (canonicalLanguageSet.has(sanitized)) {
    return sanitized;
  }
  const alias =
    LANGUAGE_ALIAS_MAP[lower] ??
    LANGUAGE_ALIAS_MAP[sanitized];

  if (alias && canonicalLanguageSet.has(alias)) {
    return alias;
  }

  return canonicalLanguageSet.has(trimmed) ? trimmed : null;
};

const normalizeLanguageList = (languages: unknown): string[] => {
  if (!Array.isArray(languages)) {
    return [];
  }
  const collected = new Set<string>();
  for (const entry of languages) {
    const normalized = normalizeLanguageKey(typeof entry === 'string' ? entry : String(entry));
    if (normalized) {
      collected.add(normalized);
    }
  }
  return availableLanguages.filter((lang) => collected.has(lang));
};
const toBackendLanguageList = (languages: string[]): string[] =>
  languages.map((lang) => getLanguageBackendValue(lang));
const USER_PAGE_SIZE = 20;
const PROBLEM_EDIT_PAGE_SIZE = 10;

const mapAdminUserToForm = (user: AdminUser): UpdateUserPayload => ({
  id: user.id,
  username: user.username ?? '',
  real_name: user.real_name ?? '',
  email: user.email ?? '',
  password: '',
  admin_type: user.admin_type ?? 'Regular User',
  problem_permission: user.problem_permission ?? 'None',
  two_factor_auth: Boolean(user.two_factor_auth),
  open_api: Boolean(user.open_api),
  is_disabled: Boolean(user.is_disabled),
});

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const toLocalDateTimeInput = (value?: string) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (num: number) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toISOStringFromLocalInput = (value: string) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

const normalizeProblemKey = (problem: Pick<Problem, 'displayId' | 'id'>): string => {
  if (typeof problem.displayId === 'string' && problem.displayId.trim().length > 0) {
    return problem.displayId.trim().toLowerCase();
  }
  if (typeof problem.id === 'number') {
    return String(problem.id).toLowerCase();
  }
  return '';
};

type ProblemFormState = {
  displayId: string;
  title: string;
  description: string;
  inputDescription: string;
  outputDescription: string;
  difficulty: 'Low' | 'Mid' | 'High';
  timeLimit: string;
  memoryLimit: string;
  ruleType: 'ACM' | 'OI';
  tags: string;
  visible: boolean;
  shareSubmission: boolean;
  source: string;
  hint: string;
  ioInput: string;
  ioOutput: string;
};

type ContestFormState = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  ruleType: 'ACM' | 'OI';
  password: string;
  visible: boolean;
  realTimeRank: boolean;
  allowedIpRanges: string;
};

type WorkbookFormState = {
  title: string;
  description: string;
  category: string;
  isPublic: boolean;
  problemIds: string[];
};

type AdminSection =
  | 'problem'
  | 'problem-edit'
  | 'bulk'
  | 'contest'
  | 'contest-edit'
  | 'workbook'
  | 'workbook-manage'
  | 'user'
  | 'server';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const isAdmin = useMemo(() => {
    const flag = user?.admin_type;
    return flag === 'Admin' || flag === 'Super Admin';
  }, [user?.admin_type]);

  const [problemForm, setProblemForm] = useState<ProblemFormState>({
    displayId: '',
    title: '',
    description: '',
    inputDescription: '',
    outputDescription: '',
    difficulty: 'Mid',
    timeLimit: '1000',
    memoryLimit: '256',
    ruleType: 'ACM',
    tags: '',
    visible: true,
    shareSubmission: false,
    source: '',
    hint: '',
    ioInput: 'input.txt',
    ioOutput: 'output.txt',
  });

  const [samples, setSamples] = useState<Array<{ input: string; output: string }>>([
    { input: '', output: '' },
  ]);

  const [problemLanguages, setProblemLanguages] = useState<string[]>([...availableLanguages]);
  const [testCaseFile, setTestCaseFile] = useState<File | null>(null);
  const [testCaseId, setTestCaseId] = useState('');
  const [isUploadingTestCases, setIsUploadingTestCases] = useState(false);
  const [problemLoading, setProblemLoading] = useState(false);
  const [problemMessage, setProblemMessage] = useState<{ success?: string; error?: string }>({});

  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<{ success?: string; error?: string }>({});

  const [contestForm, setContestForm] = useState<ContestFormState>({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    ruleType: 'ACM',
    password: '',
    visible: true,
    realTimeRank: true,
    allowedIpRanges: '',
  });
  const [contestLoading, setContestLoading] = useState(false);
  const [contestMessage, setContestMessage] = useState<{ success?: string; error?: string }>({});
  const [contestFormProblems, setContestFormProblems] = useState<Array<{ problem: Problem; displayId: string }>>([]);
  const [contestFormProblemInput, setContestFormProblemInput] = useState('');
  const [contestFormProblemDisplayId, setContestFormProblemDisplayId] = useState('');
  const [contestFormProblemSearch, setContestFormProblemSearch] = useState<{
    results: Problem[];
    loading: boolean;
    error: string | null;
  }>({ results: [], loading: false, error: null });
  const contestFormProblemSearchTimerRef = useRef<number | null>(null);
  const [contestFormProblemSelected, setContestFormProblemSelected] = useState<Problem | null>(null);
  const [contestFormProblemMessage, setContestFormProblemMessage] = useState<{ success?: string; error?: string }>({});

  const [workbookForm, setWorkbookForm] = useState<WorkbookFormState>({
    title: '',
    description: '',
    category: '',
    isPublic: false,
    problemIds: [],
  });
  const [workbookLoading, setWorkbookLoading] = useState(false);
  const [workbookMessage, setWorkbookMessage] = useState<{ success?: string; error?: string }>({});
  const [workbookProblemInput, setWorkbookProblemInput] = useState('');
  const [problemSearchResults, setProblemSearchResults] = useState<Problem[]>([]);
  const [isProblemSearchLoading, setIsProblemSearchLoading] = useState(false);
  const [problemSearchError, setProblemSearchError] = useState<string | null>(null);
  const [selectedProblemMeta, setSelectedProblemMeta] = useState<
    Record<string, { displayId?: string; title?: string }>
  >({});

  const [workbooks, setWorkbooks] = useState<Workbook[]>([]);
  const [isWorkbookListLoading, setIsWorkbookListLoading] = useState(false);
  const [workbookListError, setWorkbookListError] = useState<string | null>(null);
  const [deletingWorkbookId, setDeletingWorkbookId] = useState<number | null>(null);
  const [expandedWorkbookId, setExpandedWorkbookId] = useState<number | null>(null);
  const [workbookProblemsState, setWorkbookProblemsState] = useState<
    Record<number, { items: WorkbookProblem[]; loading: boolean; error: string | null }>
  >({});
  const [workbookProblemInputs, setWorkbookProblemInputs] = useState<
    Record<number, { problemId: string }>
  >({});
  const [addingProblemWorkbookId, setAddingProblemWorkbookId] = useState<number | null>(null);
  const [workbookProblemFormError, setWorkbookProblemFormError] = useState<Record<number, string | null>>({});
  const [workbookProblemSearchState, setWorkbookProblemSearchState] = useState<
    Record<number, { results: Problem[]; loading: boolean; error: string | null }>
  >({});
  const workbookProblemSearchTimers = useRef<Record<number, number>>({});
  const [workbookEditForms, setWorkbookEditForms] = useState<
    Record<number, { title: string; description: string; category: string; isPublic: boolean }>
  >({});
  const [workbookEditMessage, setWorkbookEditMessage] = useState<
    Record<number, { success?: string; error?: string }>
  >({});
  const [savingWorkbookId, setSavingWorkbookId] = useState<number | null>(null);

  const [userList, setUserList] = useState<AdminUser[]>([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const [userListError, setUserListError] = useState<string | null>(null);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearchKeyword, setUserSearchKeyword] = useState('');
  const userSearchTimerRef = useRef<number | null>(null);
  const userSearchKeywordRef = useRef('');
  const selectedUserIdRef = useRef<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userForm, setUserForm] = useState<UpdateUserPayload | null>(null);
  const [userFormMessage, setUserFormMessage] = useState<{ success?: string; error?: string }>({});
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [userDeleteLoading, setUserDeleteLoading] = useState(false);

  const [judgeServers, setJudgeServers] = useState<JudgeServer[]>([]);
  const [judgeServerToken, setJudgeServerToken] = useState('');
  const [judgeServerLoading, setJudgeServerLoading] = useState(false);
  const [judgeServerError, setJudgeServerError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<ServiceHealthStatus>({
    name: 'OJ Backend',
    status: 'unknown',
  });
  const [microServiceStatus, setMicroServiceStatus] = useState<ServiceHealthStatus>({
    name: 'Micro Service',
    status: 'unknown',
  });
  const [contestList, setContestList] = useState<AdminContest[]>([]);
  const [contestListLoading, setContestListLoading] = useState(false);
  const [contestListError, setContestListError] = useState<string | null>(null);
  const [contestPage, setContestPage] = useState(1);
  const [contestTotal, setContestTotal] = useState(0);
  const [contestSearchKeyword, setContestSearchKeyword] = useState('');
  const contestSearchTimerRef = useRef<number | null>(null);
  const contestSearchKeywordRef = useRef('');
  const [selectedContest, setSelectedContest] = useState<AdminContest | null>(null);
  const [contestEditForm, setContestEditForm] = useState<{
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    password: string;
    visible: boolean;
    realTimeRank: boolean;
    allowedIpRanges: string;
  } | null>(null);
  const [contestEditMessage, setContestEditMessage] = useState<{ success?: string; error?: string }>({});
  const [contestEditLoading, setContestEditLoading] = useState(false);
  const [contestDetailLoading, setContestDetailLoading] = useState(false);
  const [contestProblemsState, setContestProblemsState] = useState<{
    items: Problem[];
    loading: boolean;
    error: string | null;
  }>({ items: [], loading: false, error: null });
  const [contestProblemInput, setContestProblemInput] = useState('');
  const [contestProblemDisplayId, setContestProblemDisplayId] = useState('');
  const [contestProblemSearch, setContestProblemSearch] = useState<{
    results: Problem[];
    loading: boolean;
    error: string | null;
  }>({ results: [], loading: false, error: null });
  const contestProblemSearchTimerRef = useRef<number | null>(null);
  const [contestProblemSelected, setContestProblemSelected] = useState<Problem | null>(null);
  const [contestProblemMessage, setContestProblemMessage] = useState<{ success?: string; error?: string }>({});
  const [contestProblemActionLoading, setContestProblemActionLoading] = useState(false);
  const [deletingContestProblemId, setDeletingContestProblemId] = useState<number | null>(null);

  const [problemEditList, setProblemEditList] = useState<Problem[]>([]);
  const [problemEditLoading, setProblemEditLoading] = useState(false);
  const [problemEditError, setProblemEditError] = useState<string | null>(null);
  const [problemEditPage, setProblemEditPage] = useState(1);
  const [problemEditTotal, setProblemEditTotal] = useState(0);
  const [problemEditSearchKeyword, setProblemEditSearchKeyword] = useState('');
  const problemEditSearchTimerRef = useRef<number | null>(null);
  const problemEditSearchKeywordRef = useRef('');
  const problemEditInitializedRef = useRef(false);
  const [selectedProblemId, setSelectedProblemId] = useState<number | null>(null);
  const [selectedProblemDetail, setSelectedProblemDetail] = useState<AdminProblemDetail | null>(null);
  const [problemEditForm, setProblemEditForm] = useState<{
    displayId: string;
    title: string;
    description: string;
    inputDescription: string;
    outputDescription: string;
    hint: string;
    source: string;
    timeLimit: string;
    memoryLimit: string;
    tags: string;
    difficulty: AdminProblemDetail['difficulty'];
    visible: boolean;
    shareSubmission: boolean;
    ioInput: string;
    ioOutput: string;
    samples: Array<{ input: string; output: string }>;
    languages: string[];
  } | null>(null);
  const [problemEditMessage, setProblemEditMessage] = useState<{ success?: string; error?: string }>({});
  const [problemEditSaving, setProblemEditSaving] = useState(false);
  const [problemEditDetailLoading, setProblemEditDetailLoading] = useState(false);

  const [updatingJudgeServerId, setUpdatingJudgeServerId] = useState<number | null>(null);
  const [deletingJudgeServerHostname, setDeletingJudgeServerHostname] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<AdminSection>('problem');

  const fetchJudgeServers = useCallback(async () => {
    setJudgeServerError(null);
    setJudgeServerLoading(true);
    const started = performance.now();
    try {
      const { token, servers } = await adminService.getJudgeServers();
      const latency = performance.now() - started;
      setJudgeServerToken(token ?? '');
      setJudgeServers(Array.isArray(servers) ? servers : []);
      setBackendStatus({
        name: 'OJ Backend',
        status: 'online',
        lastChecked: new Date().toISOString(),
        latency,
      });
    } catch (error) {
      const latency = performance.now() - started;
      const message = error instanceof Error ? error.message : '채점 서버 목록을 불러오지 못했습니다.';
      setJudgeServerError(message);
      setJudgeServers([]);
      setJudgeServerToken('');
      setBackendStatus({
        name: 'OJ Backend',
        status: 'offline',
        message,
        lastChecked: new Date().toISOString(),
        latency,
      });
    } finally {
      setJudgeServerLoading(false);
    }
  }, []);

  const fetchContestProblems = useCallback(async (contestId: number) => {
    if (!contestId) {
      setContestProblemsState({ items: [], loading: false, error: null });
      return;
    }

    setContestProblemsState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const items = await adminService.getContestProblems(contestId);
      setContestProblemsState({ items, loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : '대회 문제 목록을 불러오지 못했습니다.';
      setContestProblemsState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
    }
  }, []);

  const loadContestDetail = useCallback(
    async (contestId: number): Promise<void> => {
      setContestEditMessage({});
      setContestDetailLoading(true);
      try {
        const detail = await adminService.getContestDetail(contestId);
        setSelectedContest(detail);
        setContestEditForm({
          title: detail.title ?? '',
          description: detail.description ?? '',
          startTime: toLocalDateTimeInput(detail.startTime),
          endTime: toLocalDateTimeInput(detail.endTime),
          password: detail.password ?? '',
          visible: Boolean(detail.visible),
          realTimeRank: Boolean(detail.real_time_rank),
          allowedIpRanges: (detail.allowed_ip_ranges || []).join('\n'),
        });
        setContestProblemInput('');
        setContestProblemDisplayId('');
        setContestProblemSelected(null);
        setContestProblemSearch({ results: [], loading: false, error: null });
        setContestProblemMessage({});
        if (contestProblemSearchTimerRef.current) {
          window.clearTimeout(contestProblemSearchTimerRef.current);
          contestProblemSearchTimerRef.current = null;
        }
        await fetchContestProblems(detail.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : '대회 정보를 불러오지 못했습니다.';
        setContestEditMessage({ error: message });
        setContestProblemsState({ items: [], loading: false, error: null });
      } finally {
        setContestDetailLoading(false);
      }
    },
    [fetchContestProblems],
  );

  const fetchContests = useCallback(
    async (page: number = 1, keyword?: string) => {
      const normalizedKeyword = typeof keyword === 'string' ? keyword : contestSearchKeywordRef.current;
      setContestListError(null);
      setContestListLoading(true);
      try {
        const response = await adminService.getContests({ page, limit: 10, keyword: normalizedKeyword });
        const results = Array.isArray(response.results) ? response.results : [];
        setContestList(results);
        setContestTotal(response.total);
        setContestPage(page);
        setContestSearchKeyword(normalizedKeyword);
        contestSearchKeywordRef.current = normalizedKeyword || '';

        if (results.length === 0) {
          setSelectedContest(null);
          setContestEditForm(null);
        } else {
          const currentId = selectedContest?.id;
          const next = results.find((item) => item.id === currentId) ?? results[0];
          await loadContestDetail(next.id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '대회 목록을 불러오지 못했습니다.';
        setContestListError(message);
        setContestList([]);
        setSelectedContest(null);
        setContestEditForm(null);
      } finally {
        setContestListLoading(false);
      }
    },
    [loadContestDetail, selectedContest?.id],
  );

  const scheduleContestProblemSearch = useCallback(
    (keyword: string) => {
      if (contestProblemSearchTimerRef.current) {
        window.clearTimeout(contestProblemSearchTimerRef.current);
      }

      const trimmed = keyword.trim();
      if (!trimmed) {
        setContestProblemSearch({ results: [], loading: false, error: null });
        contestProblemSearchTimerRef.current = null;
        return;
      }

      contestProblemSearchTimerRef.current = window.setTimeout(async () => {
        setContestProblemSearch({ results: [], loading: true, error: null });
        try {
          const results = await adminService.searchAdminProblems({ keyword: trimmed, limit: 20, offset: 0 });
          const usedDisplayIds = new Set(
            contestProblemsState.items
              .map((item) => normalizeProblemKey(item))
              .filter((value) => value.length > 0),
          );
          const usedIds = new Set(
            contestProblemsState.items
              .map((item) => (typeof item.id === 'number' ? item.id : null))
              .filter((value): value is number => value !== null),
          );
          const filtered = results.filter((problem) => {
            const key = normalizeProblemKey(problem);
            if (key && usedDisplayIds.has(key)) {
              return false;
            }
            if (typeof problem.id === 'number' && usedIds.has(problem.id)) {
              return false;
            }
            return true;
          });
          setContestProblemSearch({ results: filtered, loading: false, error: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : '문제를 검색하지 못했습니다.';
          setContestProblemSearch({ results: [], loading: false, error: message });
        } finally {
          if (contestProblemSearchTimerRef.current) {
            window.clearTimeout(contestProblemSearchTimerRef.current);
            contestProblemSearchTimerRef.current = null;
          }
        }
      }, 300);
    },
    [contestProblemsState.items],
  );

  const handleContestProblemInputChange = (value: string) => {
    setContestProblemInput(value);
    setContestProblemSelected(null);
    setContestProblemMessage({});
    scheduleContestProblemSearch(value);
  };

  const handleContestProblemDisplayIdChange = (value: string) => {
    setContestProblemDisplayId(value);
    setContestProblemMessage({});
  };

  const handleSelectContestProblemSuggestion = (problem: Problem) => {
    setContestProblemSelected(problem);
    const label = problem.displayId ?? String(problem.id);
    setContestProblemInput(label);
    setContestProblemDisplayId(label);
    setContestProblemSearch({ results: [], loading: false, error: null });
    setContestProblemMessage({});
    if (contestProblemSearchTimerRef.current) {
      window.clearTimeout(contestProblemSearchTimerRef.current);
      contestProblemSearchTimerRef.current = null;
    }
  };

  const scheduleContestFormProblemSearch = useCallback(
    (keyword: string) => {
      if (contestFormProblemSearchTimerRef.current) {
        window.clearTimeout(contestFormProblemSearchTimerRef.current);
      }

      const trimmed = keyword.trim();
      if (!trimmed) {
        setContestFormProblemSearch({ results: [], loading: false, error: null });
        contestFormProblemSearchTimerRef.current = null;
        return;
      }

      contestFormProblemSearchTimerRef.current = window.setTimeout(async () => {
        setContestFormProblemSearch({ results: [], loading: true, error: null });
        try {
          const results = await adminService.searchAdminProblems({ keyword: trimmed, limit: 20, offset: 0 });
          const usedDisplayIds = new Set(
            contestFormProblems
              .map((item) => item.displayId.trim().toLowerCase())
              .filter((value) => value.length > 0),
          );
          const usedIds = new Set(contestFormProblems.map((item) => item.problem.id));
          const filtered = results.filter((problem) => {
            if (typeof problem.id === 'number' && usedIds.has(problem.id)) {
              return false;
            }
            const displayId = problem.displayId ? problem.displayId.toLowerCase() : '';
            if (!displayId) {
              return true;
            }
            return !usedDisplayIds.has(displayId);
          });
          setContestFormProblemSearch({ results: filtered, loading: false, error: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : '문제를 검색하지 못했습니다.';
          setContestFormProblemSearch({ results: [], loading: false, error: message });
        } finally {
          if (contestFormProblemSearchTimerRef.current) {
            window.clearTimeout(contestFormProblemSearchTimerRef.current);
            contestFormProblemSearchTimerRef.current = null;
          }
        }
      }, 300);
    },
    [contestFormProblems],
  );

  const handleContestFormProblemInputChange = (value: string) => {
    setContestFormProblemInput(value);
    setContestFormProblemSelected(null);
    setContestFormProblemMessage({});
    scheduleContestFormProblemSearch(value);
  };

  const handleContestFormProblemDisplayIdChange = (value: string) => {
    setContestFormProblemDisplayId(value);
    setContestFormProblemMessage({});
  };

  const handleSelectContestFormProblemSuggestion = (problem: Problem) => {
    setContestFormProblemSelected(problem);
    const label = problem.displayId ?? String(problem.id);
    setContestFormProblemInput(label);
    setContestFormProblemDisplayId(label);
    setContestFormProblemSearch({ results: [], loading: false, error: null });
    setContestFormProblemMessage({});
    if (contestFormProblemSearchTimerRef.current) {
      window.clearTimeout(contestFormProblemSearchTimerRef.current);
      contestFormProblemSearchTimerRef.current = null;
    }
  };

  const tryAddContestFormProblem = async (): Promise<boolean> => {
    const trimmedQuery = contestFormProblemInput.trim();
    let targetProblem = contestFormProblemSelected;

    if (!targetProblem) {
      if (!trimmedQuery) {
        setContestFormProblemMessage({ error: '추가할 문제를 검색해 선택하세요.' });
        return false;
      }

      const lowered = trimmedQuery.toLowerCase();
      const inMemory = contestFormProblemSearch.results.find((problem) => {
        if (typeof problem.id === 'number' && String(problem.id) === trimmedQuery) {
          return true;
        }
        return normalizeProblemKey(problem) === lowered;
      });

      if (inMemory) {
        targetProblem = inMemory;
      } else {
        try {
          const fetched = await adminService.searchAdminProblems({ keyword: trimmedQuery, limit: 1, offset: 0 });
          targetProblem = fetched[0];
        } catch (error) {
          const message = error instanceof Error ? error.message : '문제를 검색하지 못했습니다.';
          setContestFormProblemMessage({ error: message });
          return false;
        }
      }
    }

    if (!targetProblem) {
      setContestFormProblemMessage({ error: '해당 문제를 찾지 못했습니다.' });
      return false;
    }

    const resolvedProblem = targetProblem;

    if (!contestFormProblemSelected) {
      setContestFormProblemSelected(resolvedProblem);
    }

    const normalizedDisplayId = (contestFormProblemDisplayId.trim() || resolvedProblem.displayId || String(resolvedProblem.id)).trim();
    if (!normalizedDisplayId) {
      setContestFormProblemMessage({ error: '표시 ID를 입력하세요.' });
      return false;
    }

    const normalizedKey = normalizedDisplayId.toLowerCase();
    const duplicate = contestFormProblems.some((item) => {
      if (item.problem.id === resolvedProblem.id) {
        return true;
      }
      return item.displayId.trim().toLowerCase() === normalizedKey;
    });

    if (duplicate) {
      setContestFormProblemMessage({ error: `표시 ID ${normalizedDisplayId}는 이미 추가되어 있습니다.` });
      return false;
    }

    setContestFormProblems((prev) => [...prev, { problem: resolvedProblem, displayId: normalizedDisplayId }]);
    setContestFormProblemInput('');
    setContestFormProblemDisplayId('');
    setContestFormProblemSelected(null);
    setContestFormProblemSearch({ results: [], loading: false, error: null });
    setContestFormProblemMessage({ success: `문제 ${normalizedDisplayId}을(를) 추가했습니다.` });
    return true;
  };

  const handleAddContestFormProblem = async () => {
    await tryAddContestFormProblem();
  };

  const handleRemoveContestFormProblem = (problemId: number) => {
    setContestFormProblems((prev) => prev.filter((item) => item.problem.id !== problemId));
  };

  const fetchProblemEditList = useCallback(
    async (page: number = 1, keyword?: string) => {
      const normalizedKeyword = typeof keyword === 'string' ? keyword : problemEditSearchKeywordRef.current;
      const offset = (page - 1) * PROBLEM_EDIT_PAGE_SIZE;
      setProblemEditLoading(true);
      setProblemEditError(null);
      try {
        const { results, total } = await adminService.getAdminProblemList({
          keyword: normalizedKeyword,
          limit: PROBLEM_EDIT_PAGE_SIZE,
          offset,
        });
        setProblemEditList(results);
        setProblemEditTotal(total);
        setProblemEditPage(page);
        setProblemEditSearchKeyword(normalizedKeyword ?? '');
        problemEditSearchKeywordRef.current = normalizedKeyword ?? '';

        if (results.length === 0) {
          setSelectedProblemId(null);
          setSelectedProblemDetail(null);
          setProblemEditForm(null);
        } else {
          const currentId = selectedProblemId;
          const next = results.find((item) => item.id === currentId) ?? results[0];
          if (!currentId || next.id !== currentId) {
            setSelectedProblemId(next.id);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '문제 목록을 불러오지 못했습니다.';
        setProblemEditError(message);
        setProblemEditList([]);
        setProblemEditTotal(0);
        setSelectedProblemId(null);
        setSelectedProblemDetail(null);
        setProblemEditForm(null);
      } finally {
        setProblemEditLoading(false);
      }
    },
    [selectedProblemId],
  );

  const handleProblemEditSearchChange = (value: string) => {
    setProblemEditSearchKeyword(value);
    problemEditSearchKeywordRef.current = value;
    if (problemEditSearchTimerRef.current) {
      window.clearTimeout(problemEditSearchTimerRef.current);
    }
    problemEditSearchTimerRef.current = window.setTimeout(() => {
      fetchProblemEditList(1, value);
    }, 300);
  };

  const handleProblemEditSearchSubmit = () => {
    if (problemEditSearchTimerRef.current) {
      window.clearTimeout(problemEditSearchTimerRef.current);
      problemEditSearchTimerRef.current = null;
    }
    fetchProblemEditList(1, problemEditSearchKeywordRef.current);
  };

  const loadProblemEditDetail = useCallback(
    async (problemId: number) => {
      if (!problemId) {
        setSelectedProblemDetail(null);
        setProblemEditForm(null);
        return;
      }

      setProblemEditDetailLoading(true);
      setProblemEditMessage({});
      try {
        const detail = await adminService.getAdminProblemDetail(problemId);
        const resolvedLanguages = normalizeLanguageList(detail.languages);
        const sanitizedDetail: AdminProblemDetail = {
          ...detail,
          languages: resolvedLanguages.length > 0 ? resolvedLanguages : [...availableLanguages],
        };
        setSelectedProblemDetail(sanitizedDetail);
        setProblemEditForm({
          displayId: detail.displayId ?? '',
          title: detail.title ?? '',
          description: detail.description ?? '',
          inputDescription: detail.inputDescription ?? '',
          outputDescription: detail.outputDescription ?? '',
          hint: detail.hint ?? '',
          source: detail.source ?? '',
          timeLimit: String(detail.timeLimit ?? ''),
          memoryLimit: String(detail.memoryLimit ?? ''),
          tags: detail.tags.join(', '),
          difficulty: detail.difficulty,
          visible: detail.visible,
          shareSubmission: detail.shareSubmission,
          ioInput: detail.ioMode.input,
          ioOutput: detail.ioMode.output,
          samples: detail.samples.length > 0 ? detail.samples : [{ input: '', output: '' }],
          languages: sanitizedDetail.languages,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : '문제 정보를 불러오지 못했습니다.';
        setProblemEditMessage({ error: message });
        setSelectedProblemDetail(null);
        setProblemEditForm(null);
      } finally {
        setProblemEditDetailLoading(false);
      }
    },
    [],
  );

  const updateProblemEditForm = (updater: (prev: NonNullable<typeof problemEditForm>) => NonNullable<typeof problemEditForm>) => {
    setProblemEditForm((prev) => {
      if (!prev) {
        return prev;
      }
      const next = updater(prev);
      setProblemEditMessage({});
      return next;
    });
  };

  const handleProblemEditFieldChange = <K extends keyof NonNullable<typeof problemEditForm>>(field: K, value: NonNullable<typeof problemEditForm>[K]) => {
    updateProblemEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProblemEditSampleChange = (index: number, field: 'input' | 'output', value: string) => {
    updateProblemEditForm((prev) => {
      const nextSamples = prev.samples.map((sample, idx) => (idx === index ? { ...sample, [field]: value } : sample));
      return { ...prev, samples: nextSamples };
    });
  };

  const handleAddProblemEditSample = () => {
    updateProblemEditForm((prev) => ({ ...prev, samples: [...prev.samples, { input: '', output: '' }] }));
  };

  const handleRemoveProblemEditSample = (index: number) => {
    updateProblemEditForm((prev) => {
      if (prev.samples.length <= 1) {
        return prev;
      }
      const nextSamples = prev.samples.filter((_, idx) => idx !== index);
      return { ...prev, samples: nextSamples.length > 0 ? nextSamples : [{ input: '', output: '' }] };
    });
  };

  const handleProblemEditLanguageToggle = (language: string, checked: boolean) => {
    const normalized = normalizeLanguageKey(language);
    if (!normalized) {
      return;
    }
    updateProblemEditForm((prev) => {
      const current = new Set(
        prev.languages
          .map((lang) => normalizeLanguageKey(lang))
          .filter((lang): lang is string => Boolean(lang)),
      );
      if (checked) {
        current.add(normalized);
      } else {
        current.delete(normalized);
      }
      const ordered = availableLanguages.filter((lang) => current.has(lang));
      return { ...prev, languages: ordered };
    });
  };

  const handleProblemEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!problemEditForm || !selectedProblemDetail) {
      return;
    }

    const parsedTimeLimit = Number(problemEditForm.timeLimit);
    const parsedMemoryLimit = Number(problemEditForm.memoryLimit);
    const timeLimit = Number.isFinite(parsedTimeLimit) && parsedTimeLimit > 0 ? parsedTimeLimit : selectedProblemDetail.timeLimit;
    const memoryLimit = Number.isFinite(parsedMemoryLimit) && parsedMemoryLimit > 0 ? parsedMemoryLimit : selectedProblemDetail.memoryLimit;

    const normalizedSamples = problemEditForm.samples
      .map((sample) => ({ input: sample.input ?? '', output: sample.output ?? '' }))
      .filter((sample) => sample.input.trim().length > 0 || sample.output.trim().length > 0);

    const effectiveSamples = normalizedSamples.length > 0 ? normalizedSamples : selectedProblemDetail.samples;

    const tags = problemEditForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const normalizedFormLanguages = normalizeLanguageList(problemEditForm.languages);
    const fallbackLanguages = normalizeLanguageList(selectedProblemDetail.languages);
    const resolvedLanguages =
      normalizedFormLanguages.length > 0
        ? normalizedFormLanguages
        : fallbackLanguages.length > 0
          ? fallbackLanguages
          : [...availableLanguages];
    const backendLanguages = toBackendLanguageList(resolvedLanguages);

    const payload: UpdateProblemPayload = {
      id: selectedProblemDetail.id,
      _id: problemEditForm.displayId.trim(),
      title: problemEditForm.title.trim(),
      description: problemEditForm.description,
      input_description: problemEditForm.inputDescription,
      output_description: problemEditForm.outputDescription,
      samples: effectiveSamples,
      test_case_id: selectedProblemDetail.testCaseId,
      test_case_score: selectedProblemDetail.testCaseScore,
      time_limit: timeLimit,
      memory_limit: memoryLimit,
      languages: backendLanguages,
      template: selectedProblemDetail.template,
      rule_type: selectedProblemDetail.ruleType,
      io_mode: {
        io_mode: selectedProblemDetail.ioMode.io_mode,
        input: problemEditForm.ioInput,
        output: problemEditForm.ioOutput,
      },
      spj: selectedProblemDetail.spj,
      spj_language: selectedProblemDetail.spjLanguage,
      spj_code: selectedProblemDetail.spjCode,
      spj_compile_ok: selectedProblemDetail.spjCompileOk,
      visible: problemEditForm.visible,
      difficulty: problemEditForm.difficulty,
      tags: tags.length > 0 ? tags : selectedProblemDetail.tags,
      hint: problemEditForm.hint,
      source: problemEditForm.source,
      share_submission: problemEditForm.shareSubmission,
    };

    if (!payload.title) {
      setProblemEditMessage({ error: '문제 제목을 입력하세요.' });
      return;
    }

    if (!payload._id) {
      setProblemEditMessage({ error: '표시 ID를 입력하세요.' });
      return;
    }

    setProblemEditSaving(true);
    setProblemEditMessage({});
    try {
      const updated = await adminService.updateAdminProblem(payload);
      const normalizedUpdatedLanguages = normalizeLanguageList(updated.languages);
      const sanitizedUpdated: AdminProblemDetail = {
        ...updated,
        languages: normalizedUpdatedLanguages.length > 0 ? normalizedUpdatedLanguages : [...availableLanguages],
      };
      setSelectedProblemDetail(sanitizedUpdated);
      setProblemEditForm({
        displayId: updated.displayId ?? '',
        title: updated.title ?? '',
        description: updated.description ?? '',
        inputDescription: updated.inputDescription ?? '',
        outputDescription: updated.outputDescription ?? '',
        hint: updated.hint ?? '',
        source: updated.source ?? '',
        timeLimit: String(updated.timeLimit ?? ''),
        memoryLimit: String(updated.memoryLimit ?? ''),
        tags: updated.tags.join(', '),
        difficulty: updated.difficulty,
        visible: updated.visible,
        shareSubmission: updated.shareSubmission,
        ioInput: updated.ioMode.input,
        ioOutput: updated.ioMode.output,
        samples: updated.samples.length > 0 ? updated.samples : [{ input: '', output: '' }],
        languages: sanitizedUpdated.languages,
      });
      setProblemEditMessage({ success: '문제 정보를 수정했습니다.' });
      setProblemEditList((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                title: updated.title,
                displayId: updated.displayId,
                difficulty: updated.difficulty,
                visible: updated.visible,
              }
            : item,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제 정보를 수정하지 못했습니다.';
      setProblemEditMessage({ error: message });
    } finally {
      setProblemEditSaving(false);
    }
  };

  const tryAddContestProblem = async () => {
    if (!selectedContest) {
      setContestProblemMessage({ error: '먼저 대회를 선택하세요.' });
      return;
    }
    const trimmedQuery = contestProblemInput.trim();

    let targetProblem = contestProblemSelected;
    if (!targetProblem) {
      if (!trimmedQuery) {
        setContestProblemMessage({ error: '추가할 문제를 검색해 선택하세요.' });
        return;
      }

      const lowered = trimmedQuery.toLowerCase();
      const inMemory = contestProblemSearch.results.find((problem) => {
        if (typeof problem.id === 'number' && String(problem.id) === trimmedQuery) {
          return true;
        }
        return normalizeProblemKey(problem) === lowered;
      });

      if (inMemory) {
        targetProblem = inMemory;
      } else {
        try {
          const fetched = await adminService.searchAdminProblems({ keyword: trimmedQuery, limit: 1, offset: 0 });
          targetProblem = fetched[0];
        } catch (error) {
          const message = error instanceof Error ? error.message : '문제를 검색하지 못했습니다.';
          setContestProblemMessage({ error: message });
          return;
        }
      }
    }

    if (!targetProblem) {
      setContestProblemMessage({ error: '해당 문제를 찾지 못했습니다.' });
      return;
    }

    const resolvedProblem = targetProblem;

    if (!contestProblemSelected) {
      setContestProblemSelected(resolvedProblem);
    }

    const normalizedDisplayId = (contestProblemDisplayId.trim() || resolvedProblem.displayId || String(resolvedProblem.id)).trim();
    if (!normalizedDisplayId) {
      setContestProblemMessage({ error: '표시 ID를 입력하세요.' });
      return;
    }

    const normalizedTargetKey = normalizedDisplayId.toLowerCase();
    const duplicate = contestProblemsState.items.some((item) => {
      const existingKey = normalizeProblemKey(item);
      if (existingKey && existingKey === normalizedTargetKey) {
        return true;
      }
      if (typeof item.id === 'number' && item.id === resolvedProblem.id) {
        return true;
      }
      return false;
    });

    if (duplicate) {
      setContestProblemMessage({ error: `표시 ID ${normalizedDisplayId}는 이미 사용 중입니다.` });
      return;
    }

    setContestProblemActionLoading(true);
    setContestProblemMessage({});
    try {
      await adminService.addContestProblemFromPublic(
        selectedContest.id,
        resolvedProblem.id,
        normalizedDisplayId,
      );
      await fetchContestProblems(selectedContest.id);
      setContestProblemInput('');
      setContestProblemDisplayId('');
      setContestProblemSelected(null);
      setContestProblemSearch({ results: [], loading: false, error: null });
      setContestProblemMessage({ success: `문제 ${normalizedDisplayId}을(를) 추가했습니다.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제를 추가하지 못했습니다.';
      setContestProblemMessage({ error: message });
    } finally {
      setContestProblemActionLoading(false);
    }
  };

  const handleAddContestProblem = async () => {
    if (contestProblemActionLoading) {
      return;
    }
    await tryAddContestProblem();
  };

  const handleRemoveContestProblem = async (problemId: number, displayLabel: string) => {
    if (!selectedContest) {
      setContestProblemMessage({ error: '먼저 대회를 선택하세요.' });
      return;
    }

    setContestProblemMessage({});
    setDeletingContestProblemId(problemId);
    try {
      await adminService.deleteContestProblem(problemId);
      await fetchContestProblems(selectedContest.id);
      setContestProblemMessage({ success: `문제 ${displayLabel}을(를) 삭제했습니다.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제를 삭제하지 못했습니다.';
      setContestProblemMessage({ error: message });
    } finally {
      setDeletingContestProblemId(null);
    }
  };

  const refreshMicroServiceHealth = useCallback(async () => {
    const result = await adminService.checkMicroserviceHealth();
    setMicroServiceStatus({
      name: 'Micro Service',
      status: result.ok ? 'online' : 'offline',
      latency: result.latency,
      message: result.ok ? undefined : result.message,
      lastChecked: new Date().toISOString(),
    });
  }, []);

  const fetchUsers = useCallback(
    async (page: number = 1, keyword?: string) => {
      const normalizedKeyword = typeof keyword === 'string' ? keyword : userSearchKeywordRef.current;
      setUserListError(null);
      setUserListLoading(true);
      try {
        const response = await adminService.getUsers({
          page,
          limit: USER_PAGE_SIZE,
          keyword: normalizedKeyword.trim().length > 0 ? normalizedKeyword.trim() : undefined,
        });
        setUserList(response.results);
        setUserTotal(response.total);
        setUserPage(page);

        if (response.results.length === 0) {
          setSelectedUser(null);
          selectedUserIdRef.current = null;
        } else {
          const currentId = selectedUserIdRef.current;
          const next = response.results.find((item) => item.id === currentId) ?? response.results[0];
          setSelectedUser(next);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '사용자 목록을 불러오지 못했습니다.';
        setUserListError(message);
        setUserList([]);
        setSelectedUser(null);
        selectedUserIdRef.current = null;
      } finally {
        setUserListLoading(false);
      }
    },
    [],
  );

  const loadWorkbooks = useCallback(async () => {
    setWorkbookListError(null);
    setIsWorkbookListLoading(true);
    try {
      const list = await adminService.getWorkbooks();
      const normalized = Array.isArray(list) ? list : [];
      setWorkbooks(normalized);
      setWorkbookEditForms((prev) => {
        const next = { ...prev };
        normalized.forEach((workbook) => {
          next[workbook.id] = {
            title: workbook.title ?? '',
            description: workbook.description ?? '',
            category: workbook.category ?? '',
            isPublic: Boolean(workbook.is_public),
          };
        });
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제집 정보를 불러오는 중 오류가 발생했습니다.';
      setWorkbookListError(message);
    } finally {
      setIsWorkbookListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'workbook-manage') {
      loadWorkbooks();
    }
  }, [activeSection, loadWorkbooks]);

  useEffect(() => {
    if (activeSection === 'problem-edit' && !problemEditInitializedRef.current) {
      problemEditInitializedRef.current = true;
      fetchProblemEditList(1, problemEditSearchKeywordRef.current);
    }
  }, [activeSection, fetchProblemEditList]);

  useEffect(() => {
    const timersRef = workbookProblemSearchTimers;
    return () => {
      Object.values(timersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    };
  }, []);

  useEffect(() => {
    return () => {
      if (contestProblemSearchTimerRef.current) {
        window.clearTimeout(contestProblemSearchTimerRef.current);
      }
      if (contestFormProblemSearchTimerRef.current) {
        window.clearTimeout(contestFormProblemSearchTimerRef.current);
      }
      if (problemEditSearchTimerRef.current) {
        window.clearTimeout(problemEditSearchTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedUser) {
      setUserForm(null);
      selectedUserIdRef.current = null;
      return;
    }

    if (selectedUserIdRef.current !== selectedUser.id) {
      setUserFormMessage({});
    }

    setUserForm(mapAdminUserToForm(selectedUser));
    selectedUserIdRef.current = selectedUser.id;
  }, [selectedUser]);

  useEffect(() => {
    if (!userForm) {
      return;
    }

    if (userForm.admin_type === 'Super Admin' && userForm.problem_permission !== 'All') {
      setUserForm((prev) => (prev ? { ...prev, problem_permission: 'All' } : prev));
    } else if (userForm.admin_type === 'Regular User' && userForm.problem_permission !== 'None') {
      setUserForm((prev) => (prev ? { ...prev, problem_permission: 'None' } : prev));
    }
  }, [userForm]);

  useEffect(() => {
    if (activeSection === 'user') {
      fetchUsers(1, userSearchKeywordRef.current);
    }
  }, [activeSection, fetchUsers]);

  useEffect(() => {
    if (activeSection !== 'problem-edit') {
      return;
    }
    if (!selectedProblemId) {
      setSelectedProblemDetail(null);
      setProblemEditForm(null);
      return;
    }
    loadProblemEditDetail(selectedProblemId);
  }, [activeSection, selectedProblemId, loadProblemEditDetail]);

  useEffect(() => {
    if (activeSection === 'server') {
      fetchJudgeServers();
      refreshMicroServiceHealth();
    }
  }, [activeSection, fetchJudgeServers, refreshMicroServiceHealth]);

  useEffect(() => {
    if (activeSection === 'contest-edit') {
      fetchContests(1, contestSearchKeywordRef.current);
    }
  }, [activeSection, fetchContests]);

  useEffect(() => {
    return () => {
      if (contestSearchTimerRef.current) {
        window.clearTimeout(contestSearchTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (userSearchTimerRef.current) {
        window.clearTimeout(userSearchTimerRef.current);
      }
    };
  }, []);

  const handleRefreshWorkbooks = async () => {
    await loadWorkbooks();
    if (expandedWorkbookId !== null) {
      await fetchWorkbookProblems(expandedWorkbookId);
    }
  };

  const handleDeleteWorkbook = async (id: number) => {
    setWorkbookListError(null);
    setDeletingWorkbookId(id);
    try {
      await adminService.deleteWorkbook(id);
      setWorkbooks((prev) => prev.filter((workbook) => workbook.id !== id));
      if (expandedWorkbookId === id) {
        setExpandedWorkbookId(null);
      }
      setWorkbookProblemsState((prev) => {
        if (!prev[id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setWorkbookProblemInputs((prev) => {
        if (!prev[id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setWorkbookProblemFormError((prev) => {
        if (!prev[id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setWorkbookProblemSearchState((prev) => {
        if (!prev[id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setWorkbookEditForms((prev) => {
        if (!prev[id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setWorkbookEditMessage((prev) => {
        if (!prev[id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제집 삭제 중 오류가 발생했습니다.';
      setWorkbookListError(message);
    } finally {
      setDeletingWorkbookId(null);
    }
  };

  useEffect(() => {
    const trimmed = workbookProblemInput.trim();

    if (!trimmed) {
      setProblemSearchResults([]);
      setProblemSearchError(null);
      setIsProblemSearchLoading(false);
      return;
    }

    let cancelled = false;
    setIsProblemSearchLoading(true);
    setProblemSearchError(null);

    const handler = setTimeout(() => {
      problemService
        .searchProblems(trimmed, { limit: 20 })
        .then((response) => {
          if (cancelled) return;
          const items = Array.isArray(response.data) ? response.data : [];
          const filtered = items.filter(
            (problem) => !workbookForm.problemIds.includes(String(problem.id)),
          );
          setProblemSearchResults(filtered.slice(0, 10));
        })
        .catch((error) => {
          if (cancelled) return;
          const message =
            error instanceof Error ? error.message : '문제 검색 중 오류가 발생했습니다.';
          setProblemSearchError(message);
          setProblemSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) {
            setIsProblemSearchLoading(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handler);
    };
  }, [workbookProblemInput, workbookForm.problemIds]);

  const formatDate = (value?: string) => {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
  };

  const sections: Array<{ key: AdminSection; label: string; helper: string }> = [
    { key: 'server', label: '서버 관리', helper: '채점 서버와 서비스 상태 모니터링' },
    { key: 'problem', label: '문제 등록', helper: '단일 문제 생성 및 메타데이터 관리' },
    { key: 'bulk', label: '문제 대량 등록', helper: 'JSON ZIP 업로드로 여러 문제 처리' },
    { key: 'problem-edit', label: '문제 수정', helper: '기존 문제 조회 및 정보 수정' },
    { key: 'workbook', label: '문제집 등록', helper: '문제집 메타데이터 등록' },
    { key: 'workbook-manage', label: '문제집 수정', helper: '문제집 목록 확인 및 문제 관리' },
    { key: 'contest', label: '대회 등록', helper: '대회 일정과 옵션 생성' },
    { key: 'contest-edit', label: '대회 수정', helper: '대회 정보 조회 및 수정' },
  ];

  const fetchWorkbookProblems = useCallback(
    async (workbookId: number) => {
      setWorkbookProblemsState((prev) => ({
        ...prev,
        [workbookId]: {
          items: prev[workbookId]?.items ?? [],
          loading: true,
          error: null,
        },
      }));
      setWorkbookProblemFormError((prev) => ({ ...prev, [workbookId]: null }));
      try {
        const items = await adminService.getWorkbookProblems(workbookId);
        const ordered = [...items].sort((a, b) => a.order - b.order);
        setWorkbookProblemsState((prev) => ({
          ...prev,
          [workbookId]: { items: ordered, loading: false, error: null },
        }));
        setWorkbookProblemInputs((prev) => ({
          ...prev,
          [workbookId]: {
            problemId: '',
          },
        }));
        setWorkbookProblemSearchState((prev) => ({
          ...prev,
          [workbookId]: { results: [], loading: false, error: null },
        }));
        const currentWorkbook = workbooks.find((item) => item.id === workbookId);
        if (currentWorkbook) {
          setWorkbookEditForms((prev) => ({
            ...prev,
            [workbookId]: {
              title: currentWorkbook.title ?? '',
              description: currentWorkbook.description ?? '',
              category: currentWorkbook.category ?? '',
              isPublic: Boolean(currentWorkbook.is_public),
            },
          }));
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '문제 목록을 불러오지 못했습니다.';
        setWorkbookProblemsState((prev) => ({
          ...prev,
          [workbookId]: {
            items: prev[workbookId]?.items ?? [],
            loading: false,
            error: message,
          },
        }));
      }
    },
    [workbooks],
  );

  const handleToggleWorkbookDetails = (workbookId: number) => {
    if (expandedWorkbookId === workbookId) {
      setExpandedWorkbookId(null);
      return;
    }
    setExpandedWorkbookId(workbookId);
    fetchWorkbookProblems(workbookId);
  };

  const scheduleWorkbookProblemSearch = useCallback(
    (workbookId: number, keyword: string) => {
      const existingTimer = workbookProblemSearchTimers.current[workbookId];
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      const trimmed = keyword.trim();
      if (!trimmed) {
        setWorkbookProblemSearchState((prev) => ({
          ...prev,
          [workbookId]: { results: [], loading: false, error: null },
        }));
        return;
      }

      setWorkbookProblemSearchState((prev) => ({
        ...prev,
        [workbookId]: {
          results: prev[workbookId]?.results ?? [],
          loading: true,
          error: null,
        },
      }));

      workbookProblemSearchTimers.current[workbookId] = window.setTimeout(() => {
        problemService
          .searchProblems(trimmed, { limit: 20 })
          .then((response) => {
            const items = Array.isArray(response.data) ? response.data : [];
            const existingItems = workbookProblemsState[workbookId]?.items ?? [];
            const existingIds = new Set(
              existingItems
                .map((item) => {
                  const idCandidate = item.problemId ?? item.problem?.id;
                  const parsed = Number(idCandidate);
                  return Number.isFinite(parsed) ? parsed : null;
                })
                .filter((value): value is number => value !== null),
            );
            const filtered = items.filter((problem) => !existingIds.has(problem.id)).slice(0, 10);
            setWorkbookProblemSearchState((prev) => ({
              ...prev,
              [workbookId]: { results: filtered, loading: false, error: null },
            }));
          })
          .catch((error) => {
            const message =
              error instanceof Error ? error.message : '문제 검색 중 오류가 발생했습니다.';
            setWorkbookProblemSearchState((prev) => ({
              ...prev,
              [workbookId]: { results: [], loading: false, error: message },
            }));
          })
          .finally(() => {
            delete workbookProblemSearchTimers.current[workbookId];
          });
      }, 300);
    },
    [workbookProblemsState],
  );

  const handleWorkbookProblemInputChange = (workbookId: number, value: string) => {
    setWorkbookProblemInputs((prev) => ({
      ...prev,
      [workbookId]: {
        problemId: value,
      },
    }));
    setWorkbookProblemFormError((prev) => {
      if (!prev[workbookId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[workbookId];
      return next;
    });
    scheduleWorkbookProblemSearch(workbookId, value);
  };

  const handleWorkbookMetaChange = (
    workbookId: number,
    field: 'title' | 'description' | 'category',
    value: string,
  ) => {
    setWorkbookEditForms((prev) => ({
      ...prev,
      [workbookId]: {
        ...(prev[workbookId] ?? {
          title: '',
          description: '',
          category: '',
          isPublic: false,
        }),
        [field]: value,
      },
    }));
    setWorkbookEditMessage((prev) => {
      if (!prev[workbookId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[workbookId];
      return next;
    });
  };

  const handleWorkbookMetaToggle = (workbookId: number, value: boolean) => {
    setWorkbookEditForms((prev) => ({
      ...prev,
      [workbookId]: {
        ...(prev[workbookId] ?? {
          title: '',
          description: '',
          category: '',
          isPublic: false,
        }),
        isPublic: value,
      },
    }));
    setWorkbookEditMessage((prev) => {
      if (!prev[workbookId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[workbookId];
      return next;
    });
  };

  const handleSelectUser = (user: AdminUser) => {
    selectedUserIdRef.current = user.id;
    setSelectedUser(user);
    setUserFormMessage({});
  };

  const handleUserSearchInputChange = (value: string) => {
    setUserSearchKeyword(value);
    userSearchKeywordRef.current = value;
    if (userSearchTimerRef.current) {
      window.clearTimeout(userSearchTimerRef.current);
    }
    userSearchTimerRef.current = window.setTimeout(() => {
      fetchUsers(1, value);
    }, 300);
  };

  const handleUserSearchSubmit = () => {
    if (userSearchTimerRef.current) {
      window.clearTimeout(userSearchTimerRef.current);
      userSearchTimerRef.current = null;
    }
    fetchUsers(1, userSearchKeywordRef.current);
  };

  const handleRefreshServers = async () => {
    await Promise.all([fetchJudgeServers(), refreshMicroServiceHealth()]);
  };

  const handleToggleJudgeServerDisabled = async (server: JudgeServer, nextValue: boolean) => {
    setUpdatingJudgeServerId(server.id);
    try {
      await adminService.updateJudgeServer({ id: server.id, is_disabled: nextValue });
      setJudgeServers((prev) =>
        prev.map((item) => (item.id === server.id ? { ...item, is_disabled: nextValue } : item)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '채점 서버 상태를 변경하지 못했습니다.';
      setJudgeServerError(message);
      await fetchJudgeServers();
    } finally {
      setUpdatingJudgeServerId(null);
    }
  };

  const handleDeleteJudgeServer = async (hostname: string) => {
    if (!hostname) {
      return;
    }
    const confirmed = window.confirm(`${hostname} 서버를 삭제하시겠습니까? 다음 하트비트까지 사용할 수 없습니다.`);
    if (!confirmed) {
      return;
    }
    setDeletingJudgeServerHostname(hostname);
    try {
      await adminService.deleteJudgeServer(hostname);
      await fetchJudgeServers();
    } catch (error) {
      const message = error instanceof Error ? error.message : '채점 서버를 삭제하지 못했습니다.';
      setJudgeServerError(message);
    } finally {
      setDeletingJudgeServerHostname(null);
    }
  };

  const formatLatency = (value?: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '-';
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)} s`;
    }
    return `${Math.round(value)} ms`;
  };

  const getStatusPillClass = (status: ServiceHealthStatus['status']) => {
    switch (status) {
      case 'online':
        return 'border-green-200 bg-green-50 text-green-700';
      case 'offline':
        return 'border-red-200 bg-red-50 text-red-700';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-600';
    }
  };

  const handleContestSearchInputChange = (value: string) => {
    setContestSearchKeyword(value);
    contestSearchKeywordRef.current = value;
    if (contestSearchTimerRef.current) {
      window.clearTimeout(contestSearchTimerRef.current);
    }
    contestSearchTimerRef.current = window.setTimeout(() => {
      fetchContests(1, value);
    }, 300);
  };

  const handleContestSearchSubmit = () => {
    if (contestSearchTimerRef.current) {
      window.clearTimeout(contestSearchTimerRef.current);
      contestSearchTimerRef.current = null;
    }
    fetchContests(1, contestSearchKeywordRef.current);
  };

  const handleContestPageChange = (direction: 'prev' | 'next') => {
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(contestTotal / pageSize));
    let nextPage = contestPage;
    if (direction === 'prev' && contestPage > 1) {
      nextPage = contestPage - 1;
    }
    if (direction === 'next' && contestPage < totalPages) {
      nextPage = contestPage + 1;
    }
    if (nextPage !== contestPage) {
      fetchContests(nextPage, contestSearchKeyword);
    }
  };

  const handleSelectContest = async (contest: AdminContest) => {
    setSelectedContest(contest);
    await loadContestDetail(contest.id);
  };

  const handleContestEditChange = <K extends keyof NonNullable<typeof contestEditForm>>(field: K, value: NonNullable<typeof contestEditForm>[K]) => {
    setContestEditForm((prev) => {
      if (!prev) {
        return prev;
      }
      const next = { ...prev, [field]: value };
      setContestEditMessage({});
      return next;
    });
  };

  const handleContestEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedContest || !contestEditForm) {
      return;
    }

    const { title, description, startTime, endTime, password, visible, realTimeRank, allowedIpRanges } = contestEditForm;

    if (!title.trim()) {
      setContestEditMessage({ error: '대회 제목을 입력하세요.' });
      return;
    }

    const start = toISOStringFromLocalInput(startTime);
    const end = toISOStringFromLocalInput(endTime);

    if (!start || !end) {
      setContestEditMessage({ error: '유효한 시작/종료 시간을 입력하세요.' });
      return;
    }

    const ipRanges = allowedIpRanges
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const payload: UpdateContestPayload = {
      id: selectedContest.id,
      title: title.trim(),
      description,
      start_time: start,
      end_time: end,
      password: password.trim() || null,
      visible,
      real_time_rank: realTimeRank,
      allowed_ip_ranges: ipRanges,
    };

    setContestEditLoading(true);
    setContestEditMessage({});
    try {
      const updated = await adminService.updateContest(payload);
      setSelectedContest(updated);
      setContestEditForm({
        title: updated.title ?? '',
        description: updated.description ?? '',
        startTime: toLocalDateTimeInput(updated.startTime),
        endTime: toLocalDateTimeInput(updated.endTime),
        password: updated.password ?? '',
        visible: Boolean(updated.visible),
        realTimeRank: Boolean(updated.real_time_rank),
        allowedIpRanges: (updated.allowed_ip_ranges || []).join('\n'),
      });
      setContestEditMessage({ success: '대회 정보를 수정했습니다.' });
      setContestList((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      const message = error instanceof Error ? error.message : '대회 정보를 수정하지 못했습니다.';
      setContestEditMessage({ error: message });
    } finally {
      setContestEditLoading(false);
    }
  };

  const handleContestResetForm = () => {
    if (!selectedContest) {
      return;
    }
    setContestEditMessage({});
    setContestEditForm({
      title: selectedContest.title ?? '',
      description: selectedContest.description ?? '',
      startTime: toLocalDateTimeInput(selectedContest.startTime),
      endTime: toLocalDateTimeInput(selectedContest.endTime),
      password: selectedContest.password ?? '',
      visible: Boolean(selectedContest.visible),
      realTimeRank: Boolean(selectedContest.real_time_rank),
      allowedIpRanges: (selectedContest.allowed_ip_ranges || []).join('\n'),
    });
    setContestProblemMessage({});
    setContestProblemInput('');
    setContestProblemDisplayId('');
    setContestProblemSelected(null);
    setContestProblemSearch({ results: [], loading: false, error: null });
  };

  const handleUserPageChange = (direction: 'prev' | 'next') => {
    const totalPages = Math.max(1, Math.ceil(userTotal / USER_PAGE_SIZE));
    let nextPage = userPage;
    if (direction === 'prev' && userPage > 1) {
      nextPage = userPage - 1;
    }
    if (direction === 'next' && userPage < totalPages) {
      nextPage = userPage + 1;
    }
    if (nextPage !== userPage) {
      fetchUsers(nextPage, userSearchKeywordRef.current);
    }
  };

  const handleUserFormChange = <K extends keyof UpdateUserPayload>(field: K, value: UpdateUserPayload[K]) => {
    setUserForm((prev) => {
      if (!prev) {
        return prev;
      }
      const next = { ...prev, [field]: value };
      setUserFormMessage({});
      return next;
    });
  };

  const handleUserUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userForm) {
      return;
    }

    const payload: UpdateUserPayload = {
      ...userForm,
      username: userForm.username.trim(),
      real_name: userForm.real_name?.trim() ?? '',
      email: userForm.email?.trim() ?? '',
    };

    if (!payload.username) {
      setUserFormMessage({ error: '사용자 이름을 입력하세요.' });
      return;
    }

    if (!payload.real_name) {
      setUserFormMessage({ error: '실명을 입력하세요.' });
      return;
    }

    if (!payload.email) {
      setUserFormMessage({ error: '이메일을 입력하세요.' });
      return;
    }

    if (!payload.password || payload.password.trim().length === 0) {
      delete payload.password;
    } else {
      payload.password = payload.password.trim();
    }

    setUserFormLoading(true);
    setUserFormMessage({});
    try {
      const updated = await adminService.updateUser(payload);
      setSelectedUser(updated);
      setUserForm(mapAdminUserToForm(updated));
      selectedUserIdRef.current = updated.id;
      setUserList((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      setUserFormMessage({ success: '사용자 정보를 수정했습니다.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '사용자 정보를 수정하지 못했습니다.';
      setUserFormMessage({ error: message });
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleUserDelete = async () => {
    if (!selectedUser) {
      return;
    }

    const confirmed = window.confirm(
      `${selectedUser.username} 사용자를 삭제하면 해당 사용자가 생성한 문제, 대회 등이 함께 삭제될 수 있습니다. 계속하시겠습니까?`,
    );
    if (!confirmed) {
      return;
    }

    const nextPage = userList.length <= 1 && userPage > 1 ? userPage - 1 : userPage;

    setUserDeleteLoading(true);
    try {
      await adminService.deleteUser(selectedUser.id);
      setUserFormMessage({ success: `${selectedUser.username} 사용자를 삭제했습니다.` });
      await fetchUsers(nextPage, userSearchKeywordRef.current);
    } catch (error) {
      const message = error instanceof Error ? error.message : '사용자를 삭제하지 못했습니다.';
      setUserFormMessage({ error: message });
    } finally {
      setUserDeleteLoading(false);
    }
  };

  const handleRemoveWorkbookProblemChip = async (workbookId: number, problemId: number) => {
    const currentItems = workbookProblemsState[workbookId]?.items ?? [];
    const remaining = currentItems.filter((item) => {
      const candidate = item.problemId ?? item.problem?.id;
      return Number(candidate) !== problemId;
    });

    if (remaining.length === currentItems.length) {
      return;
    }

    const updatedIds = remaining
      .sort((a, b) => a.order - b.order)
      .map((item) => {
        const candidate = item.problemId ?? item.problem?.id;
        const parsed = Number(candidate);
        return Number.isFinite(parsed) ? parsed : null;
      })
      .filter((value): value is number => value !== null);

    setAddingProblemWorkbookId(workbookId);
    try {
      await adminService.updateWorkbookProblems(workbookId, updatedIds);
      await fetchWorkbookProblems(workbookId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제 삭제 중 오류가 발생했습니다.';
      setWorkbookProblemFormError((prev) => ({ ...prev, [workbookId]: message }));
    } finally {
      setAddingProblemWorkbookId(null);
    }
  };

  const appendProblemToWorkbook = async (workbookId: number, problem: Problem): Promise<boolean> => {
    const currentItems = workbookProblemsState[workbookId]?.items ?? [];
    const alreadyExists = currentItems.some((item) => {
      const pid = item.problemId ?? item.problem?.id;
      return Number(pid) === problem.id;
    });
    if (alreadyExists) {
      setWorkbookProblemFormError((prev) => ({
        ...prev,
        [workbookId]: '이미 추가된 문제입니다.',
      }));
      return false;
    }

    const updatedIds: number[] = [...currentItems]
      .sort((a, b) => a.order - b.order)
      .map((item) => {
        const candidate = item.problemId ?? item.problem?.id;
        const parsed = Number(candidate);
        return Number.isFinite(parsed) ? parsed : null;
      })
      .filter((value): value is number => value !== null);
    updatedIds.push(problem.id);

    setAddingProblemWorkbookId(workbookId);
    try {
      await adminService.updateWorkbookProblems(workbookId, updatedIds);
      await fetchWorkbookProblems(workbookId);
      setWorkbookProblemInputs((prev) => ({
        ...prev,
        [workbookId]: {
          problemId: '',
        },
      }));
      setWorkbookProblemSearchState((prev) => ({
        ...prev,
        [workbookId]: { results: [], loading: false, error: null },
      }));
        setWorkbookProblemFormError((prev) => ({ ...prev, [workbookId]: null }));
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제 추가 중 오류가 발생했습니다.';
      setWorkbookProblemFormError((prev) => ({ ...prev, [workbookId]: message }));
      return false;
    } finally {
      setAddingProblemWorkbookId(null);
    }
  };

  const tryAppendWorkbookProblemFromInput = async (workbookId: number): Promise<boolean> => {
    const input = workbookProblemInputs[workbookId] ?? { problemId: '' };
    const query = (input.problemId ?? '').trim();

    if (!query) {
      setWorkbookProblemFormError((prev) => ({
        ...prev,
        [workbookId]: '문제를 검색해 선택하세요.',
      }));
      return false;
    }

    const searchState = workbookProblemSearchState[workbookId];
    const lowered = query.toLowerCase();
    const resolved = searchState?.results?.find((problem) => {
      if (String(problem.id) === query) {
        return true;
      }
      return problem.displayId ? problem.displayId.toLowerCase() === lowered : false;
    });

    if (!resolved) {
      setWorkbookProblemFormError((prev) => ({
        ...prev,
        [workbookId]: '검색 결과에서 문제를 선택하세요.',
      }));
      return false;
    }

    return appendProblemToWorkbook(workbookId, resolved);
  };

  const handleAddProblemToWorkbook = async (
    event: FormEvent<HTMLFormElement>,
    workbookId: number,
  ) => {
    event.preventDefault();
    setWorkbookProblemFormError((prev) => ({ ...prev, [workbookId]: null }));

    await tryAppendWorkbookProblemFromInput(workbookId);
  };

  const handleWorkbookProblemInputKeyDown = async (
    workbookId: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await tryAppendWorkbookProblemFromInput(workbookId);
    }
  };

  const handleWorkbookMetaSubmit = async (
    event: FormEvent<HTMLFormElement>,
    workbookId: number,
  ) => {
    event.preventDefault();
    const form = workbookEditForms[workbookId];
    if (!form) {
      return;
    }
    if (!form.title.trim()) {
      setWorkbookEditMessage((prev) => ({
        ...prev,
        [workbookId]: { error: '문제집 제목을 입력하세요.' },
      }));
      return;
    }

    setSavingWorkbookId(workbookId);
    try {
      const updated = await adminService.updateWorkbookMeta(workbookId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        is_public: form.isPublic,
      });
      setWorkbooks((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      setWorkbookEditMessage((prev) => ({
        ...prev,
        [workbookId]: { success: '문제집 정보가 저장되었습니다.' },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제집 정보를 저장하지 못했습니다.';
      setWorkbookEditMessage((prev) => ({
        ...prev,
        [workbookId]: { error: message },
      }));
    } finally {
      setSavingWorkbookId(null);
    }
  };

  const handleSampleChange = (index: number, field: 'input' | 'output', value: string) => {
    setSamples((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddSample = () => {
    setSamples((prev) => [...prev, { input: '', output: '' }]);
  };

  const handleRemoveSample = (index: number) => {
    setSamples((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleLanguage = (language: string) => {
    const normalized = normalizeLanguageKey(language);
    if (!normalized) {
      return;
    }
    setProblemLanguages((prev) => {
      const current = new Set(prev);
      if (current.has(normalized)) {
        current.delete(normalized);
      } else {
        current.add(normalized);
      }
      const ordered = availableLanguages.filter((lang) => current.has(lang));
      return ordered;
    });
  };

  const handleUploadTestCases = async () => {
    if (!testCaseFile) {
      setProblemMessage({ error: '업로드할 테스트케이스 ZIP 파일을 선택하세요.' });
      return;
    }
    try {
      setIsUploadingTestCases(true);
      setProblemMessage({});
      const result = await adminService.uploadProblemTestCases(testCaseFile, false);
      setTestCaseId(result.id);
      setProblemMessage({ success: `테스트케이스 업로드 완료 (ID: ${result.id})` });
    } catch (error) {
      const message = error instanceof Error ? error.message : '테스트케이스 업로드 중 오류가 발생했습니다.';
      setProblemMessage({ error: message });
    } finally {
      setIsUploadingTestCases(false);
    }
  };

  const handleProblemSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProblemMessage({});

    if (!problemForm.displayId.trim()) {
      setProblemMessage({ error: '표시 ID를 입력하세요.' });
      return;
    }

    if (!testCaseId) {
      setProblemMessage({ error: '먼저 테스트케이스를 업로드해 ID를 확보하세요.' });
      return;
    }

    const cleanedSamples = samples
      .map((sample) => ({ input: sample.input.trim(), output: sample.output.trim() }))
      .filter((sample) => sample.input || sample.output);

    if (cleanedSamples.length === 0) {
      setProblemMessage({ error: '최소 한 개 이상의 예제를 입력하세요.' });
      return;
    }

    const tagList = problemForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    if (tagList.length === 0) {
      setProblemMessage({ error: '태그를 최소 한 개 이상 입력하세요.' });
      return;
    }

    if (problemLanguages.length === 0) {
      setProblemMessage({ error: '최소 한 개 이상의 언어를 선택하세요.' });
      return;
    }

    const backendLanguages = toBackendLanguageList(problemLanguages);

    const payload: CreateProblemPayload = {
      _id: problemForm.displayId.trim(),
      title: problemForm.title.trim(),
      description: problemForm.description,
      input_description: problemForm.inputDescription,
      output_description: problemForm.outputDescription,
      samples: cleanedSamples,
      test_case_id: testCaseId,
      test_case_score: [] as Array<{ input_name: string; output_name: string; score: number }>,
      time_limit: Number(problemForm.timeLimit) || 1000,
      memory_limit: Number(problemForm.memoryLimit) || 256,
      languages: backendLanguages,
      template: problemLanguages.reduce<Record<string, string>>((acc, lang) => {
        const backendKey = getLanguageBackendValue(lang);
        acc[backendKey] = templateMap[lang] || '';
        return acc;
      }, {}),
      rule_type: problemForm.ruleType,
      io_mode: {
        io_mode: 'Standard IO',
        input: problemForm.ioInput.trim() || 'input.txt',
        output: problemForm.ioOutput.trim() || 'output.txt',
      },
      spj: false,
      spj_language: null,
      spj_code: null,
      spj_compile_ok: false,
      visible: problemForm.visible,
      difficulty: problemForm.difficulty,
      tags: tagList,
      hint: problemForm.hint.trim() || null,
      source: problemForm.source.trim() || null,
      share_submission: problemForm.shareSubmission,
    };

    try {
      setProblemLoading(true);
      await adminService.createProblem(payload);
      setProblemMessage({ success: '문제가 성공적으로 등록되었습니다.' });
      setProblemForm({
        displayId: '',
        title: '',
        description: '',
        inputDescription: '',
        outputDescription: '',
        difficulty: 'Mid',
        timeLimit: '1000',
        memoryLimit: '256',
        ruleType: 'ACM',
        tags: '',
        visible: true,
        shareSubmission: false,
        source: '',
        hint: '',
        ioInput: 'input.txt',
        ioOutput: 'output.txt',
      });
      setSamples([{ input: '', output: '' }]);
      setProblemLanguages([...availableLanguages]);
      setTestCaseFile(null);
      setTestCaseId('');
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제 등록 중 오류가 발생했습니다.';
      setProblemMessage({ error: message });
    } finally {
      setProblemLoading(false);
    }
  };

  const handleBulkSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBulkMessage({});

    if (!bulkFile) {
      setBulkMessage({ error: '업로드할 ZIP 파일을 선택하세요.' });
      return;
    }

    try {
      setBulkLoading(true);
      const result = await adminService.bulkImportProblems(bulkFile);
      const count = Array.isArray(result) ? result.length : 0;
      setBulkMessage({ success: `총 ${count}개의 문제를 처리했습니다.` });
      setBulkFile(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제 대량 등록 중 오류가 발생했습니다.';
      setBulkMessage({ error: message });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleContestSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setContestMessage({});

    if (!contestForm.startTime || !contestForm.endTime) {
      setContestMessage({ error: '대회 시작/종료 시간을 모두 입력하세요.' });
      return;
    }

    const start = new Date(contestForm.startTime);
    const end = new Date(contestForm.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setContestMessage({ error: '유효한 날짜와 시간을 입력하세요.' });
      return;
    }

    const allowedIpRanges = contestForm.allowedIpRanges
      .split(/[\n,]+/)
      .map((ip) => ip.trim())
      .filter((ip) => ip.length > 0);

    const payload: CreateContestPayload = {
      title: contestForm.title.trim(),
      description: contestForm.description,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      rule_type: contestForm.ruleType,
      password: contestForm.password,
      visible: contestForm.visible,
      real_time_rank: contestForm.realTimeRank,
      allowed_ip_ranges: allowedIpRanges,
    };

    try {
      setContestLoading(true);
      const created = await adminService.createContest(payload);

      let problemError: string | undefined;
      if (created?.id && contestFormProblems.length > 0) {
        const failures: string[] = [];
        for (const item of contestFormProblems) {
          try {
            await adminService.addContestProblemFromPublic(created.id, item.problem.id, item.displayId);
          } catch (error) {
            const message = error instanceof Error ? error.message : '문제를 추가하지 못했습니다.';
            failures.push(`${item.displayId}: ${message}`);
          }
        }
        if (failures.length > 0) {
          problemError = failures.join('\n');
        }
      }

      setContestMessage({
        success:
          contestFormProblems.length > 0
            ? `대회가 성공적으로 등록되었습니다. (문제 ${contestFormProblems.length}개 추가 요청)`
            : '대회가 성공적으로 등록되었습니다.',
        error: problemError,
      });
      setContestForm({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        ruleType: 'ACM',
        password: '',
        visible: true,
        realTimeRank: true,
        allowedIpRanges: '',
      });
      setContestFormProblems([]);
      setContestFormProblemInput('');
      setContestFormProblemDisplayId('');
      setContestFormProblemSelected(null);
      setContestFormProblemSearch({ results: [], loading: false, error: null });
      setContestFormProblemMessage({});
      if (activeSection === 'contest-edit') {
        fetchContests(1, contestSearchKeywordRef.current);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '대회 등록 중 오류가 발생했습니다.';
      setContestMessage({ error: message });
    } finally {
      setContestLoading(false);
    }
  };

  const addProblemToSelection = (problem: Problem): boolean => {
    if (!Number.isInteger(problem?.id) || problem.id <= 0) {
      setWorkbookMessage({ error: '유효한 문제를 선택하세요.' });
      return false;
    }

    const normalized = String(problem.id);
    if (workbookForm.problemIds.includes(normalized)) {
      setWorkbookMessage({
        error: `${problem.displayId ?? normalized} 문제는 이미 추가되어 있습니다.`,
      });
      return false;
    }

    setWorkbookForm((prev) => ({
      ...prev,
      problemIds: [...prev.problemIds, normalized],
    }));
    setSelectedProblemMeta((prev) => ({
      ...prev,
      [normalized]: { displayId: problem.displayId ?? undefined, title: problem.title },
    }));
    setWorkbookMessage({});
    setProblemSearchResults((prev) => prev.filter((item) => item.id !== problem.id));
    return true;
  };

  const handleCreateWorkbookProblemInputChange = (value: string) => {
    setWorkbookProblemInput(value);
    setWorkbookMessage({});
  };

  const handleAddWorkbookProblemId = () => {
    const trimmed = workbookProblemInput.trim();
    if (!trimmed) {
      return;
    }

    if (isProblemSearchLoading) {
      return;
    }

    const match = problemSearchResults.find((problem) => {
      const matchesId = String(problem.id) === trimmed;
      const matchesDisplay = problem.displayId
        ? problem.displayId.toLowerCase() === trimmed.toLowerCase()
        : false;
      return matchesId || matchesDisplay;
    });

    if (!match) {
      setWorkbookMessage({ error: '검색 결과에서 문제를 선택해주세요.' });
      return;
    }

    if (addProblemToSelection(match)) {
      setWorkbookProblemInput('');
    }
  };

  const handleSelectCreationProblemSuggestion = (problem: Problem) => {
    if (addProblemToSelection(problem)) {
      setWorkbookProblemInput('');
    }
  };

  const handleSelectWorkbookProblemSuggestion = async (workbookId: number, problem: Problem) => {
    await appendProblemToWorkbook(workbookId, problem);
  };

  const handleRemoveWorkbookProblemId = (target: string) => {
    setWorkbookForm((prev) => ({
      ...prev,
      problemIds: prev.problemIds.filter((id) => id !== target),
    }));
    setSelectedProblemMeta((prev) => {
      if (!prev[target]) {
        return prev;
      }
      const next = { ...prev };
      delete next[target];
      return next;
    });
  };

  const handleCreateWorkbookProblemInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddWorkbookProblemId();
    }
  };

  const handleWorkbookSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorkbookMessage({});

    if (!workbookForm.title.trim()) {
      setWorkbookMessage({ error: '문제집 제목을 입력하세요.' });
      return;
    }

    const trimmedProblemIds = workbookForm.problemIds
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    const parsedProblemIds: number[] = [];
    for (const value of trimmedProblemIds) {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        setWorkbookMessage({ error: '문제 ID는 양의 정수로 입력하세요.' });
        return;
      }
      parsedProblemIds.push(parsed);
    }

    const uniqueProblemIds = Array.from(new Set(parsedProblemIds));

    const payload: CreateWorkbookPayload = {
      title: workbookForm.title.trim(),
      description: workbookForm.description.trim() || undefined,
      category: workbookForm.category.trim() || undefined,
      is_public: workbookForm.isPublic,
    };

    if (uniqueProblemIds.length > 0) {
      payload.problemIds = uniqueProblemIds;
    }

    try {
      setWorkbookLoading(true);
      const workbook = await adminService.createWorkbook(payload);
      setWorkbookMessage({ success: `문제집(ID: ${workbook.id})이 등록되었습니다.` });
      setWorkbookForm({
        title: '',
        description: '',
        category: '',
        isPublic: false,
        problemIds: [],
      });
      setWorkbookProblemInput('');
      setProblemSearchResults([]);
      setProblemSearchError(null);
      setIsProblemSearchLoading(false);
      setSelectedProblemMeta({});
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제집 등록 중 오류가 발생했습니다.';
      setWorkbookMessage({ error: message });
    } finally {
      setWorkbookLoading(false);
    }
  };

  const renderActiveSection = () => {
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <div className="space-y-4 text-center">
              <h1 className="text-xl font-semibold text-gray-900">로그인이 필요합니다</h1>
              <p className="text-sm text-gray-600">관리자 기능을 사용하려면 먼저 로그인하세요.</p>
              <Button onClick={() => navigate('/login')}>
                로그인 페이지로 이동
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <div className="space-y-4 text-center">
              <h1 className="text-xl font-semibold text-gray-900">권한이 없습니다</h1>
              <p className="text-sm text-gray-600">관리자 전용 페이지입니다. 권한이 필요하면 운영자에게 문의해주세요.</p>
              <Button variant="outline" onClick={() => navigate('/')}>메인으로 돌아가기</Button>
            </div>
          </Card>
        </div>
      );
    }

    switch (activeSection) {
      case 'server': {
        const activeJudgeServers = judgeServers.filter((item) => item.status === 'normal' && !item.is_disabled).length;
        const totalJudgeServers = judgeServers.length;
        const judgeServersStatus: ServiceHealthStatus = {
          name: 'Judge Servers',
          status:
            totalJudgeServers > 0
              ? 'online'
              : backendStatus.status === 'offline'
                ? 'offline'
                : 'unknown',
          message:
            totalJudgeServers > 0
              ? `${activeJudgeServers}/${totalJudgeServers} 활성`
              : '등록된 서버가 없습니다.',
          lastChecked: judgeServers[0]?.last_heartbeat,
        };
        const serviceCards = [backendStatus, microServiceStatus, judgeServersStatus];

        return (
          <Card padding="lg">
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-gray-900">서버 관리</h2>
                  <p className="text-sm text-gray-500">채점 서버와 마이크로 서비스 상태를 확인하고 관리할 수 있습니다.</p>
                </div>
                <Button variant="outline" onClick={handleRefreshServers} loading={judgeServerLoading}>
                  새로고침
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {serviceCards.map((item) => (
                  <div
                    key={item.name}
                    className={`rounded-lg border px-4 py-3 shadow-sm ${getStatusPillClass(item.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{item.name}</span>
                      <span className="text-xs text-gray-500">{item.lastChecked ? new Date(item.lastChecked).toLocaleTimeString() : ''}</span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-base font-medium">
                        {item.status === 'online' ? 'ON' : item.status === 'offline' ? 'OFF' : 'UNKNOWN'}
                      </span>
                      <span className="text-xs text-gray-600">{formatLatency(item.latency)}</span>
                    </div>
                    {item.message && <p className="mt-2 text-xs text-gray-600">{item.message}</p>}
                  </div>
                ))}
              </div>

              <section className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Judge Server 토큰</h3>
                  <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-700">
                    {judgeServerToken || '토큰 정보가 없습니다.'}
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">상태</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">호스트명</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">작업</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">CPU</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">메모리</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">IP</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">비활성화</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {judgeServerLoading ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                            채점 서버 정보를 불러오는 중입니다...
                          </td>
                        </tr>
                      ) : judgeServerError ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-6 text-center text-sm text-red-600">{judgeServerError}</td>
                        </tr>
                      ) : judgeServers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                            등록된 채점 서버가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        judgeServers.map((server) => {
                          const online = server.status === 'normal' && !server.is_disabled;
                          return (
                            <tr key={server.id} className="transition-colors hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    online ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  {online ? '정상' : '오프라인'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <div className="font-medium text-gray-900">{server.hostname}</div>
                                <div className="text-xs text-gray-500">버전 {server.judger_version ?? '-'}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">{server.task_number}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{server.cpu_usage}% / {server.cpu_core}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{server.memory_usage}%</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{server.ip ?? '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={server.is_disabled}
                                    onChange={(event) => handleToggleJudgeServerDisabled(server, event.target.checked)}
                                    disabled={updatingJudgeServerId === server.id}
                                  />
                                  <span>{server.is_disabled ? '비활성' : '활성'}</span>
                                </label>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                  onClick={() => handleDeleteJudgeServer(server.hostname)}
                                  loading={deletingJudgeServerHostname === server.hostname}
                                >
                                  삭제
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </Card>
        );
      }

      case 'contest-edit': {
        const pageSize = 10;
        const totalPages = Math.max(1, Math.ceil(contestTotal / pageSize));
        const canPrev = contestPage > 1;
        const canNext = contestPage < totalPages;

        return (
          <Card padding="lg">
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-gray-900">대회 수정</h2>
                <p className="text-sm text-gray-500">등록된 대회를 검색해 세부 정보를 확인하고 수정합니다.</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="w-full sm:flex-1">
                  <Input
                    type="search"
                    label="검색"
                    placeholder="대회 제목"
                    value={contestSearchKeyword}
                    onChange={(e) => handleContestSearchInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleContestSearchSubmit();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleContestSearchSubmit}
                  className="w-full sm:w-auto bg-[#113F67] text-white hover:bg-[#34699A] focus:ring-[#58A0C8]"
                >
                  검색
                </Button>
              </div>

              <section className="space-y-4">
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">제목</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">기간</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">공개</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">상태</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {contestListLoading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                            대회 목록을 불러오는 중입니다...
                          </td>
                        </tr>
                      ) : contestListError ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-sm text-red-600">{contestListError}</td>
                        </tr>
                      ) : contestList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">등록된 대회가 없습니다.</td>
                        </tr>
                      ) : (
                        contestList.map((contest) => {
                          const isActive = selectedContest?.id === contest.id;
                          const duration = `${formatDateTime(contest.startTime)} ~ ${formatDateTime(contest.endTime)}`;
                          return (
                            <tr
                              key={contest.id}
                              className={`cursor-pointer transition-colors ${
                                isActive ? 'bg-[#E7F2F8]' : 'hover:bg-gray-50'
                              }`}
                              onClick={() => handleSelectContest(contest)}
                            >
                              <td className="px-4 py-3 text-sm text-gray-900">{contest.title}</td>
                              <td className="px-4 py-3 text-xs text-gray-600">{duration}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{contest.visible ? '공개' : '비공개'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{contest.status ?? '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <Button type="button" variant="ghost" onClick={() => handleSelectContest(contest)}>
                                  선택
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                  <span>전체 {contestTotal.toLocaleString()}개 · 현재 {contestList.length}개 표시 중</span>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => handleContestPageChange('prev')}>
                      이전
                    </Button>
                    <span className="text-sm text-gray-600">
                      {contestPage} / {totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={!canNext} onClick={() => handleContestPageChange('next')}>
                      다음
                    </Button>
                  </div>
                </div>
              </section>

              <section className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-gray-900">대회 상세</h3>
                  <p className="text-xs text-gray-500">선택한 대회의 기본 정보를 수정할 수 있습니다.</p>
                </div>

                {contestDetailLoading ? (
                  <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-gray-500">
                    대회 정보를 불러오는 중입니다...
                  </div>
                ) : selectedContest && contestEditForm ? (
                  <form onSubmit={handleContestEditSubmit} className="space-y-5">
                    {contestEditMessage.error && (
                      <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{contestEditMessage.error}</div>
                    )}
                    {contestEditMessage.success && (
                      <div className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-600">{contestEditMessage.success}</div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Input
                          label="대회 제목"
                          value={contestEditForm.title}
                          onChange={(e) => handleContestEditChange('title', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">룰 타입</label>
                        <input
                          value={selectedContest.ruleType}
                          className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                          readOnly
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">설명</label>
                      <textarea
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                        rows={4}
                        value={contestEditForm.description}
                        onChange={(e) => handleContestEditChange('description', e.target.value)}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">시작 시각</label>
                        <input
                          type="datetime-local"
                          value={contestEditForm.startTime}
                          onChange={(e) => handleContestEditChange('startTime', e.target.value)}
                          required
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">종료 시각</label>
                        <input
                          type="datetime-local"
                          value={contestEditForm.endTime}
                          onChange={(e) => handleContestEditChange('endTime', e.target.value)}
                          required
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={contestEditForm.visible}
                          onChange={(e) => handleContestEditChange('visible', e.target.checked)}
                        />
                        <span>대회 공개</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={contestEditForm.realTimeRank}
                          onChange={(e) => handleContestEditChange('realTimeRank', e.target.checked)}
                        />
                        <span>실시간 랭킹</span>
                      </label>
                    </div>

                    <Input
                      label="대회 비밀번호"
                      value={contestEditForm.password}
                      onChange={(e) => handleContestEditChange('password', e.target.value)}
                    />

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">허용 IP 범위</label>
                      <textarea
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                        rows={3}
                        value={contestEditForm.allowedIpRanges}
                        onChange={(e) => handleContestEditChange('allowedIpRanges', e.target.value)}
                        placeholder="줄바꿈 또는 쉼표로 구분"
                      />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">대회 문제 구성</label>
                        <p className="mt-1 text-xs text-gray-500">공개 문제를 검색해 추가하거나 이미 등록된 문제를 삭제할 수 있습니다.</p>
                      </div>

                      {contestProblemMessage.error && (
                        <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{contestProblemMessage.error}</div>
                      )}
                      {contestProblemMessage.success && (
                        <div className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-600">{contestProblemMessage.success}</div>
                      )}

                      {contestProblemsState.loading ? (
                        <div className="rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
                          대회 문제 정보를 불러오는 중입니다...
                        </div>
                      ) : contestProblemsState.error ? (
                        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{contestProblemsState.error}</div>
                      ) : contestProblemsState.items.length === 0 ? (
                        <div className="rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
                          아직 등록된 문제가 없습니다. 아래에서 문제를 추가해 보세요.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {contestProblemsState.items.map((item) => {
                            const label = item.displayId ?? String(item.id);
                            const title = item.title;
                            return (
                              <span
                                key={`contest-problem-chip-${item.id}`}
                                className="inline-flex items-center gap-2 rounded-full bg-[#113F67]/10 px-3 py-1 text-sm text-[#113F67]"
                              >
                                <span className="font-medium">문제 {label}</span>
                                {title && (
                                  <span className="max-w-[180px] truncate text-xs text-gray-500">{title}</span>
                                )}
                                <button
                                  type="button"
                                  className="text-[#113F67] transition-colors hover:text-[#34699A] disabled:opacity-60"
                                  onClick={() => void handleRemoveContestProblem(item.id, label)}
                                  disabled={deletingContestProblemId === item.id}
                                  aria-label={`문제 ${label} 삭제`}
                                >
                                  {deletingContestProblemId === item.id ? '삭제중' : '×'}
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="sm:col-span-2 space-y-2">
                            <Input
                              label="문제 검색 또는 ID"
                              value={contestProblemInput}
                              placeholder="예: 1001 또는 다익스트라"
                              onChange={(e) => handleContestProblemInputChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void handleAddContestProblem();
                                }
                              }}
                            />
                            {contestProblemSearch.error && (
                              <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{contestProblemSearch.error}</div>
                            )}
                            {!contestProblemSearch.error && contestProblemInput.trim() && contestProblemSearch.loading && (
                              <p className="text-xs text-gray-500">문제를 검색 중입니다...</p>
                            )}
                            {!contestProblemSearch.error && contestProblemInput.trim() && !contestProblemSearch.loading && contestProblemSearch.results.length === 0 && (
                              <p className="text-xs text-gray-500">검색 결과가 없습니다.</p>
                            )}
                            {!contestProblemSearch.error && contestProblemInput.trim() && contestProblemSearch.results.length > 0 && (
                              <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200">
                                {contestProblemSearch.results.map((result) => (
                                  <li key={`contest-problem-suggestion-${result.id}`}>
                                    <button
                                      type="button"
                                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
                                      onClick={() => handleSelectContestProblemSuggestion(result)}
                                    >
                                      <div>
                                        <p className="font-medium text-gray-800">
                                          {result.displayId ?? result.id} · {result.title}
                                        </p>
                                        <p className="text-xs text-gray-500">난이도: {result.difficulty}</p>
                                      </div>
                                      <span className="text-xs text-[#113F67]">선택</span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <Input
                            label="표시 ID"
                            value={contestProblemDisplayId}
                            placeholder="예: A, B, P100"
                            onChange={(e) => handleContestProblemDisplayIdChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void handleAddContestProblem();
                              }
                            }}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            loading={contestProblemActionLoading}
                            onClick={() => void handleAddContestProblem()}
                          >
                            문제 추가
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Button type="submit" loading={contestEditLoading}>
                        정보 저장
                      </Button>
                      <Button type="button" variant="ghost" onClick={handleContestResetForm}>
                        초기화
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-sm text-gray-500">
                    목록에서 수정할 대회를 선택하세요.
                  </div>
                )}
              </section>
            </div>
          </Card>
        );
      }

      case 'user': {
        const totalPages = Math.max(1, Math.ceil(userTotal / USER_PAGE_SIZE));
        const canPrev = userPage > 1;
        const canNext = userPage < totalPages;

        return (
          <Card padding="lg">
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-gray-900">사용자 관리</h2>
                <p className="text-sm text-gray-500">검색으로 계정을 찾고, 바로 아래에서 권한과 상태를 수정하세요.</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="w-full sm:flex-1">
                  <Input
                    type="search"
                    label="검색"
                    placeholder="아이디, 이름, 이메일"
                    value={userSearchKeyword}
                    onChange={(e) => handleUserSearchInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUserSearchSubmit();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleUserSearchSubmit}
                  className="w-full sm:w-auto bg-[#113F67] text-white hover:bg-[#34699A] focus:ring-[#58A0C8]"
                >
                  검색
                </Button>
              </div>

              <section className="space-y-4">
                <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-left">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">아이디</th>
                          <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">이름</th>
                          <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">이메일</th>
                          <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">유형</th>
                          <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">상태</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {userListLoading ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                              사용자 목록을 불러오는 중입니다...
                            </td>
                          </tr>
                        ) : userListError ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-red-600">{userListError}</td>
                          </tr>
                        ) : userList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">조건에 맞는 사용자가 없습니다.</td>
                          </tr>
                        ) : (
                          userList.map((item) => {
                            const isActive = selectedUser?.id === item.id;
                            return (
                              <tr
                                key={item.id}
                                onClick={() => handleSelectUser(item)}
                                className={`cursor-pointer transition-colors ${
                                  isActive ? 'bg-[#E7F2F8]' : 'hover:bg-gray-50'
                                }`}
                              >
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.username}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{item.real_name || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{item.email || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{item.admin_type}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                      item.is_disabled ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                    }`}
                                  >
                                    {item.is_disabled ? '비활성' : '활성'}
                                  </span>
                                  <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                    TFA {item.two_factor_auth ? 'ON' : 'OFF'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                    <span>전체 {userTotal.toLocaleString()}명 · 현재 {userList.length}명 표시 중</span>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => handleUserPageChange('prev')}>
                        이전
                      </Button>
                      <span className="text-sm text-gray-600">
                        {userPage} / {totalPages}
                      </span>
                      <Button variant="outline" size="sm" disabled={!canNext} onClick={() => handleUserPageChange('next')}>
                        다음
                      </Button>
                    </div>
                  </div>
              </section>

              <section className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-gray-900">계정 상세</h3>
                  <p className="text-xs text-gray-500">선택한 계정의 기본 정보는 읽기 전용이며, 권한과 상태만 변경 가능합니다.</p>
                </div>

                {selectedUser && userForm ? (
                  <form onSubmit={handleUserUpdate} className="space-y-5">
                    {userFormMessage.error && (
                      <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{userFormMessage.error}</div>
                    )}
                    {userFormMessage.success && (
                      <div className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-600">{userFormMessage.success}</div>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-500">아이디</div>
                        <div className="text-sm font-medium text-gray-900">{selectedUser.username}</div>
                      </div>
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-500">이름</div>
                        <div className="text-sm font-medium text-gray-900">{selectedUser.real_name || '-'}</div>
                      </div>
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-500">이메일</div>
                        <div className="text-sm font-medium text-gray-900">{selectedUser.email || '-'}</div>
                      </div>
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-500">마지막 로그인</div>
                        <div className="text-sm font-medium text-gray-900">{formatDateTime(selectedUser.last_login)}</div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">사용자 유형</label>
                        <select
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                          value={userForm.admin_type}
                          onChange={(e) => handleUserFormChange('admin_type', e.target.value)}
                        >
                          <option value="Regular User">Regular User</option>
                          <option value="Admin">Admin</option>
                          <option value="Super Admin">Super Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">문제 권한</label>
                        <select
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8] disabled:bg-gray-100"
                          value={userForm.problem_permission}
                          onChange={(e) => handleUserFormChange('problem_permission', e.target.value)}
                          disabled={userForm.admin_type !== 'Admin'}
                        >
                          <option value="None">None</option>
                          <option value="Own">Own</option>
                          <option value="All">All</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={Boolean(userForm.two_factor_auth)}
                          onChange={(e) => handleUserFormChange('two_factor_auth', e.target.checked)}
                        />
                        <span>2단계 인증 활성화</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={Boolean(userForm.open_api)}
                          onChange={(e) => handleUserFormChange('open_api', e.target.checked)}
                        />
                        <span>Open API 사용</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={Boolean(userForm.is_disabled)}
                          onChange={(e) => handleUserFormChange('is_disabled', e.target.checked)}
                        />
                        <span>계정 비활성화</span>
                      </label>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Button type="submit" loading={userFormLoading}>
                        정보 저장
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={handleUserDelete}
                        loading={userDeleteLoading}
                      >
                        사용자 삭제
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-sm text-gray-500">
                    목록에서 관리할 사용자를 선택하세요.
                  </div>
                )}
              </section>
            </div>
          </Card>
        );
      }
      case 'problem':
        return (
          <Card padding="lg">
            <form onSubmit={handleProblemSubmit} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-gray-900">문제 등록</h2>
                <p className="text-sm text-gray-500">ZIP 테스트케이스 업로드 후 메타데이터를 입력하세요. SPJ는 현재 지원하지 않습니다.</p>
              </div>

              {problemMessage.error && (
                <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{problemMessage.error}</div>
              )}
              {problemMessage.success && (
                <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-600">{problemMessage.success}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="표시 ID"
                  value={problemForm.displayId}
                  onChange={(e) => setProblemForm((prev) => ({ ...prev, displayId: e.target.value }))}
                  required
                />
                <Input
                  label="제목"
                  value={problemForm.title}
                  onChange={(e) => setProblemForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
                <Input
                  label="시간 제한 (ms)"
                  type="number"
                  value={problemForm.timeLimit}
                  onChange={(e) => setProblemForm((prev) => ({ ...prev, timeLimit: e.target.value }))}
                />
                <Input
                  label="메모리 제한 (MB)"
                  type="number"
                  value={problemForm.memoryLimit}
                  onChange={(e) => setProblemForm((prev) => ({ ...prev, memoryLimit: e.target.value }))}
                />
                <Input
                  label="태그 (쉼표로 구분)"
                  value={problemForm.tags}
                  onChange={(e) => setProblemForm((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="dp, greedy"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">난이도</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                    value={problemForm.difficulty}
                    onChange={(e) => setProblemForm((prev) => ({ ...prev, difficulty: e.target.value as ProblemFormState['difficulty'] }))}
                  >
                    <option value="Low">Level1</option>
                    <option value="Mid">Level2</option>
                    <option value="High">Level3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">룰 타입</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                    value={problemForm.ruleType}
                    onChange={(e) => setProblemForm((prev) => ({ ...prev, ruleType: e.target.value as ProblemFormState['ruleType'] }))}
                  >
                    <option value="ACM">ACM</option>
                    <option value="OI">OI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">공개/풀이 공유</label>
                  <div className="flex items-center space-x-3">
                    <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={problemForm.visible}
                        onChange={(e) => setProblemForm((prev) => ({ ...prev, visible: e.target.checked }))}
                      />
                      <span>공개</span>
                    </label>
                    <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={problemForm.shareSubmission}
                        onChange={(e) => setProblemForm((prev) => ({ ...prev, shareSubmission: e.target.checked }))}
                      />
                      <span>풀이 공유 허용</span>
                    </label>
                  </div>
                </div>
                <Input
                  label="출처"
                  value={problemForm.source}
                  onChange={(e) => setProblemForm((prev) => ({ ...prev, source: e.target.value }))}
                />
                <Input
                  label="힌트"
                  value={problemForm.hint}
                  onChange={(e) => setProblemForm((prev) => ({ ...prev, hint: e.target.value }))}
                />
                <Input
                  label="IO 입력 파일명"
                  value={problemForm.ioInput}
                  onChange={(e) => setProblemForm((prev) => ({ ...prev, ioInput: e.target.value }))}
                />
                <Input
                  label="IO 출력 파일명"
                  value={problemForm.ioOutput}
                  onChange={(e) => setProblemForm((prev) => ({ ...prev, ioOutput: e.target.value }))}
                />
              </div>

              <RichTextEditor
                label="문제 설명"
                value={problemForm.description}
                placeholder="문제 설명을 입력하세요."
                onChange={(html: string) => setProblemForm((prev) => ({ ...prev, description: html }))}
              />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <RichTextEditor
                  label="입력 설명"
                  value={problemForm.inputDescription}
                  placeholder="입력 형식을 설명해주세요."
                  onChange={(html: string) => setProblemForm((prev) => ({ ...prev, inputDescription: html }))}
                  className="md:col-span-1"
                />
                <RichTextEditor
                  label="출력 설명"
                  value={problemForm.outputDescription}
                  placeholder="출력 형식을 설명해주세요."
                  onChange={(html: string) => setProblemForm((prev) => ({ ...prev, outputDescription: html }))}
                  className="md:col-span-1"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">예제 입력/출력</h3>
                  <Button type="button" variant="outline" onClick={handleAddSample}>
                    예제 추가
                  </Button>
                </div>
                <div className="space-y-4">
                  {samples.map((sample, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">예제 입력 #{index + 1}</label>
                        <textarea
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8] resize-none"
                          rows={3}
                          value={sample.input}
                          onChange={(e) => handleSampleChange(index, 'input', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">예제 출력 #{index + 1}</label>
                        <textarea
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8] resize-none"
                          rows={3}
                          value={sample.output}
                          onChange={(e) => handleSampleChange(index, 'output', e.target.value)}
                        />
                      </div>
                      {samples.length > 1 && (
                        <div className="md:col-span-2 flex justify-end">
                          <Button type="button" variant="ghost" onClick={() => handleRemoveSample(index)}>
                            예제 삭제
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">지원 언어</h3>
                <div className="flex flex-wrap gap-3">
                  {availableLanguages.map((language) => (
                    <label
                      key={language}
                      className="inline-flex items-center space-x-2 rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={problemLanguages.includes(language)}
                        onChange={() => toggleLanguage(language)}
                      />
                      <span>{getLanguageLabel(language)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">테스트케이스 업로드</h3>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setTestCaseFile(e.target.files?.[0] ?? null)}
                    className="text-sm"
                  />
                  <Button type="button" variant="outline" loading={isUploadingTestCases} onClick={handleUploadTestCases}>
                    테스트케이스 업로드
                  </Button>
                  {testCaseId && (
                    <span className="text-sm text-green-600">현재 ID: {testCaseId}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" loading={problemLoading}>문제 등록</Button>
              </div>
            </form>
          </Card>
        );
      case 'bulk':
        return (
          <Card padding="lg">
            <form onSubmit={handleBulkSubmit} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-gray-900">문제 대량 등록</h2>
                <p className="text-sm text-gray-500">JSON 기반 ZIP 파일을 업로드하면 문제를 일괄 등록합니다.</p>
              </div>

              {bulkMessage.error && (
                <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{bulkMessage.error}</div>
              )}
              {bulkMessage.success && (
                <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-600">{bulkMessage.success}</div>
              )}

              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
                  className="text-sm"
                />
                {bulkFile && <span className="text-sm text-gray-600">선택된 파일: {bulkFile.name}</span>}
              </div>

              <div className="flex justify-end">
                <Button type="submit" loading={bulkLoading}>대량 등록</Button>
              </div>
            </form>
          </Card>
        );
      case 'problem-edit': {
        const totalPages = Math.max(1, Math.ceil(problemEditTotal / PROBLEM_EDIT_PAGE_SIZE));
        const canPrev = problemEditPage > 1;
        const canNext = problemEditPage < totalPages;

        return (
          <Card padding="lg">
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-gray-900">문제 수정</h2>
                <p className="text-sm text-gray-500">OJ 백엔드에 등록된 문제를 검색하고 세부 정보를 수정하세요.</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="w-full sm:flex-1">
                  <Input
                    label="검색"
                    value={problemEditSearchKeyword}
                    placeholder="표시 ID, 제목 등"
                    onChange={(e) => handleProblemEditSearchChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleProblemEditSearchSubmit();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleProblemEditSearchSubmit} className="w-full sm:w-auto bg-[#113F67] text-white hover:bg-[#34699A] focus:ring-[#58A0C8]">
                  검색
                </Button>
              </div>

              <section className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <h3 className="text-sm font-medium text-gray-900">문제 목록</h3>
                    <span className="text-xs text-gray-500">총 {problemEditTotal.toLocaleString()}개</span>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                    {problemEditLoading ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">문제를 불러오는 중입니다...</div>
                    ) : problemEditError ? (
                      <div className="px-4 py-6 text-sm text-red-600">{problemEditError}</div>
                    ) : problemEditList.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-gray-500">검색 결과가 없습니다.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-left">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">표시 ID</th>
                              <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">제목</th>
                              <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">난이도</th>
                              <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">공개</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {problemEditList.map((problem) => {
                              const isActive = selectedProblemId === problem.id;
                              return (
                                <tr
                                  key={`problem-edit-row-${problem.id}`}
                                  className={`cursor-pointer transition-colors ${isActive ? 'bg-[#113F67]/10' : 'hover:bg-gray-50'}`}
                                  onClick={() => setSelectedProblemId(problem.id)}
                                >
                                  <td className="px-3 py-2 text-sm text-gray-900">{problem.displayId ?? problem.id}</td>
                                  <td className="px-3 py-2 text-sm text-gray-700">
                                    <div className="font-medium text-gray-900">{problem.title}</div>
                                    {problem.tags && problem.tags.length > 0 && (
                                      <div className="mt-0.5 text-xs text-gray-500 truncate">{problem.tags.join(', ')}</div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-700">{problem.difficulty}</td>
                                  <td className="px-3 py-2 text-sm">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${problem.visible ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                      {problem.visible ? '공개' : '비공개'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div>
                      {problemEditPage} / {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={!canPrev}
                        onClick={() => canPrev && fetchProblemEditList(problemEditPage - 1)}
                      >
                        이전
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={!canNext}
                        onClick={() => canNext && fetchProblemEditList(problemEditPage + 1)}
                      >
                        다음
                      </Button>
                    </div>
                  </div>
                </div>

                {problemEditDetailLoading ? (
                  <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                    문제 정보를 불러오는 중입니다...
                  </div>
                ) : !problemEditForm ? (
                  <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                    수정할 문제를 선택하세요.
                  </div>
                ) : (
                  <form onSubmit={handleProblemEditSubmit} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    {problemEditMessage.error && (
                      <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{problemEditMessage.error}</div>
                    )}
                    {problemEditMessage.success && (
                      <div className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-600">{problemEditMessage.success}</div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="표시 ID"
                        value={problemEditForm.displayId}
                        onChange={(e) => handleProblemEditFieldChange('displayId', e.target.value)}
                        required
                      />
                      <Input
                        label="제목"
                        value={problemEditForm.title}
                        onChange={(e) => handleProblemEditFieldChange('title', e.target.value)}
                        required
                      />
                      <Input
                        label="시간 제한 (ms)"
                        type="number"
                        value={problemEditForm.timeLimit}
                        onChange={(e) => handleProblemEditFieldChange('timeLimit', e.target.value)}
                      />
                      <Input
                        label="메모리 제한 (MB)"
                        type="number"
                        value={problemEditForm.memoryLimit}
                        onChange={(e) => handleProblemEditFieldChange('memoryLimit', e.target.value)}
                      />
                      <Input
                        label="태그 (쉼표 구분)"
                        value={problemEditForm.tags}
                        onChange={(e) => handleProblemEditFieldChange('tags', e.target.value)}
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">난이도</label>
                        <select
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                          value={problemEditForm.difficulty}
                          onChange={(e) => handleProblemEditFieldChange('difficulty', e.target.value as AdminProblemDetail['difficulty'])}
                        >
                          <option value="Low">Level1</option>
                          <option value="Mid">Level2</option>
                          <option value="High">Level3</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">표시 설정</label>
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={problemEditForm.visible}
                              onChange={(e) => handleProblemEditFieldChange('visible', e.target.checked)}
                            />
                            <span>공개</span>
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={problemEditForm.shareSubmission}
                              onChange={(e) => handleProblemEditFieldChange('shareSubmission', e.target.checked)}
                            />
                            <span>풀이 공유</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label="입력 파일명"
                        value={problemEditForm.ioInput}
                        onChange={(e) => handleProblemEditFieldChange('ioInput', e.target.value)}
                      />
                      <Input
                        label="출력 파일명"
                        value={problemEditForm.ioOutput}
                        onChange={(e) => handleProblemEditFieldChange('ioOutput', e.target.value)}
                      />
                    </div>

                    <RichTextEditor
                      label="문제 설명"
                      value={problemEditForm.description}
                      placeholder="문제 설명을 입력하세요."
                      onChange={(html: string) => handleProblemEditFieldChange('description', html)}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <RichTextEditor
                        label="입력 설명"
                        value={problemEditForm.inputDescription}
                        placeholder="입력 형식을 설명해주세요."
                        onChange={(html: string) => handleProblemEditFieldChange('inputDescription', html)}
                        className="md:col-span-1"
                      />
                      <RichTextEditor
                        label="출력 설명"
                        value={problemEditForm.outputDescription}
                        placeholder="출력 형식을 설명해주세요."
                        onChange={(html: string) => handleProblemEditFieldChange('outputDescription', html)}
                        className="md:col-span-1"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">힌트</label>
                        <textarea
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#58A0C8] resize-none"
                          rows={2}
                          value={problemEditForm.hint}
                          onChange={(e) => handleProblemEditFieldChange('hint', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">출처</label>
                        <textarea
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#58A0C8] resize-none"
                          rows={2}
                          value={problemEditForm.source}
                          onChange={(e) => handleProblemEditFieldChange('source', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">예시</h4>
                        <Button type="button" variant="outline" onClick={handleAddProblemEditSample}>
                          예시 추가
                        </Button>
                      </div>
                      <div className="space-y-4">
                        {problemEditForm.samples.map((sample, index) => (
                          <div key={`problem-edit-sample-${index}`} className="rounded-lg border border-gray-200 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">예시 {index + 1}</span>
                              {problemEditForm.samples.length > 1 && (
                                <button
                                  type="button"
                                  className="text-xs text-red-600 hover:text-red-700"
                                  onClick={() => handleRemoveProblemEditSample(index)}
                                >
                                  삭제
                                </button>
                              )}
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">입력</label>
                                <textarea
                                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#58A0C8] resize-none"
                                  rows={3}
                                  value={sample.input}
                                  onChange={(e) => handleProblemEditSampleChange(index, 'input', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">출력</label>
                                <textarea
                                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#58A0C8] resize-none"
                                  rows={3}
                                  value={sample.output}
                                  onChange={(e) => handleProblemEditSampleChange(index, 'output', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">허용 언어</h4>
                      <div className="flex flex-wrap gap-3">
                        {availableLanguages.map((language) => {
                          const checked = problemEditForm.languages.includes(language);
                          return (
                            <label
                              key={`problem-edit-language-${language}`}
                              className="inline-flex items-center gap-2 text-xs text-gray-700"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => handleProblemEditLanguageToggle(language, e.target.checked)}
                              />
                              <span>{getLanguageLabel(language)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" loading={problemEditSaving}>
                        문제 정보 저장
                      </Button>
                    </div>
                  </form>
                )}
              </section>
            </div>
          </Card>
        );
      }
      case 'contest':
        return (
          <Card padding="lg">
            <form onSubmit={handleContestSubmit} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-gray-900">대회 등록</h2>
                <p className="text-sm text-gray-500">대회 기본 정보를 입력한 뒤 등록할 수 있습니다.</p>
              </div>

              {contestMessage.error && (
                <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{contestMessage.error}</div>
              )}
              {contestMessage.success && (
                <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-600">{contestMessage.success}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="대회 제목"
                  value={contestForm.title}
                  onChange={(e) => setContestForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
                <Input
                  label="대회 비밀번호 (선택)"
                  value={contestForm.password}
                  onChange={(e) => setContestForm((prev) => ({ ...prev, password: e.target.value }))}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                    value={contestForm.startTime}
                    onChange={(e) => setContestForm((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                    value={contestForm.endTime}
                    onChange={(e) => setContestForm((prev) => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">룰 타입</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                    value={contestForm.ruleType}
                    onChange={(e) => setContestForm((prev) => ({ ...prev, ruleType: e.target.value as ContestFormState['ruleType'] }))}
                  >
                    <option value="ACM">ACM</option>
                    <option value="OI">OI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">표시 설정</label>
                  <div className="flex items-center space-x-3">
                    <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={contestForm.visible}
                        onChange={(e) => setContestForm((prev) => ({ ...prev, visible: e.target.checked }))}
                      />
                      <span>공개</span>
                    </label>
                    <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={contestForm.realTimeRank}
                        onChange={(e) => setContestForm((prev) => ({ ...prev, realTimeRank: e.target.checked }))}
                      />
                      <span>실시간 랭크</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">대회 설명</label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                  rows={4}
                  value={contestForm.description}
                  onChange={(e) => setContestForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">허용 IP CIDR (쉼표 또는 줄바꿈 구분)</label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                  rows={2}
                  value={contestForm.allowedIpRanges}
                  onChange={(e) => setContestForm((prev) => ({ ...prev, allowedIpRanges: e.target.value }))}
                  placeholder="127.0.0.1/32, 10.0.0.0/24"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">대회 문제 구성</label>
                  <p className="mt-1 text-xs text-gray-500">등록 전에 포함할 문제를 검색해 선택하세요. 대회 생성 후 자동으로 추가됩니다.</p>
                </div>

                {contestFormProblemMessage.error && (
                  <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{contestFormProblemMessage.error}</div>
                )}
                {contestFormProblemMessage.success && (
                  <div className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-600">{contestFormProblemMessage.success}</div>
                )}

                {contestFormProblems.length === 0 ? (
                  <div className="rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
                    아직 선택한 문제가 없습니다. 아래에서 검색해 추가하세요.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {contestFormProblems.map((item) => (
                      <span
                        key={`contest-form-problem-${item.problem.id}`}
                        className="inline-flex items-center gap-2 rounded-full bg-[#113F67]/10 px-3 py-1 text-sm text-[#113F67]"
                      >
                        <span className="font-medium">문제 {item.displayId}</span>
                        {item.problem.title && (
                          <span className="max-w-[160px] truncate text-xs text-gray-500">{item.problem.title}</span>
                        )}
                        <button
                          type="button"
                          className="text-[#113F67] transition-colors hover:text-[#34699A]"
                          onClick={() => handleRemoveContestFormProblem(item.problem.id)}
                          aria-label={`문제 ${item.displayId} 삭제`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2 space-y-2">
                      <Input
                        label="문제 검색 또는 ID"
                        value={contestFormProblemInput}
                        placeholder="예: 1001 또는 다익스트라"
                        onChange={(e) => handleContestFormProblemInputChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleAddContestFormProblem();
                          }
                        }}
                      />
                      {contestFormProblemSearch.error && (
                        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{contestFormProblemSearch.error}</div>
                      )}
                      {!contestFormProblemSearch.error && contestFormProblemInput.trim() && contestFormProblemSearch.loading && (
                        <p className="text-xs text-gray-500">문제를 검색 중입니다...</p>
                      )}
                      {!contestFormProblemSearch.error && contestFormProblemInput.trim() && !contestFormProblemSearch.loading && contestFormProblemSearch.results.length === 0 && (
                        <p className="text-xs text-gray-500">검색 결과가 없습니다.</p>
                      )}
                      {!contestFormProblemSearch.error && contestFormProblemInput.trim() && contestFormProblemSearch.results.length > 0 && (
                        <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200">
                          {contestFormProblemSearch.results.map((result) => (
                            <li key={`contest-form-problem-suggestion-${result.id}`}>
                              <button
                                type="button"
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
                                onClick={() => handleSelectContestFormProblemSuggestion(result)}
                              >
                                <div>
                                  <p className="font-medium text-gray-800">
                                    {result.displayId ?? result.id} · {result.title}
                                  </p>
                                  <p className="text-xs text-gray-500">난이도: {result.difficulty}</p>
                                </div>
                                <span className="text-xs text-[#113F67]">선택</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Input
                      label="표시 ID"
                      value={contestFormProblemDisplayId}
                      placeholder="예: A, B, P100"
                      onChange={(e) => handleContestFormProblemDisplayIdChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleAddContestFormProblem();
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" onClick={() => void handleAddContestFormProblem()}>
                      문제 추가
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" loading={contestLoading}>대회 등록</Button>
              </div>
            </form>
          </Card>
        );
      case 'workbook-manage':
        return (
          <Card padding="lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">문제집 관리</h2>
                <p className="text-sm text-gray-500">등록된 문제집을 확인하고 문제를 추가하거나 삭제할 수 있습니다.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                loading={isWorkbookListLoading}
                onClick={handleRefreshWorkbooks}
              >
                새로고침
              </Button>
            </div>

            {workbookListError && (
              <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{workbookListError}</div>
            )}

            {isWorkbookListLoading && workbooks.length === 0 && !workbookListError && (
              <div className="rounded-md border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                문제집 정보를 불러오는 중입니다...
              </div>
            )}

            {!isWorkbookListLoading && workbooks.length === 0 && !workbookListError && (
              <div className="rounded-md border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                등록된 문제집이 없습니다. 문제집을 먼저 생성해 보세요.
              </div>
            )}

            {workbooks.length > 0 && (
              <ul className="mt-4 space-y-4">
                {workbooks.map((workbook) => {
                  const isExpanded = expandedWorkbookId === workbook.id;
                  const problemState = workbookProblemsState[workbook.id] ?? {
                    items: [],
                    loading: false,
                    error: null,
                  };
                  const problemInput = workbookProblemInputs[workbook.id] ?? {
                    problemId: '',
                  };
                  const searchState = workbookProblemSearchState[workbook.id] ?? {
                    results: [],
                    loading: false,
                    error: null,
                  };
                  const trimmedProblemQuery = (problemInput.problemId ?? '').trim();
                  const searchResults = searchState.results ?? [];
                  const searchLoading = Boolean(searchState.loading);
                  const searchError = searchState.error;
                  const problemError = workbookProblemFormError[workbook.id];
                  const editForm =
                    workbookEditForms[workbook.id] ?? {
                      title: workbook.title ?? '',
                      description: workbook.description ?? '',
                      category: workbook.category ?? '',
                      isPublic: Boolean(workbook.is_public),
                    };
                  const editMessage = workbookEditMessage[workbook.id];

                  return (
                    <li key={workbook.id} className="rounded-lg border border-gray-200 p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900">{workbook.title}</h3>
                            <span className={`text-xs font-medium ${workbook.is_public ? 'text-green-600' : 'text-gray-500'}`}>
                              {workbook.is_public ? '공개' : '비공개'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">ID: {workbook.id}{workbook.category ? ` · 카테고리: ${workbook.category}` : ''}</p>
                          <p className="mt-2 text-xs text-gray-500">
                            생성: {formatDate(workbook.created_at)} · 수정: {formatDate(workbook.updated_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleWorkbookDetails(workbook.id)}
                          >
                            {isExpanded ? '접기' : '문제집 수정'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            loading={deletingWorkbookId === workbook.id}
                            onClick={() => handleDeleteWorkbook(workbook.id)}
                          >
                            삭제
                          </Button>
                        </div>
                      </div>
                      {workbook.description && (
                        <p className="mt-3 text-sm text-gray-700">{workbook.description}</p>
                      )}

                      {isExpanded && (
                        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                          <form
                            onSubmit={(event) => handleWorkbookMetaSubmit(event, workbook.id)}
                            className="space-y-3 rounded-md border border-gray-200 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900">문제집 수정</h4>
                                <p className="text-xs text-gray-500">기본 정보를 변경한 뒤 저장을 누르세요.</p>
                              </div>
                              <Button
                                type="submit"
                                size="sm"
                                loading={savingWorkbookId === workbook.id}
                              >
                                문제집 정보 저장
                              </Button>
                            </div>
                            {editMessage?.error && (
                              <div className="rounded-md bg-red-50 px-4 py-2 text-xs text-red-600">{editMessage.error}</div>
                            )}
                            {editMessage?.success && (
                              <div className="rounded-md bg-green-50 px-4 py-2 text-xs text-green-600">{editMessage.success}</div>
                            )}
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <Input
                                label="제목"
                                value={editForm.title}
                                onChange={(e) => handleWorkbookMetaChange(workbook.id, 'title', e.target.value)}
                                required
                              />
                              <Input
                                label="카테고리"
                                value={editForm.category}
                                onChange={(e) => handleWorkbookMetaChange(workbook.id, 'category', e.target.value)}
                              />
                            </div>
                            <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                              <input
                                type="checkbox"
                                checked={editForm.isPublic}
                                onChange={(e) => handleWorkbookMetaToggle(workbook.id, e.target.checked)}
                              />
                              <span>공개 문제집</span>
                            </label>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700">설명</label>
                              <textarea
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                                rows={3}
                                value={editForm.description}
                                onChange={(e) => handleWorkbookMetaChange(workbook.id, 'description', e.target.value)}
                              />
                            </div>
                          </form>
                          <div>
                            {problemState.loading && (
                              <div className="rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
                                문제 목록을 불러오는 중입니다...
                              </div>
                            )}
                            {!problemState.loading && problemState.error && (
                              <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{problemState.error}</div>
                            )}
                            {!problemState.loading && !problemState.error && problemState.items.length === 0 && (
                              <div className="rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
                                아직 등록된 문제가 없습니다. 아래에서 문제를 추가해 보세요.
                              </div>
                            )}
                            {!problemState.loading && !problemState.error && problemState.items.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {problemState.items.map((item) => {
                                  const pid = item.problemId ?? item.problem?.id ?? 0;
                                  const label = item.problem?.displayId ?? pid;
                                  const title = item.problem?.title;
                                  return (
                                    <span
                                      key={`workbook-${workbook.id}-chip-${item.id}`}
                                      className="inline-flex items-center gap-2 rounded-full bg-[#113F67]/10 px-3 py-1 text-sm text-[#113F67]"
                                    >
                                      <span className="font-medium">문제 {label}</span>
                                      {title && (
                                        <span className="max-w-[160px] truncate text-xs text-gray-500">{title}</span>
                                      )}
                                      <button
                                        type="button"
                                        className="text-[#113F67] transition-colors hover:text-[#34699A]"
                                        onClick={() => void handleRemoveWorkbookProblemChip(workbook.id, Number(pid))}
                                        aria-label={`문제 ${label} 삭제`}
                                      >
                                        ×
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <form
                            className="space-y-3"
                            onSubmit={(event) => handleAddProblemToWorkbook(event, workbook.id)}
                          >
                            <div className="flex items-end gap-2">
                              <div className="flex-1 min-w-0 space-y-2">
                                <Input
                                  label="문제 검색 또는 ID 입력"
                                  value={problemInput.problemId}
                                  placeholder="예: 101 또는 다익스트라"
                                  onChange={(e) =>
                                    handleWorkbookProblemInputChange(workbook.id, e.target.value)
                                  }
                                  onKeyDown={(e) => void handleWorkbookProblemInputKeyDown(workbook.id, e)}
                                />
                                {searchError && (
                                  <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{searchError}</div>
                                )}
                                {!searchError && trimmedProblemQuery && searchLoading && (
                                  <p className="text-xs text-gray-500">문제를 검색 중입니다...</p>
                                )}
                                {!searchError && trimmedProblemQuery && !searchLoading && searchResults.length === 0 && (
                                  <p className="text-xs text-gray-500">검색 결과가 없습니다.</p>
                                )}
                                {!searchError && trimmedProblemQuery && searchResults.length > 0 && (
                                  <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200">
                                    {searchResults.map((result) => (
                                      <li key={`workbook-${workbook.id}-suggestion-${result.id}`}>
                                        <button
                                          type="button"
                                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
                                          onClick={() => void handleSelectWorkbookProblemSuggestion(workbook.id, result)}
                                        >
                                          <div>
                                            <p className="font-medium text-gray-800">
                                              {result.displayId ?? result.id} · {result.title}
                                            </p>
                                            <p className="text-xs text-gray-500">난이도: {result.difficulty}</p>
                                          </div>
                                          <span className="text-xs text-[#113F67]">선택</span>
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <Button
                                type="submit"
                                variant="outline"
                                className="flex-none"
                                loading={addingProblemWorkbookId === workbook.id}
                              >
                                문제 추가
                              </Button>
                            </div>
                            {problemError && (
                              <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{problemError}</div>
                            )}
                          </form>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        );
      case 'workbook':
      default:
        return (
          <Card padding="lg">
            <form onSubmit={handleWorkbookSubmit} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-gray-900">문제집 등록</h2>
                <p className="text-sm text-gray-500">문제집 메타데이터를 입력하면 즉시 저장됩니다.</p>
              </div>

              {workbookMessage.error && (
                <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{workbookMessage.error}</div>
              )}
              {workbookMessage.success && (
                <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-600">{workbookMessage.success}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="문제집 제목"
                  value={workbookForm.title}
                  onChange={(e) => setWorkbookForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
                <Input
                  label="카테고리"
                  value={workbookForm.category}
                  onChange={(e) => setWorkbookForm((prev) => ({ ...prev, category: e.target.value }))}
                />
                <div className="md:col-span-2">
                  <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={workbookForm.isPublic}
                      onChange={(e) => setWorkbookForm((prev) => ({ ...prev, isPublic: e.target.checked }))}
                    />
                    <span>공개 문제집으로 설정</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">문제 목록</h3>
                  <p className="mt-1 text-xs text-gray-500">문제집 생성 시 함께 등록할 문제를 검색해 선택하거나 직접 ID를 입력하세요.</p>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="문제 검색 또는 ID 입력"
                      value={workbookProblemInput}
                      placeholder="예: 101 또는 다익스트라"
                      onChange={(e) => handleCreateWorkbookProblemInputChange(e.target.value)}
                      onKeyDown={handleCreateWorkbookProblemInputKeyDown}
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddWorkbookProblemId}>
                    ID 추가
                  </Button>
                </div>
                {problemSearchError && (
                  <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{problemSearchError}</div>
                )}
                {!problemSearchError && workbookProblemInput.trim() && isProblemSearchLoading && (
                  <p className="text-xs text-gray-500">문제를 검색 중입니다...</p>
                )}
                {!problemSearchError && workbookProblemInput.trim() && !isProblemSearchLoading && problemSearchResults.length === 0 && (
                  <p className="text-xs text-gray-500">검색 결과가 없습니다.</p>
                )}
                {!problemSearchError && problemSearchResults.length > 0 && (
                  <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200">
                    {problemSearchResults.map((problem) => (
                      <li key={`workbook-problem-suggestion-${problem.id}`}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
                          onClick={() => handleSelectCreationProblemSuggestion(problem)}
                        >
                          <div>
                            <p className="font-medium text-gray-800">
                              {problem.displayId ?? problem.id} · {problem.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              난이도: {problem.difficulty}
                            </p>
                          </div>
                          <span className="text-xs text-[#113F67]">추가</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {workbookForm.problemIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {workbookForm.problemIds.map((id) => {
                      const meta = selectedProblemMeta[id];
                      const label = meta?.displayId ?? id;
                      return (
                        <span
                          key={`workbook-problem-chip-${id}`}
                          className="inline-flex items-center gap-2 rounded-full bg-[#113F67]/10 px-3 py-1 text-sm text-[#113F67]"
                        >
                          <span className="font-medium">문제 {label}</span>
                          {meta?.title && (
                            <span className="text-xs text-gray-500 max-w-[160px] truncate">{meta.title}</span>
                          )}
                          <button
                            type="button"
                            className="text-[#113F67] transition-colors hover:text-[#34699A]"
                            onClick={() => handleRemoveWorkbookProblemId(id)}
                            aria-label={`문제 ${label} 삭제`}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
                  rows={4}
                  value={workbookForm.description}
                  onChange={(e) => setWorkbookForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" loading={workbookLoading}>문제집 등록</Button>
              </div>
            </form>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">관리자 도구</h1>
          <p className="mt-2 text-sm text-gray-600">좌측 메뉴에서 원하는 기능을 선택하면 관련 폼이 표시됩니다.</p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full lg:w-64 flex-none">
            <Card padding="lg">
              <nav className="space-y-2">
                {sections.map((section) => {
                  const active = activeSection === section.key;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => setActiveSection(section.key)}
                      className={`w-full rounded-md border px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#113F67] min-h-[88px] ${
                        active
                          ? 'border-[#113F67] bg-[#113F67] text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-[#113F67] hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-sm font-semibold">{section.label}</div>
                      <div className={`mt-1 text-xs ${active ? 'text-blue-100' : 'text-gray-500'}`}>
                        {section.helper}
                      </div>
                    </button>
                  );
                })}
              </nav>
            </Card>
          </aside>

          <div className="flex-1">
            {renderActiveSection()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
