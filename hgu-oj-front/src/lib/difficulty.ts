export type NormalizedDifficulty = 0 | 1 | 2 | 3 | 4;

const DIFFICULTY_LABELS: Record<NormalizedDifficulty, string> = {
  0: 'Lv.0',
  1: 'Lv.1',
  2: 'Lv.2',
  3: 'Lv.3',
  4: 'Lv.4',
};

const DIFFICULTY_BADGE_CLASSES: Record<NormalizedDifficulty, string> = {
  0: 'bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  1: 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
  2: 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
  3: 'bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30',
  4: 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
};

const isNumericString = (value: string): boolean => /^[0-9]+$/.test(value);

const mapNumberToDifficulty = (value: number): NormalizedDifficulty | null => {
  if (Number.isNaN(value)) return null;
  if (value >= 4) return 4;
  if (value === 3) return 3;
  if (value === 2) return 2;
  if (value === 1) return 1;
  return 0; // Default to 0 for 0 or negative
};

export const normalizeDifficulty = (raw: unknown): NormalizedDifficulty | null => {
  if (raw === null || raw === undefined) return null;

  if (typeof raw === 'number') {
    return mapNumberToDifficulty(raw);
  }

  const value = String(raw).trim();
  if (!value || value === '-') return null;

  if (isNumericString(value)) {
    return mapNumberToDifficulty(Number(value));
  }

  const upper = value.toUpperCase();
  // Master / Extreme -> 4
  if (['MASTER', 'EXTREME', '상', '上'].includes(upper)) return 4;
  // Hard / High -> 3
  if (['HIGH', 'HARD', 'H'].includes(upper)) return 3;
  // Mid / Medium -> 2
  if (['MID', 'MEDIUM', 'NORMAL', 'M', '중', '中'].includes(upper)) return 2;
  // Low / Easy -> 1
  if (['LOW', 'EASY', 'L', '하', '下'].includes(upper)) return 1;

  // Unmapped string defaults to 0
  return 0;
};

export function mapDifficulty(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '-';
  const normalized = normalizeDifficulty(value);
  return normalized !== null ? DIFFICULTY_LABELS[normalized] : '-';
}

export const getDifficultyMeta = (raw: unknown) => {
  const normalized = normalizeDifficulty(raw);
  if (normalized === null) return null;
  return {
    level: normalized,
    label: DIFFICULTY_LABELS[normalized],
    className: DIFFICULTY_BADGE_CLASSES[normalized],
  };
};
