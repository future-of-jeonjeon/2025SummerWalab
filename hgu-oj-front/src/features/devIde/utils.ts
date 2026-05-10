import { DevFile } from './types';

export const resolveLanguageByFileName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'c') return 'c';
  if (ext === 'cpp' || ext === 'cc' || ext === 'cxx') return 'cpp';
  if (ext === 'py') return 'python';
  if (ext === 'java') return 'java';
  if (ext === 'go') return 'go';
  if (ext === 'js' || ext === 'mjs') return 'javascript';
  return 'javascript';
};

const buildCopiedName = (originalName: string, existingNames: Set<string>) => {
  if (!existingNames.has(originalName)) {
    return originalName;
  }

  const dot = originalName.lastIndexOf('.');
  const hasExt = dot > 0;
  const base = hasExt ? originalName.slice(0, dot) : originalName;
  const ext = hasExt ? originalName.slice(dot) : '';

  let candidate = `${base}-copy${ext}`;
  let suffix = 2;

  while (existingNames.has(candidate)) {
    candidate = `${base}-copy-${suffix}${ext}`;
    suffix += 1;
  }

  return candidate;
};

export const createDuplicatedFile = (source: DevFile, files: DevFile[]): DevFile => {
  const existingNames = new Set(
    files
      .filter((file) => file.folderId === source.folderId)
      .map((file) => file.name),
  );

  const name = buildCopiedName(source.name, existingNames);

  return {
    ...source,
    id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
  };
};
