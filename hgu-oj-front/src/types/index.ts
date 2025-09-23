// 사용자 관련 타입
export interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

// 문제 관련 타입
export interface Problem {
  id: number;
  displayId?: string;
  title: string;
  description: string;
  difficulty: 'Low' | 'Mid' | 'High';
  timeLimit: number;
  memoryLimit: number;
  inputDescription?: string;
  outputDescription?: string;
  samples?: Array<{
    input: string;
    output: string;
  }>;
  hint?: string;
  createTime: string;
  lastUpdateTime?: string;
  tags?: string[];
  languages?: string[];
  createdBy?: {
    id: number;
    username: string;
    realName?: string;
  };
  // Optional fields from OJ profile enrichment
  myStatus?: string;
  solved?: boolean;
  submissionNumber?: number;
  acceptedNumber?: number;
  ruleType?: string;
  totalScore?: number;
}

// 제출 관련 타입
export interface Submission {
  id: number;
  userId: number;
  problemId: number;
  language: string;
  code: string;
  status: 'PENDING' | 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'RUNTIME_ERROR' | 'COMPILE_ERROR';
  executionTime?: number;
  memoryUsage?: number;
  createdAt: string;
  updatedAt: string;
}

// 대회 관련 타입
export interface Contest {
  id: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  createTime: string;
  ruleType: string;
  visible: boolean;
  createdBy: {
    id: number;
    username: string;
    realName?: string;
  };
  status?: string;
  contestType?: string;
  realTimeRank?: boolean;
  now?: string;
}

export interface ContestAnnouncement {
  id: number;
  contestId: number;
  title: string;
  content: string;
  visible: boolean;
  createdAt: string;
  createdBy: {
    id: number;
    username: string;
    realName?: string;
  };
}

export interface ContestAccess {
  access: boolean;
}

export interface ContestRankEntry {
  id?: number;
  user: {
    id: number;
    username: string;
    realName?: string;
  };
  acceptedNumber?: number;
  submissionNumber?: number;
  totalTime?: number;
  totalScore?: number;
  submissionInfo?: Record<string, unknown>;
}

// 문제집 관련 타입
export interface Workbook {
  id: number;
  title: string;
  description: string;
  category?: string;
  created_by_id: number;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  problemCount?: number;
}

export interface WorkbookProblem {
  id: number;
  problemId?: number;
  problem: Problem;
  order: number;
  addedTime: string;
}

export interface WorkbookDetail extends Workbook {
  problems: WorkbookProblem[];
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// 페이지네이션 타입
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// IDE 관련 타입
export interface CodeExecution {
  language: string;
  code: string;
  input?: string;
}

export interface ExecutionResult {
  output: string;
  error?: string;
  executionTime: number;
  memoryUsage: number;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
}

// 언어 옵션 타입
export interface LanguageOption {
  value: string;
  label: string;
  extension: string;
  monacoLanguage: string;
}

// 필터 관련 타입
export interface ProblemFilter {
  difficulty?: 'Low' | 'Mid' | 'High';
  search?: string;
  page?: number;
  limit?: number;
}

// 컴포넌트 Props 타입
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// 폼 관련 타입
export interface LoginForm {
  username: string;
  password: string;
  tfa_code?: string;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  captcha: string;
}

// 인증 관련 타입
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  admin_type: string;
  problem_permission: string;
  create_time: string;
  last_login?: string;
  two_factor_auth: boolean;
  open_api: boolean;
  is_disabled: boolean;
}

export interface LoginResponse {
  success: boolean;
  data?: string;
  message?: string;
}

export interface SSOTokenResponse {
  error: null;
  data: {
    token: string;
  };
}

export interface UserProfile {
  id: number;
  username: string;
  real_name?: string;
  email?: string;
  admin_type: string;
  problem_permission: string;
  create_time: string;
  last_login?: string;
  two_factor_auth: boolean;
  open_api: boolean;
  is_disabled: boolean;
  avatar?: string;
}

export interface AdminUser extends UserProfile {
  password?: string;
  real_tfa?: boolean;
}

export interface AdminUserListResponse {
  results: AdminUser[];
  total: number;
  offset: number;
  limit: number;
}

export interface JudgeServer {
  id: number;
  hostname: string;
  status: string;
  task_number: number;
  cpu_core: number;
  cpu_usage: number;
  memory_usage: number;
  judger_version?: string;
  service_url?: string;
  ip?: string;
  last_heartbeat?: string;
  create_time?: string;
  is_disabled: boolean;
}

export interface JudgeServerListResponse {
  token?: string;
  servers: JudgeServer[];
}

export interface ServiceHealthStatus {
  name: string;
  status: 'online' | 'offline' | 'unknown';
  latency?: number;
  message?: string;
  lastChecked?: string;
}

export interface AdminContest extends Contest {
  password?: string | null;
  real_time_rank: boolean;
  allowed_ip_ranges: string[];
  status?: string;
}

export interface AdminContestListResponse {
  results: AdminContest[];
  total: number;
  offset: number;
  limit: number;
}
