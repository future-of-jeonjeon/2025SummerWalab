import React, { useEffect, useMemo, useRef, useState } from 'react';
import ToastUIEditor from '@toast-ui/editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs';
import { uploadService } from '../../services/uploadService';

const GENERIC_HTML_PATTERN = /<\/?[a-z][^>]*>/i;
const MATH_DELIMITERS = [
  { left: '$$', right: '$$', display: true },
  { left: '$', right: '$', display: false },
  { left: '\\(', right: '\\)', display: false },
  { left: '\\[', right: '\\]', display: true },
];
type EditorType = 'markdown' | 'wysiwyg';

interface ProblemTextEditorProps {
  label?: string;
  id?: string;
  value: string;
  placeholder?: string;
  onChange: (nextValue: string) => void;
  className?: string;
  helperText?: string;
}

const resolveInitialMode = (value: string): EditorType => {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'wysiwyg';
  }

  return GENERIC_HTML_PATTERN.test(trimmed) ? 'wysiwyg' : 'markdown';
};

const renderMathPreview = (root: HTMLElement | null) => {
  if (!root) {
    return;
  }

  const targets = root.querySelectorAll<HTMLElement>('.toastui-editor-md-preview .toastui-editor-contents');
  targets.forEach((target) => {
    try {
      renderMathInElement(target, {
        delimiters: MATH_DELIMITERS,
        throwOnError: false,
      });
    } catch {
      // Keep the editor usable even if KaTeX rendering fails for part of the preview.
    }
  });
};

