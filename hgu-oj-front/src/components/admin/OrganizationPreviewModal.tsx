import React from 'react';
import { Button } from '../atoms/Button';
import { OrganizationLogo } from '../atoms/OrganizationLogo';
import type { PendingOrganizationTargetData } from './apply/types';

type OrganizationPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  data?: PendingOrganizationTargetData | null;
};

export const OrganizationPreviewModal: React.FC<OrganizationPreviewModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  const name = data?.name ?? '-';
  const description = data?.description ?? '-';
  const createdAt = data?.created_time ?? data?.created_at ?? null;

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(dateString));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">단체 정보</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:text-slate-400">
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex-shrink-0">
              <OrganizationLogo
                src={data?.img_url ?? null}
                alt={name}
                size="xl"
                className="w-28 h-28"
              />
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">단체명</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">{name}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">설명</p>
                <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-line">{description}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">등록일</p>
                <p className="text-sm text-gray-700 dark:text-slate-200">
                  {createdAt ? formatDate(createdAt) : '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={onClose}>닫기</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
