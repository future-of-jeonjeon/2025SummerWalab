import React from 'react';
import { Card } from '../../../components/atoms/Card';
import { Button } from '../../../components/atoms/Button';
import { formatDateTime } from '../../../utils/date';
import type { AnnouncementManager } from '../types';

interface ContestAnnouncementsSectionProps {
  canManage: boolean;
  manager: AnnouncementManager;
}

export const ContestAnnouncementsSection: React.FC<ContestAnnouncementsSectionProps> = ({ canManage, manager }) => {
  const {
    announcements,
    isLoading,
    error,
    formState,
    formError,
    isSaving,
    deletingAnnouncementId,
    handleFormSubmit,
    handleEdit,
    handleDelete,
    updateFormField,
    resetForm,
  } = manager;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-600">공지사항을 불러오는 중 오류가 발생했습니다.</div>;
  }

  const isEditing = Boolean(formState.id);

  return (
    <div className="space-y-4">
      {canManage && (
        <Card className="border border-blue-200/70 bg-blue-50/70 p-5 dark:border-blue-400/40 dark:bg-blue-900/20 dark:text-blue-100">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-100 mb-3">{isEditing ? '공지 수정' : '새 공지 작성'}</h3>
          <form className="space-y-3" onSubmit={handleFormSubmit}>
            <input
              type="text"
              value={formState.title}
              onChange={(event) => updateFormField('title', event.target.value)}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:border-blue-400/60 dark:bg-slate-900 dark:text-blue-100"
              placeholder="공지 제목"
              disabled={isSaving}
            />
            <textarea
              value={formState.content}
              onChange={(event) => updateFormField('content', event.target.value)}
              className="min-h-[120px] w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-blue-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:border-blue-400/60 dark:bg-slate-900 dark:text-blue-100"
              placeholder="공지 내용을 입력하세요"
              disabled={isSaving}
            />
            <label className="inline-flex items-center gap-2 text-sm text-blue-800 dark:text-blue-100">
              <input
                type="checkbox"
                checked={formState.visible}
                onChange={(event) => updateFormField('visible', event.target.checked)}
                className="h-4 w-4 rounded border-blue-400 text-blue-600 focus:ring-blue-500"
                disabled={isSaving}
              />
              공개 상태
            </label>
            {formError && <div className="text-sm text-red-600">{formError}</div>}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={isSaving}>
                {isEditing ? '공지 수정' : '공지 등록'}
              </Button>
              {isEditing && (
                <Button type="button" variant="ghost" onClick={resetForm} disabled={isSaving}>
                  취소
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}

      {announcements.length === 0 ? (
        <div className="flex min-h-[120px] items-center justify-center py-6 text-center text-base text-gray-500">등록된 공지가 없습니다.</div>
      ) : (
        announcements.map((announcement) => {
          const isDeleting = deletingAnnouncementId === announcement.id && canManage;
          return (
            <Card key={announcement.id} className="p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{announcement.title}</h3>
                  <span className="text-xs text-gray-500">{formatDateTime(announcement.createdAt)}</span>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(announcement)}>
                      수정
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(announcement.id)}
                      disabled={isDeleting}
                    >
                      삭제
                    </Button>
                  </div>
                )}
              </div>
              <div className="prose prose-sm max-w-none text-gray-700">
                <div dangerouslySetInnerHTML={{ __html: announcement.content }} />
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
};
