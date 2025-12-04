import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import { LanguageOption, ExecutionResult } from '../../types';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { AlertModal } from '../molecules/AlertModal';
import codeTemplates from '../../config/codeTemplates.json';
import { codeAutoSaveService } from '../../services/codeAutoSaveService';

interface CodeEditorProps {
  initialCode?: string;
  initialLanguage?: string;
  allowedLanguages?: string[];
  problemId?: number;
  samples?: Array<{ input: string; output: string }>;
  onCodeChange?: (code: string) => void;
  onLanguageChange?: (language: string) => void;
  onExecute?: (code: string, language: string, input?: string) => void;
  onSubmit?: (code: string, language: string) => void;
  executionResult?: ExecutionResult;
  isExecuting?: boolean;
  isSubmitting?: boolean;
  preferredTheme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  className?: string;
}

const languageOptions: LanguageOption[] = [
  { value: 'javascript', label: 'JavaScript', extension: 'js', monacoLanguage: 'javascript' },
  { value: 'python', label: 'Python', extension: 'py', monacoLanguage: 'python' },
  { value: 'java', label: 'Java', extension: 'java', monacoLanguage: 'java' },
  { value: 'cpp', label: 'C++', extension: 'cpp', monacoLanguage: 'cpp' },
  { value: 'c', label: 'C', extension: 'c', monacoLanguage: 'c' },
];

const defaultCode: Record<string, string> = codeTemplates as Record<string, string>;

const DEFAULT_AUTO_SAVE_INTERVAL_MS = 15000;
const resolveAutoSaveIntervalMs = () => {
  const rawEnv =
    (import.meta.env.VITE_CODE_AUTO_SAVE_INTERVAL_SECONDS as string | undefined) ??
    (import.meta.env.VITE_CODE_AUTOSAVE_INTERVAL_SECONDS as string | undefined);
  const parsed = rawEnv ? Number(rawEnv) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed * 1000;
  }
  return DEFAULT_AUTO_SAVE_INTERVAL_MS;
};

const DEFAULT_AUTO_SAVE_CACHE_TTL_MS = 30 * 1000;
const resolveAutoSaveCacheTtlMs = () => {
  const rawEnv =
    (import.meta.env.VITE_CODE_AUTO_SAVE_CACHE_TTL_SECONDS as string | undefined) ??
    (import.meta.env.VITE_CODE_AUTOSAVE_CACHE_TTL_SECONDS as string | undefined);
  const parsed = rawEnv ? Number(rawEnv) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed * 1000;
  }
  return DEFAULT_AUTO_SAVE_CACHE_TTL_MS;
};

type CachedCodeEntry = {
  value: string;
  expiresAt: number;
};

const writeCachedCode = (storageKey: string, value: string, ttlMs: number) => {
  if (typeof window === 'undefined') {
    return;
  }
  const storage = window.sessionStorage;
  if (!value || ttlMs <= 0) {
    storage.removeItem(storageKey);
    return;
  }
  const payload: CachedCodeEntry = {
    value,
    expiresAt: Date.now() + ttlMs,
  };
  storage.setItem(storageKey, JSON.stringify(payload));
};

const purgeExpiredCodeCache = (prefix: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  const storage = window.sessionStorage;
  const keysToRemove: string[] = [];
  const now = Date.now();
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    const raw = storage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as CachedCodeEntry | string;
      if (typeof parsed === 'string') {
        keysToRemove.push(key);
        continue;
      }
      if (parsed && typeof parsed === 'object' && typeof parsed.expiresAt === 'number' && parsed.expiresAt <= now) {
        keysToRemove.push(key);
      }
    } catch {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => storage.removeItem(key));
};

const clearCodeCacheForPrefix = (prefix: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  const storage = window.sessionStorage;
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => storage.removeItem(key));
};

