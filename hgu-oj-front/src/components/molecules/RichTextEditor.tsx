import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs';
import { uploadService } from '../../services/uploadService';
import { normalizeRichTextForProblem } from '../../utils/problemRichText';

const execCommand = (command: string, value?: string) => {
  try {
    document.execCommand(command, false, value);
  } catch {
    // execCommand is deprecated but still widely supported; silently ignore failures.
  }
};

interface ToolbarAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  command?: string;
  value?: string;
  onClick?: () => void;
}

type ActiveFormatKey =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'ul'
  | 'ol'
  | 'quote'
  | 'code';

type ActiveFormats = Record<ActiveFormatKey, boolean>;

const DEFAULT_ACTIVE_FORMATS: ActiveFormats = {
  h1: false,
  h2: false,
  h3: false,
  bold: false,
  italic: false,
  underline: false,
  ul: false,
  ol: false,
  quote: false,
  code: false,
};

const BLOCK_TAG_NAMES = ['p', 'div', 'h1', 'h2', 'h3', 'blockquote', 'pre', 'li'];

interface RichTextEditorProps {
  label?: string;
  id?: string;
  value: string;
  placeholder?: string;
  onChange: (nextValue: string) => void;
  className?: string;
  helperText?: string;
}

const MATH_PATTERN = /(\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/;
const MATH_DELIMITERS = [
  { left: '$$', right: '$$', display: true },
  { left: '$', right: '$', display: false },
  { left: '\\(', right: '\\)', display: false },
  { left: '\\[', right: '\\]', display: true },
];

const stripEditorArtifacts = (value: string) =>
  value
    .replace(/<span\b[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<font\b[^>]*>/gi, '')
    .replace(/<\/font>/gi, '');

const RichTextPreview = ({ html }: { html: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.innerHTML = html || '';

    if (!html) {
      return;
    }

    try {
      renderMathInElement(container, {
        delimiters: MATH_DELIMITERS,
        throwOnError: false,
      });
    } catch {
      // Preview is supplementary; keep the editor usable even if KaTeX fails to load.
    }
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="prose prose-sm max-w-none rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
    />
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  id,
  label,
  value,
  placeholder,
  onChange,
  className,
  helperText,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(DEFAULT_ACTIVE_FORMATS);

  useEffect(() => {
    const node = editorRef.current;
    if (!node) {
      return;
    }
    if (node.innerHTML !== value) {
      node.innerHTML = value || '';
    }
  }, [value]);

  const getSelectionContainer = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const anchorNode = selection.anchorNode;
    if (!anchorNode) {
      return null;
    }

    return anchorNode.nodeType === Node.ELEMENT_NODE
      ? (anchorNode as HTMLElement)
      : anchorNode.parentElement;
  };

  const isWithinTag = (tagNames: string[]) => {
    const editor = editorRef.current;
    if (!editor) {
      return false;
    }

    let node = getSelectionContainer();
    while (node && node !== editor) {
      if (tagNames.includes(node.tagName.toLowerCase())) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  };

  const getCurrentBlock = () => {
    const editor = editorRef.current;
    if (!editor) {
      return null;
    }

    let node = getSelectionContainer();
    while (node && node !== editor) {
      if (BLOCK_TAG_NAMES.includes(node.tagName.toLowerCase())) {
        return node;
      }
      node = node.parentElement;
    }

    return editor;
  };

  const placeCaretAtStart = (element: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const placeCaretAfter = (element: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const clearCurrentBlock = () => {
    const block = getCurrentBlock();
    if (!block) {
      return null;
    }

    block.innerHTML = '<br>';
    placeCaretAtStart(block);
    return block;
  };

  const insertHorizontalRuleFromShortcut = () => {
    const editor = editorRef.current;
    const block = getCurrentBlock();
    if (!editor || !block) {
      return false;
    }

    const hr = document.createElement('hr');
    const paragraph = document.createElement('p');
    paragraph.innerHTML = '<br>';

    if (block === editor) {
      editor.innerHTML = '';
      editor.append(hr, paragraph);
    } else {
      block.replaceWith(hr, paragraph);
    }

    placeCaretAfter(paragraph);
    return true;
  };

  const updateActiveFormats = () => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode ?? null;
    const isSelectionInsideEditor = !!anchorNode && editor.contains(anchorNode);

    if (!isSelectionInsideEditor && document.activeElement !== editor) {
      setActiveFormats(DEFAULT_ACTIVE_FORMATS);
      return;
    }

    const safeQueryState = (command: string) => {
      try {
        return document.queryCommandState(command);
      } catch {
        return false;
      }
    };

    setActiveFormats({
      h1: isWithinTag(['h1']),
      h2: isWithinTag(['h2']),
      h3: isWithinTag(['h3']),
      bold: safeQueryState('bold'),
      italic: safeQueryState('italic'),
      underline: safeQueryState('underline'),
      ul: safeQueryState('insertUnorderedList'),
      ol: safeQueryState('insertOrderedList'),
      quote: isWithinTag(['blockquote']),
      code: isWithinTag(['pre', 'code']),
    });
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      updateActiveFormats();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  });

  const handleInput = () => {
    const next = editorRef.current?.innerHTML ?? '';
    onChange(next);
    updateActiveFormats();
  };

  const ensureFocus = () => {
    const node = editorRef.current;
    if (!node) {
      return;
    }
    if (document.activeElement !== node) {
      node.focus();
    }
  };

  const ensureSelectionInEditor = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) {
      return null;
    }

    if (selection.rangeCount > 0 && editor.contains(selection.getRangeAt(0).commonAncestorContainer)) {
      return selection;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    return selection;
  };

  const replaceSelectionWithText = (text: string, caretPosition: number) => {
    const selection = ensureSelectionInEditor();
    if (!selection || selection.rangeCount === 0) {
      return false;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    const nextRange = document.createRange();
    const safeCaretPosition = Math.max(0, Math.min(caretPosition, text.length));
    nextRange.setStart(textNode, safeCaretPosition);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    return true;
  };

  const handleInsertMath = (mode: 'inline' | 'block') => {
    ensureFocus();
    const selection = ensureSelectionInEditor();
    const selectedText = selection?.toString() ?? '';
    const seed = selectedText || (mode === 'inline' ? 'x' : 'x = 1');
    const insertedText = mode === 'inline' ? `$${seed}$` : `$$\n${seed}\n$$`;
    const caretPosition = selectedText ? insertedText.length : mode === 'inline' ? 1 : 3;

    if (replaceSelectionWithText(insertedText, caretPosition)) {
      handleInput();
    }
  };

  const handleInsertImage = () => {
    ensureFocus();
    setMessage(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    setMessage('이미지를 업로드하는 중입니다...');
    try {
      const url = await uploadService.uploadImage(file);
      ensureFocus();
      execCommand('insertImage', url);
      handleInput();
      setMessage('이미지를 삽입했습니다.');
    } catch (error) {
      const detail = error instanceof Error ? error.message : '이미지를 업로드하지 못했습니다.';
      setMessage(detail);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const imageIcon = (
    <svg
      aria-hidden="true"
      focusable="false"
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M3 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12a1 1 0 0 1-1.707.707L13 12.414l-3.293 3.293a1 1 0 0 1-1.414 0L6 13.414l-2.293 2.293A1 1 0 0 1 2 15V4a2 2 0 0 1 1-1.732V4Zm2-1a1 1 0 0 0-1 1v7.586l1.293-1.293a1 1 0 0 1 1.414 0L10 13.586l3.293-3.293a1 1 0 0 1 1.414 0L17 12.586V4a1 1 0 0 0-1-1H5Zm2 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
    </svg>
  );

  const actions: ToolbarAction[] = [
    { key: 'h1', label: '제목 1', icon: <span className="text-xs font-bold">H1</span>, command: 'formatBlock', value: 'h1' },
    { key: 'h2', label: '제목 2', icon: <span className="text-xs font-bold">H2</span>, command: 'formatBlock', value: 'h2' },
    { key: 'h3', label: '제목 3', icon: <span className="text-xs font-bold">H3</span>, command: 'formatBlock', value: 'h3' },
    { key: 'bold', label: '굵게', icon: <span className="font-semibold">B</span>, command: 'bold' },
    { key: 'italic', label: '기울임', icon: <span className="italic">I</span>, command: 'italic' },
    { key: 'underline', label: '밑줄', icon: <span className="underline">U</span>, command: 'underline' },
    { key: 'ul', label: '글머리 기호', icon: <span>•</span>, command: 'insertUnorderedList' },
    { key: 'ol', label: '번호 목록', icon: <span>1.</span>, command: 'insertOrderedList' },
    { key: 'quote', label: '인용', icon: <span className="text-base">❝</span>, command: 'formatBlock', value: 'blockquote' },
    { key: 'code', label: '코드', icon: <span className="text-xs">&lt;&gt;</span>, command: 'formatBlock', value: 'pre' },
    { key: 'math-inline', label: '인라인 수식', icon: <span className="font-mono text-xs">$x$</span>, onClick: () => handleInsertMath('inline') },
    { key: 'math-block', label: '블록 수식', icon: <span className="font-mono text-xs">$$</span>, onClick: () => handleInsertMath('block') },
    { key: 'hr', label: '구분선', icon: <span className="text-base leading-none">―</span>, command: 'insertHorizontalRule' },
    { key: 'image', label: '이미지', icon: imageIcon, onClick: handleInsertImage },
  ];

  const handleAction = (action: ToolbarAction) => {
    ensureFocus();
    if (action.onClick) {
      action.onClick();
      return;
    }
    if (action.command) {
      if (
        (action.key === 'h1' && activeFormats.h1) ||
        (action.key === 'h2' && activeFormats.h2) ||
        (action.key === 'h3' && activeFormats.h3) ||
        (action.key === 'quote' && activeFormats.quote)
      ) {
        execCommand('formatBlock', 'p');
      } else if (action.key === 'code' && activeFormats.code) {
        execCommand('formatBlock', 'p');
      } else {
        execCommand(action.command, action.value);
      }
      handleInput();
    }
  };

  const activeFormatLabels = [
    activeFormats.h1 && '제목 1',
    activeFormats.h2 && '제목 2',
    activeFormats.h3 && '제목 3',
    activeFormats.bold && '굵게',
    activeFormats.italic && '기울임',
    activeFormats.underline && '밑줄',
    activeFormats.ul && '글머리 기호',
    activeFormats.ol && '번호 목록',
    activeFormats.quote && '인용',
    activeFormats.code && '코드',
  ].filter(Boolean) as string[];

  const shouldShowPreview = MATH_PATTERN.test(value);
  const previewHtml = useMemo(
    () => normalizeRichTextForProblem(stripEditorArtifacts(value)),
    [value],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const block = getCurrentBlock();
    const blockText = block?.textContent?.trim() ?? '';

    if (event.key === ' ') {
      const shortcutMap: Record<string, string> = {
        '#': 'h1',
        '##': 'h2',
        '###': 'h3',
      };
      const targetTag = shortcutMap[blockText];
      if (targetTag) {
        event.preventDefault();
        clearCurrentBlock();
        execCommand('formatBlock', targetTag);
        handleInput();
      }
      return;
    }

    if (event.key === 'Enter' && blockText === '---') {
      event.preventDefault();
      if (insertHorizontalRuleFromShortcut()) {
        handleInput();
      }
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1" htmlFor={id}>
          {label}
        </label>
      )}
      <div className={`grid gap-4 ${shouldShowPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        <div className="rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-2 py-1.5">
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                className={`rounded-md border px-2.5 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  action.key in activeFormats && activeFormats[action.key as ActiveFormatKey]
                    ? 'border-blue-300 bg-blue-100 text-blue-700 shadow-sm dark:border-blue-500 dark:bg-blue-900/40 dark:text-blue-200'
                    : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-200 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700'
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleAction(action);
                }}
                title={action.label}
                disabled={isUploading && action.key === 'image'}
              >
                {action.icon}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 pl-2 text-xs">
              <span className="font-medium text-gray-400 dark:text-slate-500">현재 서식</span>
              {activeFormatLabels.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {activeFormatLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 dark:text-slate-500">기본</span>
              )}
            </div>
          </div>
          <div className="relative">
            {(!value || value === '<p><br></p>' || value === '<br>') && !isFocused && placeholder && (
              <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-gray-400 dark:text-slate-500">{placeholder}</span>
            )}
            <div
              id={id}
              ref={editorRef}
              className="min-h-[160px] w-full rounded-b-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#58A0C8] dark:text-slate-100
                [&_a]:font-medium [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-blue-300
                [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-300 [&_blockquote]:bg-blue-50/70 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:italic dark:[&_blockquote]:border-blue-500 dark:[&_blockquote]:bg-blue-950/30
                [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-slate-800 [&_pre]:bg-slate-950 [&_pre]:px-4 [&_pre]:py-3 [&_pre]:font-mono [&_pre]:text-[13px] [&_pre]:leading-6 [&_pre]:text-slate-100
                [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] dark:[&_code]:bg-slate-800
                [&_pre_code]:bg-transparent [&_pre_code]:p-0
                [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-bold
                [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold
                [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold
                [&_hr]:my-4 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-slate-300 dark:[&_hr]:border-slate-600
                [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6
                [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6
                [&_li]:my-1
                [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-slate-200 dark:[&_img]:border-slate-700"
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onFocus={() => {
                setIsFocused(true);
                updateActiveFormats();
              }}
              onBlur={() => {
                setIsFocused(false);
                handleInput();
                setTimeout(() => {
                  updateActiveFormats();
                }, 0);
              }}
              onKeyDown={handleKeyDown}
              onKeyUp={updateActiveFormats}
              onMouseUp={updateActiveFormats}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {shouldShowPreview && (
          <div className="rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">수식 미리보기</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">렌더링 결과</span>
            </div>
            <div className="p-3">
              <RichTextPreview html={previewHtml} />
            </div>
          </div>
        )}
      </div>
      {(helperText || message) && (
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          {message ?? helperText}
        </p>
      )}
    </div>
  );
};

export default RichTextEditor;
