
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
};

export const executionService = {
  run: async ({ language, code, input }: RunRequest): Promise<RawRunResult> => {
    const lang = languageMap[language] || language;
    const MS_API_BASE = ((import.meta.env.VITE_MS_API_BASE as string | undefined) || '').replace(/\/$/, '');

    if (!MS_API_BASE) {
      throw new Error('API base URL is not configured.');
    }

    const resp = await fetch(`${MS_API_BASE}/execution/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ language: lang, code, input: input ?? '' }),
    });
    if (!resp.ok) {
      throw new Error(`실행 요청 실패 (${resp.status})`);
    }
    return await resp.json();
  },
};
