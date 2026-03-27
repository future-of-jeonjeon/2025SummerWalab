import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CodeEditor } from '../components/organisms/CodeEditor';
import { ExecutionResult } from '../types';
import { executionService } from '../services/executionService';
import { DevIdeExplorer } from '../features/devIde/components/DevIdeExplorer';
import { INITIAL_FOLDERS } from '../features/devIde/constants';
import { DevFile, DevFolder } from '../features/devIde/types';
import { resolveLanguageByFileName } from '../features/devIde/utils';
import { ResizerBar } from '../components/atoms/ResizerBar';
import { codeAutoSaveService } from '../services/codeAutoSaveService';
import { useNavigate } from 'react-router-dom';

type MouseLikeEvent = MouseEvent | React.MouseEvent;

export const DevIdePage: React.FC = () => {
  const navigate = useNavigate();
  const SOLVED_PAGE_SIZE = 10;
  const [folders, setFolders] = useState<DevFolder[]>(INITIAL_FOLDERS);
  const [files, setFiles] = useState<DevFile[]>([]);
  const [solvedPage, setSolvedPage] = useState(0);
  const [solvedTotal, setSolvedTotal] = useState(0);
  const [isSolvedLoading, setSolvedLoading] = useState(false);

  const [isExplorerCollapsed, setExplorerCollapsed] = useState(false);
  const [leftWidthPct, setLeftWidthPct] = useState<number>(() => {
    const saved = localStorage.getItem('oj:layout:devExplorerWidthPct');
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) && parsed >= 16 && parsed <= 45 ? parsed : 24;
  });
  const [isDraggingLR, setIsDraggingLR] = useState(false);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [openFileMenuId, setOpenFileMenuId] = useState<string | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeFileId, setActiveFileId] = useState<string>('');

  const [executionResult, setExecutionResult] = useState<ExecutionResult | undefined>();
  const [isExecuting, setIsExecuting] = useState(false);
  const [editorTheme, setEditorTheme] = useState<'light' | 'dark'>(() => {
    const savedEditorTheme = localStorage.getItem('oj:editorTheme');
    if (savedEditorTheme === 'light' || savedEditorTheme === 'dark') {
      return savedEditorTheme;
    }
    const savedAppTheme = localStorage.getItem('theme');
    if (savedAppTheme === 'light' || savedAppTheme === 'dark') {
      return savedAppTheme;
    }
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastExpandedWidthRef = useRef<number>(24);
  const customSaveTimerRef = useRef<number | null>(null);

  const filesByFolder = useMemo(() => {
    const map = new Map<string | null, DevFile[]>();
    files.forEach((file) => {
      const list = map.get(file.folderId) ?? [];
      list.push(file);
      map.set(file.folderId, list);
    });
    return map;
  }, [files]);

  const activeFile = useMemo(
    () => files.find((file) => file.id === activeFileId) ?? files[0],
    [files, activeFileId],
  );

  const savedFilesCount = useMemo(
    () => files.filter((file) => file.folderId === 'folder-saved').length,
    [files],
  );
  const solvedFilesCount = useMemo(
    () => files.filter((file) => file.folderId === 'folder-solved').length,
    [files],
  );
  const hasSavedFiles = savedFilesCount > 0;
  const hasAnyFiles = files.length > 0;
  const canLoadMoreSolved = solvedFilesCount < solvedTotal;
  const isEditorDisabled = !hasAnyFiles || !activeFile;

  const loadSolvedFiles = useCallback(async (page: number, append: boolean) => {
    setSolvedLoading(true);
    try {
      const response = await codeAutoSaveService.fetchSolvedFiles(page, SOLVED_PAGE_SIZE);
      const solvedFiles: DevFile[] = response.items.map((item, index) => {
        const fileName = item.fileName.trim();
        const language = item.language?.trim() || resolveLanguageByFileName(fileName);
        return {
          id: `solved-api-${page}-${index}-${fileName}`,
          name: fileName,
          folderId: 'folder-solved',
          language,
          code: item.code,
          problemId: item.id,
        };
      });

      setFiles((prev) => {
        const savedOnly = prev.filter((file) => file.folderId !== 'folder-solved');
        const prevSolved = prev.filter((file) => file.folderId === 'folder-solved');
        const mergedSolved = append ? [...prevSolved, ...solvedFiles] : solvedFiles;
        const next = [...savedOnly, ...mergedSolved];
        if (next.length > 0 && !next.some((file) => file.id === activeFileId)) {
          setActiveFileId(next[0].id);
        }
        return next;
      });

      setSolvedPage(response.page);
      setSolvedTotal(response.total);
    } catch (error) {
      // Keep IDE usable even when solved files cannot be loaded.
    } finally {
      setSolvedLoading(false);
    }
  }, [SOLVED_PAGE_SIZE, activeFileId]);

  const loadCustomFiles = useCallback(async () => {
    try {
      const items = await codeAutoSaveService.fetchCustomFiles();
      const savedFiles: DevFile[] = items.map((item, index) => {
        const fileName = item.fileName.trim();
        return {
          id: `saved-api-${index}-${fileName}`,
          name: fileName,
          folderId: 'folder-saved',
          language: resolveLanguageByFileName(fileName),
          code: item.code,
          persisted: true,
        };
      });

      setFiles((prev) => {
        const solvedOnly = prev.filter((file) => file.folderId === 'folder-solved');
        const next = [...savedFiles, ...solvedOnly];
        if (next.length > 0 && !next.some((file) => file.id === activeFileId)) {
          setActiveFileId(next[0].id);
        }
        return next;
      });
    } catch (error) {
      // Keep IDE usable even when saved files cannot be loaded.
    }
  }, [activeFileId]);

  useEffect(() => {
    void loadCustomFiles();
    void loadSolvedFiles(1, false);
  }, [loadCustomFiles, loadSolvedFiles]);

  const onMouseMoveLR = useCallback((e: MouseEvent) => {
    if (!isDraggingLR || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(14, Math.min(46, (x / rect.width) * 100));
    if (isExplorerCollapsed) {
      setExplorerCollapsed(false);
    }
    setLeftWidthPct(pct);
  }, [isDraggingLR, isExplorerCollapsed]);

  const onMouseUpLR = useCallback(() => setIsDraggingLR(false), []);

  const startExplorerResize = useCallback((e?: MouseLikeEvent) => {
    if (e && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(14, Math.min(46, (x / rect.width) * 100));
      setLeftWidthPct(pct);
    }
    if (isExplorerCollapsed) {
      setExplorerCollapsed(false);
      const restored = Number.isFinite(lastExpandedWidthRef.current) && lastExpandedWidthRef.current >= 14
        ? lastExpandedWidthRef.current
        : 24;
      setLeftWidthPct(restored);
    }
    setIsDraggingLR(true);
  }, [isExplorerCollapsed]);

  const toggleExplorer = useCallback(() => {
    if (isExplorerCollapsed) {
      const restored = Number.isFinite(lastExpandedWidthRef.current) && lastExpandedWidthRef.current >= 14
        ? lastExpandedWidthRef.current
        : 24;
      setLeftWidthPct(restored);
      setExplorerCollapsed(false);
      return;
    }
    lastExpandedWidthRef.current = leftWidthPct;
    setExplorerCollapsed(true);
  }, [isExplorerCollapsed, leftWidthPct]);

  useEffect(() => {
    if (!isDraggingLR) return;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onMouseMoveLR);
    window.addEventListener('mouseup', onMouseUpLR);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMoveLR);
      window.removeEventListener('mouseup', onMouseUpLR);
    };
  }, [isDraggingLR, onMouseMoveLR, onMouseUpLR]);

  useEffect(() => {
    localStorage.setItem('oj:layout:devExplorerWidthPct', String(leftWidthPct));
    if (!isExplorerCollapsed && leftWidthPct >= 14) {
      lastExpandedWidthRef.current = leftWidthPct;
    }
  }, [leftWidthPct, isExplorerCollapsed]);

  useEffect(() => {
    const onClickOutside = () => setOpenFileMenuId(null);
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (customSaveTimerRef.current != null) {
      window.clearTimeout(customSaveTimerRef.current);
      customSaveTimerRef.current = null;
    }

    if (!activeFile || activeFile.folderId !== 'folder-saved' || !activeFile.persisted) return;
    customSaveTimerRef.current = window.setTimeout(() => {
      void codeAutoSaveService.saveCustomFile(activeFile.name, activeFile.code);
    }, 500);

    return () => {
      if (customSaveTimerRef.current != null) {
        window.clearTimeout(customSaveTimerRef.current);
        customSaveTimerRef.current = null;
      }
    };
  }, [activeFile?.id, activeFile?.name, activeFile?.code, activeFile?.folderId]);

  const handleFileCodeChange = (nextCode: string) => {
    if (isEditorDisabled) return;
    setFiles((prev) => prev.map((file) => (
      file.id === activeFileId ? { ...file, code: nextCode } : file
    )));
  };

  const handleCreateFile = () => {
    const nextIndex = files.length + 1;
    const name = `new-file-${nextIndex}.js`;
    const language = resolveLanguageByFileName(name);
    const targetFolderId = 'folder-saved';
    const nextFile: DevFile = {
      id: `file-${Date.now()}`,
      name,
      folderId: targetFolderId,
      language,
      code: '',
      persisted: false,
    };

    setFolders((prev) => prev.map((folder) => (
      folder.id === targetFolderId ? { ...folder, expanded: true } : folder
    )));
    setFiles((prev) => [...prev, nextFile]);
    setActiveFileId(nextFile.id);
    setSelectedFolderId(targetFolderId);
    setEditingFileId(nextFile.id);
    setEditingName(nextFile.name);
    setOpenFileMenuId(null);
    setExecutionResult(undefined);
  };

  const handleToggleFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
    setOpenFileMenuId(null);
    setFolders((prev) => prev.map((folder) => (
      folder.id === folderId ? { ...folder, expanded: !folder.expanded } : folder
    )));
  };

  const handleDeleteFile = async (fileId: string) => {
    const target = files.find((file) => file.id === fileId);
    if (!target) return;

    if (target.folderId === 'folder-saved' && target.persisted) {
      try {
        await codeAutoSaveService.deleteCustomFile(target.name);
      } catch (error) {
        return;
      }
    }

    setFiles((prev) => {
      const next = prev.filter((file) => file.id !== fileId);
      if (next.length === 0) return prev;
      if (activeFileId === fileId) {
        setActiveFileId(next[0].id);
        setExecutionResult(undefined);
      }
      return next;
    });
    setOpenFileMenuId(null);
  };

  const handleRenameFile = (file: DevFile) => {
    setEditingFileId(file.id);
    setEditingName(file.name);
    setOpenFileMenuId(null);
  };

  const commitRename = () => {
    const targetId = editingFileId;
    const nextName = editingName.trim();

    if (!targetId) return;

    if (!nextName) {
      setEditingFileId(null);
      setEditingName('');
      return;
    }

    const targetFile = files.find((item) => item.id === targetId);
    setFiles((prev) => prev.map((item) => (
      item.id === targetId
        ? { ...item, name: nextName, language: resolveLanguageByFileName(nextName) }
        : item
    )));

    if (targetFile && targetFile.folderId === 'folder-saved' && !targetFile.persisted) {
      void codeAutoSaveService.createCustomFile(nextName, targetFile.code || '').then(() => {
        setFiles((prev) => prev.map((item) => (
          item.id === targetId ? { ...item, persisted: true } : item
        )));
      }).catch(() => {
        // Keep local draft even if API call fails.
      });
    }

    setEditingFileId(null);
    setEditingName('');
  };

  const cancelRename = () => {
    setEditingFileId(null);
    setEditingName('');
  };

  const handleExecute = async (_code: string, language: string, input?: string) => {
    setIsExecuting(true);
    try {
      const raw = await executionService.run({ language, code: activeFile?.code ?? _code, input });
      const dataArr = Array.isArray((raw as any).data) ? (raw as any).data as any[] : [];
      const last = dataArr.length > 0 ? dataArr[dataArr.length - 1] : undefined;
      const output = (last?.output ?? last?.stdout ?? (raw as any).output ?? (raw as any).stdout ?? '') as string;
      const stderr = (last?.stderr ?? (raw as any).stderr) as string | undefined;
      const apiErrorField = (raw as any).error;
      const errField = (raw as any).err;

      let errorMsg = typeof apiErrorField === 'string' ? apiErrorField : stderr;
      if (!errorMsg && typeof errField === 'string') {
        const detail = typeof (raw as any).data === 'string' ? (raw as any).data : undefined;
        errorMsg = detail ? `${errField}: ${detail}` : errField;
      }

      const time = Number(last?.cpu_time ?? last?.real_time ?? (raw as any).time ?? (raw as any).cpu_time ?? (raw as any).real_time ?? 0);
      const memoryRaw = Number(last?.memory ?? (raw as any).memory ?? 0);
      const memoryKb = Number.isFinite(memoryRaw)
        ? (memoryRaw > 1024 * 1024 ? Math.round(memoryRaw / 1024) : Math.round(memoryRaw))
        : 0;

      const status: ExecutionResult['status'] = errorMsg
        ? 'ERROR'
        : ((last?.exit_code ?? 0) === 0 ? 'SUCCESS' : 'ERROR');

      setExecutionResult({
        output: output || '',
        error: errorMsg,
        executionTime: Number.isFinite(time) ? Math.max(0, Math.round(time)) : 0,
        memoryUsage: Math.max(0, memoryKb),
        status,
      });
    } catch (err: any) {
      const normalizedMessage = String(err?.message ?? '');
      const isTimeout = err?.code === 'ECONNABORTED' || normalizedMessage.toLowerCase().includes('timeout');

      setExecutionResult({
        output: '',
        error: isTimeout
          ? '실행 시간이 제한을 초과했습니다. 무한 루프 여부를 확인해 주세요.'
          : (err?.message || '실행 중 오류가 발생했습니다.'),
        executionTime: 0,
        memoryUsage: 0,
        status: isTimeout ? 'TIMEOUT' : 'ERROR',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-white dark:bg-slate-900">
      <div ref={containerRef} className="flex h-full min-h-0">
        <DevIdeExplorer
          folders={folders}
          filesByFolder={filesByFolder}
          selectedFolderId={selectedFolderId}
          activeFileId={activeFile?.id ?? ''}
          editingFileId={editingFileId}
          editingName={editingName}
          openFileMenuId={openFileMenuId}
          isCollapsed={isExplorerCollapsed}
          widthPct={leftWidthPct}
          theme={editorTheme}
          canLoadMoreSolved={canLoadMoreSolved}
          isSolvedLoading={isSolvedLoading}
          hasSavedFiles={hasSavedFiles}
          onGoBack={() => window.history.back()}
          onCreateFile={handleCreateFile}
          onLoadMoreSolved={() => {
            if (isSolvedLoading || !canLoadMoreSolved) return;
            void loadSolvedFiles(solvedPage + 1, true);
          }}
          onToggleFolder={handleToggleFolder}
          onSelectFile={(file) => {
            setActiveFileId(file.id);
            setSelectedFolderId(file.folderId);
            setExecutionResult(undefined);
            setOpenFileMenuId(null);
          }}
          onOpenFileMenu={(fileId) => setOpenFileMenuId((prev) => (prev === fileId ? null : fileId))}
          onOpenProblemByFile={(file) => {
            if (!file.problemId || file.problemId <= 0) return;
            navigate(`/problems/${file.problemId}`);
          }}
          onRenameFile={handleRenameFile}
          onDeleteFile={handleDeleteFile}
          onEditingNameChange={setEditingName}
          onCommitRename={commitRename}
          onCancelRename={cancelRename}
        />

        <ResizerBar
          orientation="vertical"
          onMouseDown={(e) => startExplorerResize(e)}
          onDoubleClick={() => {
            setExplorerCollapsed(false);
            setLeftWidthPct(24);
          }}
          className="flex items-center justify-center select-none group"
          style={
            editorTheme === 'dark'
              ? ({ backgroundColor: '#0f172a', '--oj-resizer-line': '#334155', '--oj-resizer-line-hover': '#64748b' } as React.CSSProperties)
              : ({ backgroundColor: '#f3f4f6', '--oj-resizer-line': '#e5e7eb', '--oj-resizer-line-hover': '#cbd5e1' } as React.CSSProperties)
          }
        >
          <button
            aria-label={isExplorerCollapsed ? '탐색기 펼치기' : '탐색기 접기'}
            className={`oj-side-handle small blend transition-opacity duration-200 ${isExplorerCollapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover:opacity-100 pointer-events-none'}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleExplorer();
            }}
            onMouseDown={(e) => {
              if (isExplorerCollapsed) {
                e.preventDefault();
                e.stopPropagation();
                startExplorerResize(e);
                return;
              }
              e.stopPropagation();
            }}
            title={isExplorerCollapsed ? '펼치기' : '접기'}
          >
            {isExplorerCollapsed ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            )}
          </button>
        </ResizerBar>

        <div className="h-full min-h-0 min-w-0 flex-1 border-l-0">
          {isEditorDisabled ? (
            <div className="flex h-full w-full items-center justify-center bg-white px-6 text-center text-base font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-300">
              파일이 없습니다.
            </div>
          ) : (
            <CodeEditor
              key={activeFile.id}
              initialCode={activeFile.code}
              initialLanguage={activeFile.language}
              allowedLanguages={[activeFile.language]}
              onCodeChange={handleFileCodeChange}
              onExecute={handleExecute}
              executionResult={executionResult}
              isExecuting={isExecuting}
              showBackButton={false}
              showExecuteButton
              executeButtonIconOnly
              showSaveButton
              showSubmitButton={false}
              saveButtonIconOnly
              submitButtonIconOnly
              modernToolbarSelect
              showLanguageSelector={false}
              preferredTheme={editorTheme}
              onThemeChange={setEditorTheme}
              className="h-full"
            />
          )}
        </div>
      </div>
    </div>
  );
};
