import React from 'react';
import { Button } from '../../../components/atoms/Button';
import { Input } from '../../../components/atoms/Input';
import type { AnnouncementManager } from '../types';

interface ContestAnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    manager: AnnouncementManager;
}

export const ContestAnnouncementModal: React.FC<ContestAnnouncementModalProps> = ({ isOpen, onClose, manager }) => {
    const {
        formState,
        formError,
        isSaving,
        handleFormSubmit,
        updateFormField,
    } = manager;

    if (!isOpen) return null;

    const isEditing = Boolean(formState.id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex w-full max-w-lg flex-col rounded-lg bg-white shadow-xl dark:bg-slate-800">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {isEditing ? '공지 수정' : '새 공지 작성'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-4">
                        <Input
                            label="제목"
                            value={formState.title}
                            onChange={(e) => updateFormField('title', e.target.value)}
                            placeholder="공지 제목"
                            disabled={isSaving}
                            required
                        />
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">내용</label>
                            <textarea
                                value={formState.content}
                                onChange={(e) => updateFormField('content', e.target.value)}
                                className="min-h-[120px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-slate-700 dark:text-white"
                                placeholder="공지 내용을 입력하세요"
                                disabled={isSaving}
                                required
                            />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input
                                type="checkbox"
                                checked={formState.visible}
                                onChange={(e) => updateFormField('visible', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-slate-700"
                                disabled={isSaving}
                            />
                            공개 상태
                        </label>
                        {formError && <div className="text-sm text-red-600">{formError}</div>}
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
                            취소
                        </Button>
                        <Button type="submit" loading={isSaving}>
                            {isEditing ? '수정' : '등록'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
