export type DevFile = {
  id: string;
  name: string;
  folderId: string | null;
  language: string;
  code: string;
  problemId?: number;
  persisted?: boolean;
};

export type DevFolderName = '저장된 파일' | '해결한 문제';

export type DevFolder = {
  id: string;
  name: DevFolderName;
  expanded: boolean;
};
