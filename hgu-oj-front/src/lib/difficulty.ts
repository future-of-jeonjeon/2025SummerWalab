export type NormalizedDifficulty = 'LOW' | 'MID' | 'HIGH';

const DIFFICULTY_LABELS: Record<NormalizedDifficulty, string> = {
  HIGH: '상',
  MID: '중',
  LOW: '하',
};

const DIFFICULTY_BADGE_CLASSES: Record<NormalizedDifficulty, string> = {
  HIGH: 'bg-rose-100 text-rose-700 border border-rose-200',
  MID: 'bg-amber-100 text-amber-700 border border-amber-200',
  LOW: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
};

const isNumericString = (value: string): boolean => /^[0-9]+$/.test(value);

const mapNumberToDifficulty = (value: number): NormalizedDifficulty | null => {
  if (Number.isNaN(value)) return null;
  if (value >= 3) return 'HIGH';
  if (value === 2) return 'MID';
  if (value <= 1) return 'LOW';
  return null;
};

export function mapDifficulty(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '-';
  const raw = typeof value === 'number' ? value : String(value).trim();

  if (typeof raw === 'number') {
    const mapped = mapNumberToDifficulty(raw);
    return mapped ? DIFFICULTY_LABELS[mapped] : '-';
  }

  if (isNumericString(raw)) {
    const mapped = mapNumberToDifficulty(Number(raw));
    return mapped ? DIFFICULTY_LABELS[mapped] : '-';
  }

  const key = raw.toUpperCase();
  if (['3', 'HIGH', 'HARD', 'H'].includes(key)) return '상';
  if (['2', 'MID', 'MEDIUM', 'NORMAL', 'M'].includes(key)) return '중';
  if (['1', 'LOW', 'EASY', 'L'].includes(key)) return '하';

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (['상', '上'].includes(trimmed)) return '상';
    if (['중', '中'].includes(trimmed)) return '중';
    if (['하', '下'].includes(trimmed)) return '하';
  }

  return '-';
}

export const normalizeDifficulty = (raw: unknown): NormalizedDifficulty | null => {
  if (raw === null || raw === undefined) return null;

  if (typeof raw === 'number') {
    return mapNumberToDifficulty(raw);
  }

  const value = String(raw).trim();
  if (!value) return null;

  if (isNumericString(value)) {
    return mapNumberToDifficulty(Number(value));
  }

  const upper = value.toUpperCase();
  if (upper === 'HIGH' || upper === 'HARD' || upper === 'H') return 'HIGH';
  if (upper === 'MID' || upper === 'MEDIUM' || upper === 'NORMAL' || upper === 'M') return 'MID';
  if (upper === 'LOW' || upper === 'EASY' || upper === 'L') return 'LOW';

  if (['상', '上'].includes(value)) return 'HIGH';
  if (['중', '中'].includes(value)) return 'MID';
  if (['하', '下'].includes(value)) return 'LOW';

  return null;
};

export const getDifficultyMeta = (raw: unknown) => {
  const normalized = normalizeDifficulty(raw);
  if (!normalized) return null;
  return {
    level: normalized,
    label: DIFFICULTY_LABELS[normalized],
    className: DIFFICULTY_BADGE_CLASSES[normalized],
  };
};
