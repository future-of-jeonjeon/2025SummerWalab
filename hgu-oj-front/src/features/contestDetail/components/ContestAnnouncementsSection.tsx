import React, { useState } from 'react';
import { Card } from '../../../components/atoms/Card';
import { Button } from '../../../components/atoms/Button';
import { formatDateTime } from '../../../utils/date';
import type { AnnouncementManager, ContestAnnouncement } from '../types';
import { ContestAnnouncementModal } from './ContestAnnouncementModal';
import { ContestAnnouncementDetailModal } from './ContestAnnouncementDetailModal';

interface ContestAnnouncementsSectionProps {
  canManage: boolean;
  manager: AnnouncementManager;
  isModalOpen: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
}

export const ContestAnnouncementsSection: React.FC<ContestAnnouncementsSectionProps> = ({
  canManage,
  manager,
  isModalOpen,
  onOpenModal,
  onCloseModal,
}) => {
  const {
    announcements,
    isLoading,
    error,
    deletingAnnouncementId,
    handleEdit,
    handleDelete,
    resetForm,
  } = manager;

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<ContestAnnouncement | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-600">공지사항을 불러오는 중 오류가 발생했습니다.</div>;
  }

  const onEditClick = (e: React.MouseEvent, announcement: ContestAnnouncement) => {
    e.stopPropagation();
    handleEdit(announcement);
    onOpenModal();
  };

  const onDeleteClick = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    handleDelete(id);
  };

  const onNewClick = () => {
    resetForm();
    onOpenModal();
  };

  const onAnnouncementClick = (announcement: ContestAnnouncement) => {
    setSelectedAnnouncement(announcement);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={onNewClick}>새 공지 작성</Button>
        </div>
      )}

      {canManage && (
        <ContestAnnouncementModal
          isOpen={isModalOpen}
          onClose={onCloseModal}
          manager={manager}
        />
      )}

      <ContestAnnouncementDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        announcement={selectedAnnouncement}
      />

      {announcements.length === 0 ? (
        <div className="flex min-h-[120px] items-center justify-center py-6 text-center text-base text-gray-500">
          등록된 공지가 없습니다.
        </div>
      ) : (
        announcements.map((announcement) => {
          const isDeleting = deletingAnnouncementId === announcement.id && canManage;
          return (
            <Card
              key={announcement.id}
              className="p-5 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50"
              onClick={() => onAnnouncementClick(announcement)}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{announcement.title}</h3>
                  <span className="text-xs text-gray-500">{formatDateTime(announcement.createdAt)}</span>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={(e) => onEditClick(e, announcement)}>
                      수정
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={(e) => onDeleteClick(e, announcement.id)}
                      disabled={isDeleting}
                    >
                      삭제
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
};
