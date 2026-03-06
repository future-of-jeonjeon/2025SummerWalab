import { apiClient, MS_API_BASE } from './api';
export interface RunRequest {
  language: string;
  code: string;
  input?: string;
}

export interface RawRunResult {
  stdout?: string;
  stderr?: string;
  output?: string;
  error?: string;
  time?: number; // ms
  cpu_time?: number; // ms
  real_time?: number; // ms
  memory?: number; // KB or bytes
  exit_code?: number;
  err?: boolean | string;
  data?: any;
  result?: any;
}

// Map editor language -> backend language name (SysOptions name)
const languageMap: Record<string, string> = {
  javascript: 'JavaScript',
  python: 'Python3',
  cpp: 'C++',
  c: 'C',
  java: 'Java',
  go: 'Golang',
};

const DEFAULT_EXECUTION_TIMEOUT_MS = 5000;
const resolveExecutionTimeoutMs = () => {
  const raw = (import.meta.env.VITE_EXECUTION_TIMEOUT_MS as string | undefined);
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_EXECUTION_TIMEOUT_MS;
};

export const executionService = {
  run: async ({ language, code, input }: RunRequest): Promise<RawRunResult> => {
    const lang = languageMap[language.toLowerCase()] || language;

    if (!MS_API_BASE) {
      throw new Error('API base URL is not configured.');
    }

    const resp = await apiClient.post<RawRunResult>(`${MS_API_BASE}/execution/run`, {
      language: lang,
      code,
      input: input ?? '',
    }, {
      timeout: resolveExecutionTimeoutMs(),
    });
    return resp.data;
  },
};
