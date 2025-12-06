import React from 'react';
import { Button } from '../../../components/atoms/Button';
import { formatDateTime } from '../../../utils/date';
import type { ContestAnnouncement } from '../../../types';

interface ContestAnnouncementDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    announcement: ContestAnnouncement | null;
}

export const ContestAnnouncementDetailModal: React.FC<ContestAnnouncementDetailModalProps> = ({
    isOpen,
    onClose,
    announcement,
}) => {
    if (!isOpen || !announcement) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl dark:bg-slate-800">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <div className="pr-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            {announcement.title}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {formatDateTime(announcement.createdAt)}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        <div dangerouslySetInnerHTML={{ __html: announcement.content }} />
                    </div>
                </div>

                <div className="border-t border-gray-200 px-6 py-4 text-right dark:border-gray-700">
                    <Button onClick={onClose}>닫기</Button>
                </div>
            </div>
        </div>
    );
};
