import React, { useState } from 'react';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { ProblemSelectionSection } from './ProblemSelectionSection';
import { useProblemSelection, AddProblemResult } from '../../hooks/useProblemSelection';
import { adminService, CreateWorkbookPayload } from '../../services/adminService';
import { Problem } from '../../types';

type WorkbookFormState = {
  title: string;
  description: string;
  category: string;
  isPublic: boolean;
};

export const WorkbookCreateSection: React.FC = () => {
  const [formState, setFormState] = useState<WorkbookFormState>({
    title: '',
    description: '',
    category: '',
    isPublic: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ success?: string; error?: string }>({});
  const {
    selectedProblems,
    addProblem,
    removeProblem,
    clear: clearSelection,
  } = useProblemSelection();
  const [selectionMessage, setSelectionMessage] = useState<{ success?: string; error?: string }>({});
  const [selectionResetSignal, setSelectionResetSignal] = useState(0);

  const handleAddProblem = (problem: Problem): AddProblemResult => {
    const result = addProblem(problem);
    if (!result.success) {
      setSelectionMessage({ error: result.error });
      return result;
    }
    setSelectionMessage({});
    setMessage({});
    return result;
  };

  const handleRemoveProblem = (problemId: number) => {
    removeProblem(problemId);
    setSelectionMessage({});
    setMessage({});
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setMessage({});

    if (!formState.title.trim()) {
      setMessage({ error: '문제집 제목을 입력하세요.' });
      return;
    }

    const selectedProblemIds = selectedProblems
      .map((problem) => Number(problem.id))
      .filter((id) => Number.isInteger(id) && id > 0);
    const uniqueProblemIds = Array.from(new Set(selectedProblemIds));

    const payload: CreateWorkbookPayload = {
      title: formState.title.trim(),
      description: formState.description.trim(),
      is_public: formState.isPublic,
    };

    if (uniqueProblemIds.length > 0) {
      payload.problemIds = uniqueProblemIds;
    }

    try {
      setLoading(true);
      const workbook = await adminService.createWorkbook(payload);
      setMessage({ success: `문제집(ID: ${workbook.id})이 등록되었습니다.` });
      setFormState({
        title: '',
        description: '',
        category: '',
        isPublic: false,
      });
      clearSelection();
      setSelectionMessage({});
      setSelectionResetSignal((prev) => prev + 1);
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : '문제집 등록 중 오류가 발생했습니다.';
      setMessage({ error: fallbackMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-gray-900">문제집 등록</h2>
          <p className="text-sm text-gray-500">문제집 메타데이터를 입력하면 즉시 저장됩니다.</p>
        </div>

        {message.error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{message.error}</div>}
        {message.success && <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-600">{message.success}</div>}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Input
            label="문제집 제목"
            value={formState.title}
            onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <Input
            label="카테고리"
            value={formState.category}
            onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
          />
          <div className="md:col-span-2">
            <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formState.isPublic}
                onChange={(event) => setFormState((prev) => ({ ...prev, isPublic: event.target.checked }))}
              />
              <span>공개 문제집으로 설정</span>
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-gray-700">문제 목록</h3>
            <p className="mt-1 text-xs text-gray-500">문제집 생성 시 함께 등록할 문제를 검색해 선택하거나 직접 ID를 입력하세요.</p>
          </div>
          <ProblemSelectionSection
            selectedProblems={selectedProblems}
            onAddProblem={handleAddProblem}
            onRemoveProblem={handleRemoveProblem}
            message={selectionMessage}
            onMessageChange={setSelectionMessage}
            helperText="문제집 생성 시 함께 등록할 문제를 검색해 선택하거나 직접 ID를 입력하세요."
            addButtonLabel="문제 추가"
            emptySelectionText="등록할 문제를 추가하세요."
            resetSignal={selectionResetSignal}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">설명</label>
          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
            rows={4}
            value={formState.description}
            onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={loading}>
            문제집 등록
          </Button>
        </div>
      </form>
    </Card>
  );
};

