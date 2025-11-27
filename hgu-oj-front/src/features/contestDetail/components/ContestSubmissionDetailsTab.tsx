import React from 'react';
import type { SubmissionGroup } from '../hooks/useContestSubmissionDetails';
import { formatDateTime } from '../../../utils/date';
import { getJudgeResultLabel } from '../utils/judgeResult';

interface ContestSubmissionDetailsTabProps {
  isAdminUser: boolean;
  submissionGroups: SubmissionGroup[];
  submissionsLoading: boolean;
  submissionsError: unknown;
  onSubmissionClick: (submissionId: number | string | undefined) => void;
}

export const ContestSubmissionDetailsTab: React.FC<ContestSubmissionDetailsTabProps> = ({
  isAdminUser,
  submissionGroups,
  submissionsLoading,
  submissionsError,
  onSubmissionClick,
}) => {
  if (!isAdminUser) {
    return <div className="text-sm text-gray-600">관리자만 제출 상세정보를 확인할 수 있습니다.</div>;
  }

  if (submissionsLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (submissionsError) {
    return <div className="text-sm text-red-600">제출 목록을 불러오는 중 오류가 발생했습니다.</div>;
  }

  if (!submissionGroups.length) {
    return <div className="text-sm text-gray-600">제출 기록이 없습니다.</div>;
  }

  return (
    <div className="space-y-6">
      {submissionGroups.map((group) => (
        <div key={group.userId} className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-lg font-semibold text-gray-800">{group.username ?? `User ${group.userId}`}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-gray-600">제출 ID</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">문제 ID</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">결과</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">언어</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">제출 시각</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">코드</th>
                </tr>
              </thead>
              <tbody>
                {group.submissions
                  .slice()
                  .sort((a, b) => {
                    const ta = new Date((a.create_time ?? a.createTime) || 0).getTime();
                    const tb = new Date((b.create_time ?? b.createTime) || 0).getTime();
                    return ta - tb;
                  })
                  .map((submission) => {
                    const submissionId = submission.id ?? submission.submissionId;
                    const problemId = submission.problem_id ?? submission.problemId ?? submission.problem ?? '-';
                    const language = submission.language ?? submission.language_name ?? '-';
                    const submittedAt = submission.create_time ?? submission.createTime ?? '';
                    const statusValue = submission.result ?? submission.status;
                    const resultLabel = getJudgeResultLabel(statusValue);
                    return (
                      <tr key={String(submissionId)} className="border-b border-gray-200">
                        <td className="px-3 py-2 text-gray-700">{submissionId}</td>
                        <td className="px-3 py-2 text-gray-700">{problemId}</td>
                        <td className="px-3 py-2 text-gray-700">{resultLabel}</td>
                        <td className="px-3 py-2 text-gray-700">{language}</td>
                        <td className="px-3 py-2 text-gray-700">{submittedAt ? formatDateTime(submittedAt) : '-'}</td>
                        <td className="px-3 py-2 text-gray-700">
                          <button
                            type="button"
                            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                            onClick={(event) => {
                              event.preventDefault();
                              onSubmissionClick(submissionId);
                            }}
                          >
                            소스 보기
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};
