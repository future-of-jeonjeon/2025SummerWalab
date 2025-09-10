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
  now?: string;
}

// 문제집 관련 타입
export interface Workbook {
  id: number;
  title: string;
  description: string;
  createdBy: User;
  createdTime: string;
  updatedTime: string;
  isPublic: boolean;
  problemCount: number;
}

export interface WorkbookProblem {
  id: number;
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
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
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
