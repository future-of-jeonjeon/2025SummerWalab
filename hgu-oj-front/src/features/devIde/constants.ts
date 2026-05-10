import codeTemplates from '../../config/codeTemplates.json';
import { DevFile, DevFolder } from './types';

const defaultCodeTemplates = codeTemplates as Record<string, string>;

const fallbackTemplates: Record<string, string> = {
  javascript: 'function main() {\n  \n}\n\nmain();\n',
  python: 'def main():\n    pass\n\nif __name__ == "__main__":\n    main()\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n\n    }\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n\n    return 0;\n}\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\n}\n',
};

export const getTemplateCode = (language: string): string => {
  const fromConfig = defaultCodeTemplates[language];
  if (typeof fromConfig === 'string' && fromConfig.trim().length > 0) {
    return fromConfig;
  }
  return fallbackTemplates[language] ?? '';
};

export const INITIAL_FOLDERS: DevFolder[] = [
  { id: 'folder-saved', name: '저장된 파일', expanded: true },
  { id: 'folder-solved', name: '해결한 문제', expanded: true },
];

export const INITIAL_FILES: DevFile[] = [
  {
    id: 'saved-main-c',
    name: 'main.c',
    folderId: 'folder-saved',
    language: 'c',
    code: getTemplateCode('c'),
  },
  {
    id: 'saved-solver-py',
    name: 'solver.py',
    folderId: 'folder-saved',
    language: 'python',
    code: getTemplateCode('python'),
  },
  {
    id: 'solved-1000-cpp',
    name: '1000.cpp',
    folderId: 'folder-solved',
    language: 'cpp',
    code: getTemplateCode('cpp'),
  },
  {
    id: 'solved-2557-java',
    name: '2557.java',
    folderId: 'folder-solved',
    language: 'java',
    code: getTemplateCode('java'),
  },
  {
    id: 'saved-notes-js',
    name: 'notes.js',
    folderId: 'folder-saved',
    language: 'javascript',
    code: getTemplateCode('javascript'),
  },
];
