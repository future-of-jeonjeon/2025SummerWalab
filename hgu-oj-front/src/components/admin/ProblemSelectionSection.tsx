import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { useProblemSearch } from '../../hooks/useProblemSearch';
import { AddProblemResult, SelectedProblem } from '../../hooks/useProblemSelection';
import { Problem } from '../../types';

type MessageState = {
  success?: string;
  error?: string;
};

type ProblemSelectionSectionProps = {
  selectedProblems: SelectedProblem[];
  onAddProblem: (problem: Problem) => AddProblemResult;
  onRemoveProblem: (problemId: number) => void;
  message?: MessageState;
  onMessageChange?: (message: MessageState) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  addButtonLabel?: string;
  emptySelectionText?: string;
  manualAddEnabled?: boolean;
  resetSignal?: number;
  className?: string;
};

const defaultMessages: MessageState = {};

const defaultProps = {
  label: '문제 검색 또는 ID 입력',
  placeholder: '예: 101 또는 다익스트라',
  helperText: '문제를 검색해 선택하거나 직접 ID를 입력하세요.',
  addButtonLabel: 'ID 추가',
  emptySelectionText: '선택된 문제가 없습니다. 문제를 추가해보세요.',
  manualAddEnabled: true,
};

export const ProblemSelectionSection: React.FC<ProblemSelectionSectionProps> = ({
  selectedProblems,
  onAddProblem,
  onRemoveProblem,
  message,
  onMessageChange,
  label = defaultProps.label,
  placeholder = defaultProps.placeholder,
  helperText = defaultProps.helperText,
  addButtonLabel = defaultProps.addButtonLabel,
  emptySelectionText = defaultProps.emptySelectionText,
  manualAddEnabled = defaultProps.manualAddEnabled,
  resetSignal,
  className,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [localMessage, setLocalMessage] = useState<MessageState>(defaultMessages);

  const effectiveMessage = message ?? localMessage;

  const emitMessage = (next: MessageState) => {
    if (onMessageChange) {
      onMessageChange(next);
    } else {
      setLocalMessage(next);
    }
  };

  useEffect(() => {
    setLocalMessage(defaultMessages);
  }, [resetSignal]);

  useEffect(() => {
    if (resetSignal !== undefined) {
      setInputValue('');
    }
  }, [resetSignal]);

  const excludeIds = useMemo(
    () => selectedProblems.map((problem) => problem.id),
    [selectedProblems]
  );

  const { results, loading, error } = useProblemSearch(inputValue, {
    excludeIds,
  });

  const handleSelectProblem = (problem: Problem) => {
    const result = onAddProblem(problem);
    if (!result.success) {
      emitMessage({ error: result.error ?? '문제를 추가하지 못했습니다.' });
      return;
    }
    emitMessage({});
    setInputValue('');
  };

  const handleManualAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }

    const lowered = trimmed.toLowerCase();
    const matched = results.find((problem) => {
      if (String(problem.id) === trimmed) {
        return true;
      }
      if (!problem.displayId) {
        return false;
      }
      return problem.displayId.toLowerCase() === lowered;
    });

    if (!matched) {
      emitMessage({ error: '검색 결과에서 문제를 선택하세요.' });
      return;
    }

    handleSelectProblem(matched);
  };

  const handleRemove = (problemId: number) => {
    onRemoveProblem(problemId);
    emitMessage({});
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (manualAddEnabled) {
        handleManualAdd();
      }
    }
  };

  return (
    <div className={className}>
      <div className="space-y-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label={label}
              value={inputValue}
              placeholder={placeholder}
              onChange={(event) => {
                setInputValue(event.target.value);
                if (effectiveMessage.error) {
                  emitMessage({});
                }
              }}
              onKeyDown={manualAddEnabled ? onKeyDown : undefined}
            />
            {helperText && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
          </div>
          {manualAddEnabled && (
            <Button type="button" variant="outline" size="sm" onClick={handleManualAdd}>
              {addButtonLabel}
            </Button>
          )}
        </div>

        {effectiveMessage.error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
            {effectiveMessage.error}
          </div>
        )}
        {effectiveMessage.success && (
          <div className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-600">
            {effectiveMessage.success}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
        )}

        {!error && inputValue.trim() && loading && (
          <p className="text-xs text-gray-500">문제를 검색 중입니다...</p>
        )}

        {!error && inputValue.trim() && !loading && results.length === 0 && (
          <p className="text-xs text-gray-500">검색 결과가 없습니다.</p>
        )}

        {!error && results.length > 0 && (
          <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200">
            {results.map((problem) => (
              <li key={`problem-selection-suggestion-${problem.id}`}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => handleSelectProblem(problem)}
                >
                  <div>
                    <p className="font-medium text-gray-800">
                      {problem.displayId ?? problem.id} · {problem.title}
                    </p>
                    <p className="text-xs text-gray-500">난이도: {problem.difficulty}</p>
                  </div>
                  <span className="text-xs text-[#113F67]">추가</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {selectedProblems.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
            {emptySelectionText}
          </div>
        )}

        {selectedProblems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedProblems.map((problem) => {
              const labelText = problem.displayId ?? problem.id;
              return (
                <span
                  key={`problem-selection-chip-${problem.id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#113F67]/10 px-3 py-1 text-sm text-[#113F67]"
                >
                  <span className="font-medium">문제 {labelText}</span>
                  {problem.title && (
                    <span className="max-w-[160px] truncate text-xs text-gray-500">
                      {problem.title}
                    </span>
                  )}
                  <button
                    type="button"
                    className="text-[#113F67] transition-colors hover:text-[#34699A]"
                    onClick={() => handleRemove(problem.id)}
                    aria-label={`문제 ${labelText} 삭제`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemSelectionSection;

