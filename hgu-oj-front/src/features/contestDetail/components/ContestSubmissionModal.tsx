import React from 'react';
import type { SubmissionDetail } from '../../../services/submissionService';
import { getJudgeResultLabel } from '../utils/judgeResult';

interface ContestSubmissionModalProps {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  submission: SubmissionDetail | null;
  submittedAt: string;
  onClose: () => void;
}

export const ContestSubmissionModal: React.FC<ContestSubmissionModalProps> = ({ isOpen, loading, error, submission, submittedAt, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-lg font-semibold text-gray-900">제출 코드 보기</h3>
          <button type="button" onClick={onClose} className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200">
            닫기
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 text-sm text-gray-800">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : submission ? (
            <div className="space-y-4">
              <div className="grid gap-2 text-gray-700 sm:grid-cols-2">
                <div>
                  <span className="font-semibold">제출 ID:</span> {submission.id}
                </div>
                <div>
                  <span className="font-semibold">문제 ID:</span> {submission.problem ?? submission.problem_id ?? submission.problemId ?? '-'}
                </div>
                <div>
                  <span className="font-semibold">결과:</span> {getJudgeResultLabel(submission.result ?? submission.status)}
                </div>
                <div>
                  <span className="font-semibold">언어:</span> {submission.language ?? submission.language_name ?? '-'}
                </div>
                <div>
                  <span className="font-semibold">제출 시각:</span> {submittedAt}
                </div>
              </div>
              <div>
                <h4 className="mb-2 font-semibold text-gray-900">소스 코드</h4>
                <pre className="overflow-x-auto rounded-md bg-gray-900 px-4 py-3 text-xs leading-5 text-gray-100">
{submission.code ?? '코드를 불러올 수 없습니다.'}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">제출 정보를 불러오지 못했습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
};