export const ProblemTextEditor: React.FC<ProblemTextEditorProps> = ({
  id,
  label,
  value,
  placeholder,
  onChange,
  className,
  helperText,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const editorHostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ToastUIEditor | null>(null);
  const onChangeRef = useRef(onChange);
  const lastEmittedValueRef = useRef<string | null>(null);
  const displayModeRef = useRef<EditorType>(resolveInitialMode(value));
  const [displayMode, setDisplayMode] = useState<EditorType>(displayModeRef.current);
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const editorFrameClass = useMemo(
    () => [
      '[&_.toastui-editor-defaultUI]:border-gray-300',
      '[&_.toastui-editor-defaultUI]:rounded-md',
      '[&_.toastui-editor-defaultUI]:overflow-hidden',
      '[&_.toastui-editor-defaultUI-toolbar]:bg-gray-50',
      '[&_.toastui-editor-defaultUI-toolbar]:border-b-gray-200',
      '[&_.toastui-editor-defaultUI-toolbar_button]:text-gray-600',
      '[&_.toastui-editor-main]:bg-white',
      '[&_.toastui-editor-md-container]:bg-white',
      '[&_.toastui-editor-ww-container]:bg-white',
      '[&_.toastui-editor-md-preview]:bg-slate-50',
      '[&_.toastui-editor-md-preview]:border-l-gray-200',
      '[&_.toastui-editor-md-tab-container]:hidden',
      '[&_.toastui-editor-mode-switch]:hidden',
      '[&_.toastui-editor-contents]:font-sans',
      '[&_.toastui-editor-contents]:text-sm',
      '[&_.toastui-editor-contents]:text-slate-800',
      '[&_.toastui-editor-contents_h1]:text-2xl',
      '[&_.toastui-editor-contents_h2]:text-xl',
      '[&_.toastui-editor-contents_h3]:text-lg',
      '[&_.toastui-editor-contents_pre]:rounded-xl',
      '[&_.toastui-editor-contents_pre]:border',
      '[&_.toastui-editor-contents_pre]:border-slate-800',
      '[&_.toastui-editor-contents_pre]:bg-slate-950',
      '[&_.toastui-editor-contents_pre]:text-slate-100',
      '[&_.toastui-editor-contents_blockquote]:border-l-4',
      '[&_.toastui-editor-contents_blockquote]:border-blue-300',
      '[&_.toastui-editor-contents_blockquote]:bg-blue-50/70',
      '[&_.toastui-editor-contents_blockquote]:px-4',
      '[&_.toastui-editor-contents_blockquote]:py-3',
      '[&_.toastui-editor-contents_hr]:my-4',
    ].join(' '),
    [],
  );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const schedulePreviewRender = () => {
    window.requestAnimationFrame(() => {
      renderMathPreview(wrapperRef.current);
    });
  };

  const updateDisplayMode = (nextMode: EditorType) => {
    displayModeRef.current = nextMode;
    setDisplayMode((prev) => (prev === nextMode ? prev : nextMode));
  };

  const syncEditorValue = (editor: ToastUIEditor, nextValue: string) => {
    const mode = resolveInitialMode(nextValue);
    if (displayModeRef.current !== mode) {
      updateDisplayMode(mode);
      editor.changeMode(mode, true);
    }

    if (GENERIC_HTML_PATTERN.test(nextValue)) {
      editor.setHTML(nextValue || '', false);
    } else {
      editor.setMarkdown(nextValue || '', false);
    }

    schedulePreviewRender();
  };

  useEffect(() => {
    if (!editorHostRef.current || editorRef.current) {
      return;
    }

    const editor = new ToastUIEditor({
      el: editorHostRef.current,
      height: '360px',
      minHeight: '220px',
      initialEditType: displayMode,
      previewStyle: 'vertical',
      hideModeSwitch: true,
      placeholder,
      usageStatistics: false,
      hooks: {
        addImageBlobHook: async (blob: Blob | File, callback: (url: string, text?: string) => void) => {
          setIsUploading(true);
          setMessage('이미지를 업로드하는 중입니다...');
          try {
            const url = await uploadService.uploadImage(blob as File);
            callback(url, (blob as File).name);
            setMessage('이미지를 삽입했습니다.');
          } catch (error) {
            const detail = error instanceof Error ? error.message : '이미지를 업로드하지 못했습니다.';
            setMessage(detail);
          } finally {
            setIsUploading(false);
          }
        },
      },
      events: {
        change: () => {
          const nextValue = editor.getMarkdown();
          lastEmittedValueRef.current = nextValue;
          onChangeRef.current(nextValue);
          schedulePreviewRender();
        },
      },
    });

    editorRef.current = editor;
    editor.on('changeMode', (nextMode: EditorType) => {
      updateDisplayMode(nextMode);
      schedulePreviewRender();
    });

    syncEditorValue(editor, value);

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, [placeholder]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    if (value === lastEmittedValueRef.current) {
      lastEmittedValueRef.current = null;
      return;
    }

    syncEditorValue(editor, value);
  }, [value]);

  const handleModeChange = (nextMode: EditorType) => {
    const editor = editorRef.current;
    if (!editor || displayModeRef.current === nextMode) {
      return;
    }

    const currentMarkdown = editor.getMarkdown();
    lastEmittedValueRef.current = currentMarkdown;
    updateDisplayMode(nextMode);
    editor.changeMode(nextMode, true);
    editor.setMarkdown(currentMarkdown, false);
    if (currentMarkdown !== value) {
      onChangeRef.current(currentMarkdown);
    }
    schedulePreviewRender();
  };

  return (
    <div className={className}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300" htmlFor={id}>
          {label}
        </label>
      )}
      <div ref={wrapperRef} className="relative">
        <div id={id} ref={editorHostRef} className={editorFrameClass} />
        <div className="absolute bottom-3 right-3 z-[30] flex items-center gap-2">
          <div className="inline-flex rounded-full border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                displayMode === 'markdown'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                handleModeChange('markdown');
              }}
              disabled={isUploading}
            >
              Markdown
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                displayMode === 'wysiwyg'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                handleModeChange('wysiwyg');
              }}
              disabled={isUploading}
            >
              Styled
            </button>
          </div>
        </div>
      </div>
      {(helperText || message) && (
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          {message ?? helperText}
        </p>
      )}
    </div>
  );
};

export default ProblemTextEditor;
