import codeTemplates from '../config/codeTemplates.json';

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

export {
  availableLanguages,
  templateMap,
  getLanguageBackendValue,
  getLanguageLabel,
  normalizeLanguageKey,
  normalizeLanguageList,
  toBackendLanguageList,
};

