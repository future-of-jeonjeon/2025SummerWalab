const MS_API_BASE = ((import.meta.env.VITE_MS_API_BASE as string | undefined) || '').replace(/\/$/, '');

export interface AutoSavePayload {
  problemId: number;
  language: string;
  code: string;
}

export interface FetchCodeParams {
  problemId: number;
  language: string;
}

export const codeAutoSaveService = {
  async save({ problemId, language, code }: AutoSavePayload): Promise<void> {
    if (!MS_API_BASE) {
      throw new Error('API base URL is not configured.');
    }

    const response = await fetch(`${MS_API_BASE}/code/${problemId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        problem_id: problemId,
        language,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error(`자동 저장 요청 실패 (${response.status})`);
    }
  },

  async fetch({ problemId, language }: FetchCodeParams): Promise<string> {
    if (!MS_API_BASE) {
      throw new Error('API base URL is not configured.');
    }

    const params = new URLSearchParams({
      problem_id: String(problemId),
      language,
    });

    const response = await fetch(`${MS_API_BASE}/code/${problemId}?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`코드 불러오기 실패 (${response.status})`);
    }

    const raw = await response.text();
    try {
      const payload = raw ? JSON.parse(raw) : '';
      if (typeof payload === 'string') {
        return payload;
      }
      if (payload && typeof payload === 'object' && typeof payload.code === 'string') {
        return payload.code;
      }
      return '';
    } catch (error) {
      return raw ?? '';
    }
  },
};
