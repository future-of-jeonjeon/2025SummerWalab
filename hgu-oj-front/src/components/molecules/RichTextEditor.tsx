import React, { useEffect, useRef, useState } from 'react';
import { uploadService } from '../../services/uploadService';

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

interface RichTextEditorProps {
  label?: string;
  id?: string;
  value: string;
  placeholder?: string;
  onChange: (nextValue: string) => void;
  className?: string;
  helperText?: string;
}

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

  useEffect(() => {
    const node = editorRef.current;
    if (!node) {
      return;
    }
    if (node.innerHTML !== value) {
      node.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    const next = editorRef.current?.innerHTML ?? '';
    onChange(next);
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
    { key: 'bold', label: '굵게', icon: <span className="font-semibold">B</span>, command: 'bold' },
    { key: 'italic', label: '기울임', icon: <span className="italic">I</span>, command: 'italic' },
    { key: 'underline', label: '밑줄', icon: <span className="underline">U</span>, command: 'underline' },
    { key: 'ul', label: '글머리 기호', icon: <span>•</span>, command: 'insertUnorderedList' },
    { key: 'ol', label: '번호 목록', icon: <span>1.</span>, command: 'insertOrderedList' },
    { key: 'quote', label: '인용', icon: <span className="text-base">❝</span>, command: 'formatBlock', value: 'blockquote' },
    { key: 'code', label: '코드', icon: <span className="text-xs">&lt;&gt;</span>, command: 'formatBlock', value: 'pre' },
    { key: 'image', label: '이미지', icon: imageIcon, onClick: handleInsertImage },
  ];

  const handleAction = (action: ToolbarAction) => {
    ensureFocus();
    if (action.onClick) {
      action.onClick();
      return;
    }
    if (action.command) {
      execCommand(action.command, action.value);
      handleInput();
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="rounded-md border border-gray-300 bg-white">
        <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              className={`rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60`}
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
        </div>
        <div className="relative">
          {(!value || value === '<p><br></p>' || value === '<br>') && !isFocused && placeholder && (
            <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-gray-400">{placeholder}</span>
          )}
          <div
            id={id}
            ref={editorRef}
            className="min-h-[160px] w-full rounded-b-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              handleInput();
            }}
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
      {(helperText || message) && (
        <p className="mt-1 text-xs text-gray-500">
          {message ?? helperText}
        </p>
      )}
    </div>
  );
};

export default RichTextEditor;
