import React, { FormEvent, useState } from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { adminProblemBulkService } from '../../services/adminProblemBulkService';
import { useProblemSelection } from '../../hooks/useProblemSelection';
import { ProblemSelectionSection } from './ProblemSelectionSection';
import { ProblemRegistrationModal } from '../../features/contribution/components/ProblemRegistrationModal';

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
  const [importStatus, setImportStatus] = useState<string | null>(null);


  const {
    selectedProblems: selectedExportProblems,
    addProblem: addExportProblem,
    removeProblem: removeExportProblem,
  } = useProblemSelection();

  const [exportSelectionMessage, setExportSelectionMessage] = useState<MessageState>({});
  const [exportMessage, setExportMessage] = useState<MessageState>({});
  const [isExporting, setIsExporting] = useState(false);

  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);

  const pollImportStatus = async (pollingKey: string) => {
    try {
      const status = await adminProblemBulkService.getImportPollingStatus(pollingKey);

      if (status.status === 'done') {
        setIsImporting(false);
        setImportMessage({ success: `총 ${status.imported_problem}개의 문제를 처리했습니다.` });
        setImportStatus(null);
        setImportFile(null);
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else if (status.status === 'error') {
        setIsImporting(false);
        setImportStatus(null);
        setImportMessage({ error: status.message || `문제 등록 중 오류가 발생했습니다. 에러코드: ${status.error_code}` });
      } else {
        setImportStatus(`처리 중... (${status.imported_problem} / ${status.all_problem})`);
        setTimeout(() => pollImportStatus(pollingKey), 1000);
      }
    } catch (error) {
      setIsImporting(false);
      setImportStatus(null);
      const message = error instanceof Error ? error.message : '상태 조회 중 오류가 발생했습니다.';
      setImportMessage({ error: message });
    }
  };

  const handleImportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setImportMessage({});
    setImportStatus(null);

    if (!importFile) {
      setImportMessage({ error: '업로드할 ZIP 파일을 선택하세요.' });
      return;
    }

    try {
      setIsImporting(true);
      setImportStatus('업로드 및 분석 중...');
      const result = await adminProblemBulkService.importProblems(importFile);

      if (result.polling_key) {
        setImportStatus('처리 대기 중...');
        pollImportStatus(result.polling_key);
      } else {
        throw new Error('폴링 키를 받지 못했습니다.');
      }
    } catch (error) {
      setIsImporting(false);
      setImportStatus(null);
      const message = error instanceof Error ? error.message : '문제 대량 등록 중 오류가 발생했습니다.';
      setImportMessage({ error: message });
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
        <div>
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 dark:text-slate-100">문제 등록</h2>
              </div>
              <Button onClick={() => setIsProblemModalOpen(true)}>문제 등록</Button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-slate-700 pt-8">
          <form onSubmit={handleImportSubmit} className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 dark:text-slate-100">문제 불러오기</h2>
            </div>

            {importMessage.error && (
              <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{importMessage.error}</div>
            )}
            {importMessage.success && (
              <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-600">{importMessage.success}</div>
            )}
            {importStatus && (
              <div className="rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-600 flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{importStatus}</span>
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <input
                type="file"
                accept=".zip"
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                className="text-sm"
              />
              {importFile && <span className="text-sm text-gray-600 dark:text-slate-400">선택된 파일: {importFile.name}</span>}
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={isImporting} disabled={isImporting}>
                {isImporting ? '처리 중' : '문제 불러오기'}
              </Button>
            </div>
          </form>
        </div>

        <div className="border-t border-gray-200 dark:border-slate-700 pt-8">
          <form onSubmit={handleExportSubmit} className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 dark:text-slate-100">문제 내보내기</h2>
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

            <div className="flex justify-between items-center text-sm text-gray-500 dark:text-slate-400">
              <span>선택된 문제 수: {selectedExportProblems.length}</span>
              <Button type="submit" variant="outline" loading={isExporting}>문제 내보내기</Button>
            </div>
          </form>
        </div>
      </div>

      <ProblemRegistrationModal
        isOpen={isProblemModalOpen}
        onClose={() => setIsProblemModalOpen(false)}
        onSuccess={() => setIsProblemModalOpen(false)}
      />
    </Card>
  );
};

export default BulkProblemManager;
