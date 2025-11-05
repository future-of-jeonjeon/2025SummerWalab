import { Problem } from '../types';

const normalize = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const candidates = ['name', 'tag', 'tagName', 'tag_name', 'value', 'label'];
    for (const key of candidates) {
      const candidate = record[key];
      if (candidate) {
        const normalized = normalize(candidate);
        if (normalized) return normalized;
      }
    }
  }
  return null;
};

const collect = (source: unknown): string[] => {
  if (!source) return [];
  if (Array.isArray(source)) {
    return source
      .map((item) => normalize(item))
      .filter((tag): tag is string => Boolean(tag));
  }
  const normalized = normalize(source);
  return normalized ? [normalized] : [];
};

export const extractProblemTags = (problem: Problem | (Problem & Record<string, unknown>)): string[] => {
  const buckets: unknown[] = [
    (problem as any).tags,
    (problem as any).tagNames,
    (problem as any).tag_names,
    (problem as any).tagList,
    (problem as any).tag_list,
    (problem as any).problemTags,
    (problem as any).problem_tags,
    (problem as any).tag,
  ];

  const set = new Set<string>();
  buckets.forEach((bucket) => {
    collect(bucket).forEach((tag) => set.add(tag));
  });

  return Array.from(set);
};
