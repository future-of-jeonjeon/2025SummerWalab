import React from 'react';
import { DevFile, DevFolder } from '../types';

type DevIdeExplorerProps = {
  folders: DevFolder[];
  filesByFolder: Map<string | null, DevFile[]>;
  selectedFolderId: string | null;
  activeFileId: string;
  editingFileId: string | null;
  editingName: string;
  openFileMenuId: string | null;
  isCollapsed: boolean;
  widthPct: number;
  theme: 'light' | 'dark';
  canLoadMoreSolved: boolean;
  isSolvedLoading: boolean;
  hasSavedFiles: boolean;
  onGoBack: () => void;
  onCreateFile: () => void;
  onLoadMoreSolved: () => void;
  onToggleFolder: (folderId: string) => void;
  onSelectFile: (file: DevFile) => void;
  onOpenFileMenu: (fileId: string) => void;
  onOpenProblemByFile: (file: DevFile) => void;
  onRenameFile: (file: DevFile) => void;
  onDeleteFile: (fileId: string) => void;
  onEditingNameChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
};

const getFileExtension = (fileName: string): string => fileName.split('.').pop()?.toLowerCase() ?? '';

const FileIcon: React.FC<{ fileName: string; selected: boolean }> = ({ fileName, selected }) => {
  const ext = getFileExtension(fileName);
  const colorClass =
    ext === 'py'
      ? (selected ? 'text-yellow-500' : 'text-yellow-600 dark:text-yellow-400')
      : ext === 'c' || ext === 'cpp' || ext === 'cc' || ext === 'cxx'
        ? (selected ? 'text-sky-500' : 'text-sky-600 dark:text-sky-400')
        : ext === 'js' || ext === 'mjs'
          ? (selected ? 'text-amber-500' : 'text-amber-600 dark:text-amber-400')
          : ext === 'java'
            ? (selected ? 'text-orange-500' : 'text-orange-600 dark:text-orange-400')
            : ext === 'go'
              ? (selected ? 'text-cyan-500' : 'text-cyan-600 dark:text-cyan-400')
              : (selected ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400');

  return (
    <svg className={`h-4 w-4 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="14" y2="17" />
    </svg>
  );
};

export const DevIdeExplorer: React.FC<DevIdeExplorerProps> = ({
  folders,
  filesByFolder,
  selectedFolderId,
  activeFileId,
  editingFileId,
  editingName,
  openFileMenuId,
  isCollapsed,
  widthPct,
  theme,
  canLoadMoreSolved,
  isSolvedLoading,
  hasSavedFiles,
  onGoBack,
  onCreateFile,
  onLoadMoreSolved,
  onToggleFolder,
  onSelectFile,
  onOpenFileMenu,
  onOpenProblemByFile,
  onRenameFile,
  onDeleteFile,
  onEditingNameChange,
  onCommitRename,
  onCancelRename,
}) => {
  const isDark = theme === 'dark';
  const asideClasses = isDark
    ? 'h-full min-w-0 flex-none overflow-hidden bg-slate-900 text-slate-200'
    : 'h-full min-w-0 flex-none overflow-hidden bg-white text-gray-700';
  const headerBorderClass = isDark ? 'border-slate-700' : 'border-gray-200';
  const mutedIconButtonClass = isDark
    ? 'rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200'
    : 'rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-200/80 hover:text-slate-700';
  const toolbarButtonClass = isDark
    ? 'inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800'
    : 'inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100';
  const folderSelectedClass = isDark
    ? 'bg-amber-900/30 text-amber-200'
    : 'bg-amber-100 text-amber-900';
  const folderNormalClass = isDark
    ? 'text-slate-300 hover:bg-slate-800/70'
    : 'text-slate-700 hover:bg-slate-200/70';
  const fileSelectedClass = isDark
    ? 'bg-blue-900/40 text-blue-100'
    : 'bg-blue-100 text-blue-900';
  const fileNormalClass = isDark
    ? 'text-slate-300 hover:bg-slate-800/70'
    : 'text-slate-700 hover:bg-slate-200/70';
  const fileMenuButtonClass = isDark
    ? 'absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
    : 'absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700';
  const popupClass = isDark
    ? 'absolute right-0 top-full z-30 mt-1 w-52 rounded-md border border-slate-700 bg-slate-900 p-1 shadow-lg'
    : 'absolute right-0 top-full z-30 mt-1 w-52 rounded-md border border-slate-200 bg-white p-1 shadow-lg';
  const popupItemClass = isDark
    ? 'flex w-full items-center rounded px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800'
    : 'flex w-full items-center rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100';
  const popupDangerClass = isDark
    ? 'flex w-full items-center rounded px-2 py-1.5 text-left text-xs text-rose-300 hover:bg-rose-900/30'
    : 'flex w-full items-center rounded px-2 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50';

  return (
    <aside
      className={`${asideClasses} ${isCollapsed ? 'w-0 border-r-0 opacity-0' : 'opacity-100'}`}
      style={isCollapsed ? { width: 0, borderRight: 'none' } : { width: `${widthPct}%`, borderRight: 'none' }}
    >
      <div className={`flex items-center justify-between border-b px-3 py-3 ${headerBorderClass}`}>
        <button
          type="button"
          onClick={onGoBack}
          className={mutedIconButtonClass}
          title="뒤로가기"
          aria-label="뒤로가기"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="h-6 w-6" aria-hidden="true" />
      </div>

      {!isCollapsed && (
        <>
          <div className={`flex items-center gap-2 border-b px-3 py-2 ${headerBorderClass}`}>
            <button
              type="button"
              onClick={onCreateFile}
              className={toolbarButtonClass}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              파일
            </button>
          </div>

          <div className="px-2 py-2">
            <ul className="space-y-1">
              {folders.map((folder) => {
                const fileChildren = filesByFolder.get(folder.id) ?? [];
                const isSelectedFolder = selectedFolderId === folder.id;
                const isSolvedFolder = folder.id === 'folder-solved';
                const isSavedFolder = folder.id === 'folder-saved';

                return (
                  <li key={folder.id}>
                    <button
                      type="button"
                      onClick={() => onToggleFolder(folder.id)}
                      className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${isSelectedFolder ? folderSelectedClass : folderNormalClass}`}
                    >
                      <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {folder.expanded ? <polyline points="6 9 12 15 18 9" /> : <polyline points="9 18 15 12 9 6" />}
                      </svg>
                      <svg className="h-4 w-4 text-amber-500 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                      </svg>
                      <span className="truncate">{folder.name}</span>
                    </button>

                    {folder.expanded && (
                      <ul className="space-y-1">
                        {isSavedFolder && !hasSavedFiles && (
                          <li className={`px-6 py-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            파일이 없습니다.
                          </li>
                        )}
                        {fileChildren.map((file) => {
                          const selected = file.id === activeFileId;
                          return (
                            <li key={file.id}>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => onSelectFile(file)}
                                  className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 pr-8 text-left text-sm transition-colors ${selected ? fileSelectedClass : fileNormalClass}`}
                                  style={{ paddingLeft: '22px' }}
                                >
                                  <FileIcon fileName={file.name} selected={selected} />
                                  {editingFileId === file.id ? (
                                    <input
                                      autoFocus
                                      value={editingName}
                                      onChange={(e) => onEditingNameChange(e.target.value)}
                                      onBlur={onCommitRename}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          onCommitRename();
                                        }
                                        if (e.key === 'Escape') {
                                          e.preventDefault();
                                          onCancelRename();
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`w-full rounded px-1.5 py-0.5 text-xs focus:outline-none ${isDark ? 'border border-slate-600 bg-slate-800 text-slate-100' : 'border border-blue-300 bg-white text-slate-800'}`}
                                    />
                                  ) : (
                                    <span className="truncate">{file.name}</span>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenFileMenu(file.id);
                                  }}
                                  className={fileMenuButtonClass}
                                  aria-label="파일 메뉴"
                                >
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <circle cx="5" cy="12" r="1.8" />
                                    <circle cx="12" cy="12" r="1.8" />
                                    <circle cx="19" cy="12" r="1.8" />
                                  </svg>
                                </button>

                                {openFileMenuId === file.id && (
                                  <div
                                    className={popupClass}
                                    onMouseDown={(e) => e.stopPropagation()}
                                  >
                                    {isSolvedFolder ? (
                                      <button
                                        type="button"
                                        onClick={() => onOpenProblemByFile(file)}
                                        className={popupItemClass}
                                      >
                                        문제 보러 가기
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => onRenameFile(file)}
                                          className={popupItemClass}
                                        >
                                          이름 변경
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onDeleteFile(file.id)}
                                          className={popupDangerClass}
                                        >
                                          삭제
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                        {isSolvedFolder && canLoadMoreSolved && (
                          <li className="px-2 pt-1">
                            <button
                              type="button"
                              onClick={onLoadMoreSolved}
                              disabled={isSolvedLoading}
                              className={`w-full rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                                isDark
                                  ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60'
                              }`}
                            >
                              {isSolvedLoading ? '불러오는 중...' : '더 보기'}
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </aside>
  );
};