type PendingSaveRequest = {
  force: boolean;
  indicator: 'auto' | 'manual';
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode = '',
  initialLanguage = 'javascript',
  allowedLanguages,
  problemId,
  samples,
  onCodeChange,
  onLanguageChange,
  onExecute,
  onSubmit,
  executionResult,
  isExecuting = false,
  isSubmitting = false,
  preferredTheme,
  onThemeChange,
  className = '',
}) => {
  const autoSaveIntervalMs = useMemo(() => resolveAutoSaveIntervalMs(), []);
  const autoSaveCacheTtlMs = useMemo(() => resolveAutoSaveCacheTtlMs(), []);

  const availableLanguageOptions = useMemo(() => {
    if (!allowedLanguages || allowedLanguages.length === 0) {
      return languageOptions;
    }
    const normalized = new Set(allowedLanguages.map((lang) => String(lang).trim().toLowerCase()));
    const matchMap: Record<string, string[]> = {
      javascript: ['javascript', 'js'],
      python: ['python', 'python3', 'py', 'python 3'],
      java: ['java'],
      cpp: ['cpp', 'c++'],
      c: ['c'],
    };
    const filtered = languageOptions.filter((opt) => {
      const candidates = matchMap[opt.value] ?? [opt.value];
      return candidates.some((c) => normalized.has(c));
    });
    return filtered.length > 0 ? filtered : languageOptions;
  }, [allowedLanguages]);
  // Storage keys
  const codeKey = useMemo(() => `oj:code:${problemId ?? 'global'}:`, [problemId]);
  const langKey = useMemo(() => `oj:lang:${problemId ?? 'global'}`, [problemId]);
  const themeKey = 'oj:editorTheme';

  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem(langKey);
    const initial = saved || initialLanguage;
    const allowedValues = availableLanguageOptions.map((opt) => opt.value);
    if (allowedValues.length > 0 && !allowedValues.includes(initial)) {
      return allowedValues[0];
    }
    return allowedValues.length > 0 ? initial : 'javascript';
  });
  const [code, setCode] = useState(() => {
    if (initialCode) return initialCode;
    return defaultCode[language] || '';
  });

  useEffect(() => {
    if (!availableLanguageOptions.some((opt) => opt.value === language)) {
      const fallbackLang = availableLanguageOptions[0]?.value ?? 'javascript';
      setLanguage(fallbackLang);
      const nextCode = initialCode || defaultCode[fallbackLang] || '';
      setCode(nextCode);
    }
  }, [availableLanguageOptions, language, initialCode]);

  const [input, setInput] = useState('');
  const [editorTheme, setEditorTheme] = useState<'light' | 'dark'>(() => {
    if (preferredTheme) return preferredTheme;
    const saved = localStorage.getItem(themeKey);
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  // Layout: vertical split top (editor) / bottom (IO)
  const [ioHeightPct, setIoHeightPct] = useState<number>(() => {
    const saved = localStorage.getItem('oj:layout:ioHeightPct');
    return saved ? Number(saved) : 35; // percentage of component for IO panel
  });
  const [draggingIO, setDraggingIO] = useState(false);
  const [ioCollapsed, setIoCollapsed] = useState(false);
  // Inner IO split (input|output side-by-side)
  const [ioSplitPct, setIoSplitPct] = useState<number>(() => {
    const saved = localStorage.getItem('oj:layout:ioInnerSplitPct');
    return saved ? Number(saved) : 50;
  });
  const [draggingIOSplit, setDraggingIOSplit] = useState(false);
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const codeRef = useRef<string>(code);
  const languageRef = useRef<string>(language);
  const lastAutoSavedRef = useRef<string>(code);
  const isAutoSavingRef = useRef(false);
  const pendingAutoSaveRef = useRef<PendingSaveRequest | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const fadeOutTimeoutRef = useRef<number | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [saveFeedbackVisible, setSaveFeedbackVisible] = useState(false);
  const userEditedRef = useRef(false);


  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    message: string;
    title?: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }>({
    isOpen: false,
    message: '',
    type: 'warning',
  });

  const closeAlertModal = useCallback(() => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const showSaveFeedback = useCallback((message: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    if (feedbackTimeoutRef.current != null) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    if (fadeOutTimeoutRef.current != null) {
      window.clearTimeout(fadeOutTimeoutRef.current);
      fadeOutTimeoutRef.current = null;
    }
    setSaveFeedback(message);
    setSaveFeedbackVisible(true);
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setSaveFeedbackVisible(false);
      fadeOutTimeoutRef.current = window.setTimeout(() => {
        setSaveFeedback(null);
        fadeOutTimeoutRef.current = null;
      }, 320);
    }, 1700);
  }, []);

  useEffect(() => () => {
    if (feedbackTimeoutRef.current != null) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    if (fadeOutTimeoutRef.current != null) {
      window.clearTimeout(fadeOutTimeoutRef.current);
      fadeOutTimeoutRef.current = null;
    }
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!draggingIO || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pctBottom = Math.max(16, Math.min(84, ((rect.height - y) / rect.height) * 100));
    setIoHeightPct(pctBottom);
  }, [draggingIO]);

  const stopResize = useCallback(() => setDraggingIO(false), []);

  useEffect(() => {
    if (draggingIO) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', stopResize);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', stopResize);
      };
    }
  }, [draggingIO, handleResizeMove, stopResize]);

  useEffect(() => {
    localStorage.setItem('oj:layout:ioHeightPct', String(ioHeightPct));
  }, [ioHeightPct]);

  // IO inner split listeners
  const handleIOSplitMove = useCallback((e: MouseEvent) => {
    if (!draggingIOSplit) return;
    const pane = document.getElementById('oj-io-pane');
    if (!pane) return;
    const rect = pane.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(20, Math.min(80, (x / rect.width) * 100));
    setIoSplitPct(pct);
  }, [draggingIOSplit]);

  const stopIOSplit = useCallback(() => setDraggingIOSplit(false), []);

  useEffect(() => {
    if (draggingIOSplit) {
      window.addEventListener('mousemove', handleIOSplitMove);
      window.addEventListener('mouseup', stopIOSplit);
      return () => {
        window.removeEventListener('mousemove', handleIOSplitMove);
        window.removeEventListener('mouseup', stopIOSplit);
      };
    }
  }, [draggingIOSplit, handleIOSplitMove, stopIOSplit]);

  useEffect(() => {
    localStorage.setItem('oj:layout:ioInnerSplitPct', String(ioSplitPct));
  }, [ioSplitPct]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      languageRef.current = initialLanguage;
      setLanguage((prev) => (prev === initialLanguage ? prev : initialLanguage));
      const baseCode = initialCode || defaultCode[initialLanguage] || '';
      if (codeRef.current !== baseCode) {
        codeRef.current = baseCode;
        setCode(baseCode);
      }
      userEditedRef.current = false;
      lastAutoSavedRef.current = '';
      return;
    }

    clearCodeCacheForPrefix(codeKey);
    purgeExpiredCodeCache(codeKey);
    const savedLanguage = localStorage.getItem(langKey) || initialLanguage;
    languageRef.current = savedLanguage;
    setLanguage((prev) => (prev === savedLanguage ? prev : savedLanguage));
    const baseCode = initialCode || defaultCode[savedLanguage] || '';
    if (codeRef.current !== baseCode) {
      codeRef.current = baseCode;
      setCode(baseCode);
    }
    userEditedRef.current = false;
    lastAutoSavedRef.current = '';
  }, [codeKey, langKey, initialCode, initialLanguage]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleUnload = () => {
      clearCodeCacheForPrefix(codeKey);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [codeKey]);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && feedbackTimeoutRef.current != null) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    codeRef.current = newCode;
    setCode(newCode);
    userEditedRef.current = true;
    onCodeChange?.(newCode);
  };

  const handleLanguageChange = (newLanguage: string) => {
    if (language !== newLanguage) {
      setLanguage(newLanguage);
    }
    languageRef.current = newLanguage;
    const nextCode = defaultCode[newLanguage] ?? '';
    codeRef.current = nextCode;
    setCode(nextCode);
    userEditedRef.current = false;
    lastAutoSavedRef.current = '';
    onLanguageChange?.(newLanguage);
    localStorage.setItem(langKey, newLanguage);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(codeKey + newLanguage);
    }
  };

  const handleExecute = () => {
    if (!code.trim()) {
      setAlertModal({
        isOpen: true,
        title: '코드 없음',
        message: '실행할 코드가 없습니다. 코드를 입력해주세요.',
        type: 'warning',
      });
      return;
    }
    onExecute?.(code, language, input);
  };

  const handleSubmit = () => {
    if (!code.trim()) {
      setAlertModal({
        isOpen: true,
        title: '코드 없음',
        message: '제출할 코드가 없습니다. 코드를 입력해주세요.',
        type: 'warning',
      });
      return;
    }
    onSubmit?.(code, language);
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const triggerAutoSave = useCallback(async (options?: { force?: boolean; indicator?: 'auto' | 'manual' }) => {
    const force = options?.force ?? false;
    const indicator = options?.indicator ?? 'auto';
    const successMessage = '저장완료';
    const noChangeMessage = indicator === 'manual' ? successMessage : null;

    if (!problemId || problemId <= 0) {
      pendingAutoSaveRef.current = null;
      return;
    }

    const currentLanguage = languageRef.current;
    if (!currentLanguage) {
      pendingAutoSaveRef.current = null;
      return;
    }

    const currentCode = codeRef.current;
    if (!force) {
      if (!userEditedRef.current) {
        pendingAutoSaveRef.current = null;
        return;
      }
      if (currentCode === lastAutoSavedRef.current) {
        userEditedRef.current = false;
        pendingAutoSaveRef.current = null;
        return;
      }
    } else if (currentCode === lastAutoSavedRef.current && !userEditedRef.current) {
      pendingAutoSaveRef.current = null;
      if (noChangeMessage) {
        showSaveFeedback(noChangeMessage);
      }
      return;
    }

    if (isAutoSavingRef.current) {
      pendingAutoSaveRef.current = { force, indicator };
      return;
    }

    isAutoSavingRef.current = true;
    try {
      await codeAutoSaveService.save({
        problemId,
        language: currentLanguage,
        code: currentCode,
      });
      lastAutoSavedRef.current = currentCode;
      writeCachedCode(codeKey + currentLanguage, currentCode, autoSaveCacheTtlMs);
      showSaveFeedback(successMessage);
      if (codeRef.current === currentCode) {
        userEditedRef.current = false;
      }
    } catch (error) {
      console.error('자동 저장 실패', error);
      if (indicator === 'manual') {
        showSaveFeedback('저장 실패');
      }
    } finally {
      isAutoSavingRef.current = false;
      const pending = pendingAutoSaveRef.current;
      pendingAutoSaveRef.current = null;
      if (pending) {
        void triggerAutoSave(pending);
      }
    }
  }, [autoSaveCacheTtlMs, codeKey, problemId, showSaveFeedback]);

  const handleManualSave = useCallback(() => {
    writeCachedCode(codeKey + languageRef.current, codeRef.current, autoSaveCacheTtlMs);
    void triggerAutoSave({ force: true, indicator: 'manual' });
  }, [autoSaveCacheTtlMs, codeKey, triggerAutoSave]);

  // Autosave to sessionStorage with debounce
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const t = window.setTimeout(() => {
      writeCachedCode(codeKey + language, code, autoSaveCacheTtlMs);
    }, 400);
    return () => window.clearTimeout(t);
  }, [code, language, codeKey, autoSaveCacheTtlMs]);

  // Keyboard shortcuts: Run (Ctrl/Cmd+Enter), Save (Ctrl/Cmd+S)
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const ctrl = isMac ? e.metaKey : e.ctrlKey;
      if (!ctrl) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (code.trim()) {
          onExecute?.(code, language, input);
        }
      }
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      }
      if (e.key.toLowerCase() === 'i' && e.shiftKey) {
        e.preventDefault();
        setIoCollapsed(v => !v);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [code, language, input, onExecute, handleManualSave]);

  // Persist theme
  useEffect(() => {
    localStorage.setItem(themeKey, editorTheme);
  }, [editorTheme]);

  useEffect(() => {
    if (preferredTheme && preferredTheme !== editorTheme) {
      setEditorTheme(preferredTheme);
    }
  }, [preferredTheme]);

  useEffect(() => {
    onThemeChange?.(editorTheme);
  }, [editorTheme, onThemeChange]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!problemId || problemId <= 0) {
      return;
    }
    if (autoSaveIntervalMs <= 0) {
      return;
    }
    const id = window.setInterval(() => {
      void triggerAutoSave();
    }, autoSaveIntervalMs);
    return () => {
      window.clearInterval(id);
    };
  }, [autoSaveIntervalMs, problemId, triggerAutoSave]);

  useEffect(() => {
    if (!problemId || problemId <= 0) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const serverCode = await codeAutoSaveService.fetch({ problemId, language });
        if (cancelled) return;
        const normalized = serverCode ?? '';
        userEditedRef.current = false;
        lastAutoSavedRef.current = normalized;
        writeCachedCode(codeKey + language, normalized, autoSaveCacheTtlMs);
        if (!userEditedRef.current && normalized.length > 0 && normalized !== codeRef.current) {
          userEditedRef.current = false;
          codeRef.current = normalized;
          setCode(normalized);
        }
      } catch (error) {
        console.error('서버 코드 불러오기 실패', error);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [problemId, language, codeKey, autoSaveCacheTtlMs]);

  const isDarkTheme = editorTheme === 'dark';

  const toolbarThemeClasses = isDarkTheme
    ? 'bg-slate-800 border-slate-700 text-slate-200'
    : 'bg-gray-50 border-gray-200 text-gray-700';

  const controlSelectClasses = (size: 'default' | 'sm' = 'default') => {
    const base = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
    const theme = isDarkTheme
      ? 'border border-slate-600 bg-slate-900 text-slate-100 focus:ring-slate-400 focus:border-slate-400'
      : 'border border-gray-300 bg-white text-gray-800 focus:ring-[#58A0C8] focus:border-[#58A0C8]';
    return `${base} rounded-md focus:outline-none ${theme}`;
  };

  const ioPanelClasses = isDarkTheme
    ? 'bg-slate-900 border-t border-slate-700'
    : 'bg-gray-50 border-t border-gray-200';

  const ioLabelClasses = isDarkTheme ? 'text-slate-200' : 'text-gray-700';

  const ioTextareaClasses = isDarkTheme
    ? 'bg-slate-900 border border-slate-600 text-slate-100'
    : 'bg-white border border-gray-300 text-gray-900';



  return (
    <div ref={containerRef} className={`relative flex flex-col h-full min-h-0 ${className}`}>
      {/* Toolbar */}
      <div className={`flex items-center justify-between p-2 border-b ${toolbarThemeClasses}`}>
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className={controlSelectClasses('sm')}
          >
            {availableLanguageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 text-sm">
            <label className={isDarkTheme ? 'text-slate-300' : 'text-gray-600'}>테마</label>
            <select
              value={editorTheme}
              onChange={(e) => setEditorTheme(e.target.value as 'light' | 'dark')}
              className={controlSelectClasses('sm')}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          {saveFeedback && (
            <div
              id="oj-save-indicator"
              className={`text-xs font-medium transition-all duration-500 ease-out ${isDarkTheme ? 'text-emerald-400' : 'text-green-600'} ${saveFeedbackVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}
            >
              {saveFeedback}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={isDarkTheme ? 'border-slate-600 text-slate-200 hover:bg-slate-800' : ''}
            onClick={() => {
              if (confirm('현재 언어의 기본 템플릿으로 초기화할까요?')) {
                const def = defaultCode[language] || '';
                codeRef.current = def;
                setCode(def);
              }
            }}
          >초기화</Button>
          <Button
            variant="outline"
            size="sm"
            className={isDarkTheme ? 'border-slate-600 text-slate-200 hover:bg-slate-800' : ''}
            onClick={handleManualSave}
            title="Ctrl/Cmd+S"
          >
            저장
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExecute}
            disabled={isExecuting}
            loading={isExecuting}
          >
            실행 (Ctrl/Cmd+Enter)
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            제출
          </Button>
        </div>
      </div>

      {/* Editor / IO Split */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Editor Area */}
        <div style={{ height: ioCollapsed ? 'calc(100% - 6px)' : `calc(100% - ${ioHeightPct}%)` }} className="min-h-[84px]">
          <Editor
            height="100%"
            language={languageOptions.find(opt => opt.value === language)?.monacoLanguage || 'javascript'}
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
            theme={editorTheme === 'dark' ? 'vs-dark' : 'vs'}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>

        {/* Resizer: minimal hairline with centered handle */}
        <div
          role="separator"
          aria-orientation="horizontal"
          className="oj-resizer-h select-none group"
          onMouseDown={() => !ioCollapsed && setDraggingIO(true)}
        >
          <button
            aria-label={ioCollapsed ? 'I/O 패널 펼치기' : 'I/O 패널 접기'}
            className={`oj-handle-h blend transition-opacity duration-200 ${ioCollapsed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            onClick={(e) => { e.stopPropagation(); setIoCollapsed(v => !v); }}
            title={ioCollapsed ? 'I/O 펼치기' : 'I/O 접기'}
          >
            {ioCollapsed ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </button>
        </div>

        {/* IO Panel */}
        {!ioCollapsed && (
          <div style={{ height: `${ioHeightPct}%` }} className={`min-h-[140px] flex flex-col ${ioPanelClasses}`}>
            <div id="oj-io-pane" className="flex-1 overflow-hidden p-3 flex items-stretch gap-3">
              {/* 입력 패널 */}
              <div style={{ width: `${ioSplitPct}%` }} className="min-w-[180px] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className={`block text-sm font-medium ${ioLabelClasses}`}>입력</label>
                  <div className="flex gap-2">
                    {samples && samples.length > 0 && (
                      <select
                        className={controlSelectClasses('sm')}
                        onChange={(e) => {
                          const idx = Number(e.target.value);
                          if (!isNaN(idx)) setInput(samples[idx].input || '');
                          e.currentTarget.selectedIndex = 0;
                        }}
                        defaultValue=""
                        title="샘플 입력 적용"
                      >
                        <option value="" disabled>샘플</option>
                        {samples.map((_, i) => (
                          <option key={i} value={i}>예제 {i + 1}</option>
                        ))}
                      </select>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className={`px-2 py-1 text-xs ${isDarkTheme ? 'border-slate-600 text-slate-200 hover:bg-slate-800' : ''}`}
                      onClick={() => setInput('')}
                    >
                      지우기
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`px-2 py-1 text-xs ${isDarkTheme ? 'border-slate-600 text-slate-200 hover:bg-slate-800' : ''}`}
                      onClick={() => navigator.clipboard.writeText(input)}
                    >
                      복사
                    </Button>
                  </div>
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className={`w-full flex-1 p-2 rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#58A0C8] ${ioTextareaClasses}`}
                  placeholder="표준 입력에 전달할 값을 입력하세요"
                />
              </div>

              {/* 수직 리사이저 */}
              <div
                role="separator"
                aria-orientation="vertical"
                className="oj-resizer-v"
                onMouseDown={() => setDraggingIOSplit(true)}
                title="I/O 폭 조절"
              />

              {/* 출력 패널 */}
              <div style={{ width: `${100 - ioSplitPct}%` }} className="min-w-[180px] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className={`block text-sm font-medium ${ioLabelClasses}`}>출력</label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`px-2 py-1 text-xs ${isDarkTheme ? 'border-slate-600 text-slate-200 hover:bg-slate-800' : ''}`}
                      onClick={() => navigator.clipboard.writeText(`${executionResult?.output || ''}${executionResult?.error ? `\n${executionResult.error}` : ''}`)}
                    >
                      복사
                    </Button>
                  </div>
                </div>
                <Card className="flex-1" appearance={isDarkTheme ? 'inverted' : 'default'}>
                  <div className="h-full overflow-auto space-y-2">
                    {executionResult ? (
                      <>
                        <div className={`text-sm ${isDarkTheme ? 'text-slate-200' : 'text-gray-700'}`}>
                          <span className="mr-3">상태: <span className={`font-mono ${executionResult.status === 'SUCCESS' ? 'text-green-500' : executionResult.status === 'TIMEOUT' ? 'text-orange-500' : 'text-red-500'}`}>{executionResult.status}</span></span>
                          <span className="mr-3">시간: <span className="font-mono">{executionResult.executionTime}ms</span></span>
                          <span>메모리: <span className="font-mono">{executionResult.memoryUsage}KB</span></span>
                        </div>
                        {executionResult.output && (
                          <div>
                            <div className="text-sm font-medium mb-1">stdout</div>
                            <pre className={`mt-1 p-2 rounded text-sm font-mono whitespace-pre-wrap ${isDarkTheme ? 'bg-slate-800 text-slate-100' : 'bg-gray-100 text-gray-900'}`}>{executionResult.output}</pre>
                          </div>
                        )}
                        {executionResult.error && (
                          <div>
                            <div className={`text-sm font-medium mb-1 ${isDarkTheme ? 'text-red-400' : 'text-red-600'}`}>stderr</div>
                            <pre className={`mt-1 p-2 rounded text-sm font-mono whitespace-pre-wrap ${isDarkTheme ? 'bg-red-900/40 text-red-300' : 'bg-red-50 text-red-700'}`}>{executionResult.error}</pre>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={`${isDarkTheme ? 'text-slate-400' : 'text-gray-500'} text-center py-8`}>
                        실행 결과가 여기에 표시됩니다.
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlertModal}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
};
