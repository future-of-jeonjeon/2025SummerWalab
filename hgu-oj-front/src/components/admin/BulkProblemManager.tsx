import React, { FormEvent, useState } from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { adminProblemBulkService } from '../../services/adminProblemBulkService';
import { useProblemSelection } from '../../hooks/useProblemSelection';
import { ProblemSelectionSection } from './ProblemSelectionSection';

type MessageState = {
  error?: string;
  success?: string;
};

const buildDefaultExportFilename = () => {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.-]/g, '')
    .slice(0, 15);
  return `problem-export-${timestamp}.zip`;
};

const triggerDownload = (blob: Blob, filename?: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename && filename.trim().length > 0 ? filename : buildDefaultExportFilename();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
};

export const BulkProblemManager: React.FC = () => {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMessage, setImportMessage] = useState<MessageState>({});
  const [isImporting, setIsImporting] = useState(false);

  const {
    selectedProblems: selectedExportProblems,
    addProblem: addExportProblem,
    removeProblem: removeExportProblem,
  } = useProblemSelection();

  const [exportSelectionMessage, setExportSelectionMessage] = useState<MessageState>({});
  const [exportMessage, setExportMessage] = useState<MessageState>({});
  const [isExporting, setIsExporting] = useState(false);

  const handleImportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setImportMessage({});

    if (!importFile) {
      setImportMessage({ error: '업로드할 ZIP 파일을 선택하세요.' });
      return;
    }

    try {
      setIsImporting(true);
      const result = await adminProblemBulkService.importProblems(importFile);
      const count = typeof result?.import_count === 'number' ? result.import_count : 0;
      setImportMessage({ success: `총 ${count}개의 문제를 처리했습니다.` });
      setImportFile(null);
      const fileInput = event.currentTarget.querySelector('input[type="file"]') as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제 대량 등록 중 오류가 발생했습니다.';
      setImportMessage({ error: message });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setExportMessage({});

    if (selectedExportProblems.length === 0) {
      setExportMessage({ error: '내보낼 문제를 선택하세요.' });
      return;
    }

    const problemIds = selectedExportProblems.map((problem) => problem.id);

    try {
      setIsExporting(true);
      const result = await adminProblemBulkService.exportProblems(problemIds);
      triggerDownload(result.blob, result.filename);
      setExportSelectionMessage({});
      setExportMessage({ success: `문제 ${problemIds.length}개를 내보냈습니다.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : '문제 내보내기 중 오류가 발생했습니다.';
      setExportMessage({ error: message });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card padding="lg">
      <div className="space-y-8">
        <form onSubmit={handleImportSubmit} className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900">문제 대량 등록</h2>
            <p className="text-sm text-gray-500">OJ 백엔드 JSON ZIP 포맷을 업로드하여 여러 문제를 한 번에 등록합니다.</p>
          </div>

          {importMessage.error && (
            <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{importMessage.error}</div>
          )}
          {importMessage.success && (
            <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-600">{importMessage.success}</div>
          )}

          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <input
              type="file"
              accept=".zip"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
              className="text-sm"
            />
            {importFile && <span className="text-sm text-gray-600">선택된 파일: {importFile.name}</span>}
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={isImporting}>대량 등록</Button>
          </div>
        </form>

        <div className="border-t border-gray-200 pt-8">
          <form onSubmit={handleExportSubmit} className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-gray-900">문제 내보내기</h2>
              <p className="text-sm text-gray-500">
                내보낼 문제의 내부 ID를 쉼표 또는 줄바꿈으로 구분해 입력하면 ZIP 파일로 다운로드됩니다.
              </p>
            </div>

            {exportMessage.error && (
              <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{exportMessage.error}</div>
            )}
            {exportMessage.success && (
              <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-600">{exportMessage.success}</div>
            )}

            <ProblemSelectionSection
              selectedProblems={selectedExportProblems}
              onAddProblem={addExportProblem}
              onRemoveProblem={removeExportProblem}
              message={exportSelectionMessage}
              onMessageChange={setExportSelectionMessage}
              helperText="내보낼 문제를 검색해 선택하면 아래 목록에 추가됩니다."
              addButtonLabel="문제 추가"
              emptySelectionText="내보낼 문제를 추가하세요."
            />

            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>선택된 문제 수: {selectedExportProblems.length}</span>
              <Button type="submit" variant="outline" loading={isExporting}>문제 내보내기</Button>
            </div>
          </form>
        </div>
      </div>
    </Card>
  );
};

export default BulkProblemManager;
