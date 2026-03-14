import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { PendingResponse, PendingStatus, PendingTargetType } from './apply/types';
import { ProblemRegistrationModal } from '../../features/contribution/components/ProblemRegistrationModal';
import { WorkbookModal } from './WorkbookModal';
import { pendingService } from '../../services/pendingService';
import { OrganizationPreviewModal } from './OrganizationPreviewModal';

type PendingApplyType = 'problem' | 'workbook' | 'organization';

interface PendingApplyManagerProps {
  type: PendingApplyType;
}

const STATUS_LABELS: Record<PendingStatus, string> = {
  IN_PROGRESS: '대기',
  DONE: '승인',
  EXPIRED: '반려',
};

const STATUS_BADGE_CLASSES: Record<PendingStatus, string> = {
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  DONE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-red-100 text-red-800',
};

export const PendingApplyManager: React.FC<PendingApplyManagerProps> = ({ type }) => {
  const [items, setItems] = useState<PendingResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedApply, setSelectedApply] = useState<PendingResponse | null>(null);
  const [previewTarget, setPreviewTarget] = useState<PendingResponse | null>(null);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

  const pageTitle =
    type === 'problem'
      ? '문제 신청 목록'
      : (type === 'workbook' ? '문제집 신청 목록' : '단체 신청 목록');
  const titleColumnLabel =
    type === 'problem'
      ? '문제명'
      : (type === 'workbook' ? '문제집명' : '단체명');
  const emptyText =
    type === 'problem'
      ? '대기 중인 문제 신청이 없습니다.'
      : (type === 'workbook' ? '대기 중인 문제집 신청이 없습니다.' : '대기 중인 단체 신청이 없습니다.');

  const targetType: PendingTargetType = useMemo(
    () => (type === 'problem' ? 'PROBLEM' : (type === 'workbook' ? 'WORKBOOK' : 'Organization')),
    [type],
  );

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pendingService.getPending({ targetType, page: 1, size: 20 });
      setItems(data.items);
    } catch (err) {
      setError('신청 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [targetType]);

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(dateString));
  };

  const getEntityLabel = () => {
    if (type === 'problem') return '문제';
    if (type === 'workbook') return '문제집';
    return '단체';
  };

  const getDisplayTitle = (item: PendingResponse) => {
    if (item.title && item.title.length > 0) return item.title;
    if (item.target_data && 'title' in item.target_data && item.target_data.title) return item.target_data.title;
    if (item.target_data && 'name' in item.target_data && item.target_data.name) return item.target_data.name;
    return '-';
  };

  const handleAction = (targetId: number, title: string, status: PendingStatus) => {
    void (async () => {
    const actionText = status === 'DONE' ? '승인' : '반려';

    if (!window.confirm(`${title} ${getEntityLabel()} 신청을 ${actionText}하시겠습니까?`)) return;

    const target = items.find((item) => item.target_id === targetId);
    const pendingId = target?.pending_id ?? target?.id;
    if (!pendingId) {
      alert('해당 신청의 ID를 찾지 못해 처리할 수 없습니다.');
      return;
    }

    try {
      setActionLoading(true);
      await pendingService.processPending(pendingId, status);
      setSelectedApply(null);
      await fetchItems();
      alert(`성공적으로 ${actionText}되었습니다.`);
    } catch (err) {
      alert('처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
    })();
  };

  const handleOpenTargetModal = (item: PendingResponse) => {
    setPreviewTarget(item);
    setIsTargetModalOpen(true);
    setSelectedApply(null);
  };

  const getRegisteredAt = (item: PendingResponse) => {
    if (item.target_data && 'create_time' in item.target_data && item.target_data.create_time) return item.target_data.create_time;
    if (item.target_data && 'created_at' in item.target_data && item.target_data.created_at) return item.target_data.created_at;
    return null;
  };

  return (
    <Card padding="lg">
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{pageTitle}</h2>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">신청자</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">{titleColumnLabel}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">신청일자</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                    로딩 중...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-red-600">
                    {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={`${item.target_type}-${item.target_id}`}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    onClick={() => setSelectedApply(item)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">{item.created_user_data.name ?? item.created_user_data.username ?? '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#113F67]">{getDisplayTitle(item)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                      {getRegisteredAt(item) ? formatDate(getRegisteredAt(item) as string) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[item.status]}`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2" onClick={(e) => e.stopPropagation()}>
                      {item.status === 'IN_PROGRESS' && (
                        <>
                          <Button
                            size="sm"
                            loading={actionLoading}
                            onClick={() => handleAction(item.target_id, getDisplayTitle(item), 'DONE')}
                          >
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            loading={actionLoading}
                            onClick={() => handleAction(item.target_id, getDisplayTitle(item), 'EXPIRED')}
                          >
                            반려
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" padding="lg">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="text-xl font-bold text-[#113F67]">
                  {type === 'problem' ? '문제 신청 상세 정보' : (type === 'workbook' ? '문제집 신청 상세 정보' : '단체 신청 상세 정보')}
                </h3>
                <button
                  onClick={() => setSelectedApply(null)}
                  className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">신청자</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{selectedApply.created_user_data.name ?? selectedApply.created_user_data.username ?? '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">상태</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{STATUS_LABELS[selectedApply.status]}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">{titleColumnLabel}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{getDisplayTitle(selectedApply)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">신청 일시</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    {getRegisteredAt(selectedApply) ? formatDate(getRegisteredAt(selectedApply) as string) : '-'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t font-semibold">
                <Button
                  variant="outline"
                  onClick={() => handleOpenTargetModal(selectedApply)}
                >
                  정보 보기
                </Button>
                {selectedApply.status === 'IN_PROGRESS' && (
                  <>
                    <Button
                      variant="outline"
                      loading={actionLoading}
                      onClick={() => handleAction(selectedApply.target_id, getDisplayTitle(selectedApply), 'EXPIRED')}
                    >
                      반려하기
                    </Button>
                    <Button
                      loading={actionLoading}
                      onClick={() => handleAction(selectedApply.target_id, getDisplayTitle(selectedApply), 'DONE')}
                    >
                      승인하기
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {type === 'problem' && previewTarget && (
        <ProblemRegistrationModal
          isOpen={isTargetModalOpen}
          onClose={() => setIsTargetModalOpen(false)}
          onSuccess={() => {}}
          editProblemId={previewTarget.target_id}
          readOnly
        />
      )}

      {type === 'workbook' && previewTarget && (
        <WorkbookModal
          isOpen={isTargetModalOpen}
          onClose={() => setIsTargetModalOpen(false)}
          mode="edit"
          workbookId={previewTarget.target_id}
          onSuccess={() => {}}
          readOnly
        />
      )}

      {type === 'organization' && previewTarget && (
        <OrganizationPreviewModal
          isOpen={isTargetModalOpen}
          onClose={() => setIsTargetModalOpen(false)}
          data={previewTarget.target_data}
        />
      )}
    </Card>
  );
};
