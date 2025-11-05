import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { OrganizationForm, OrganizationFormValues } from './OrganizationForm';
import { OrganizationMemberManager } from './OrganizationMemberManager';
import { organizationService } from '../../../services/organizationService';
import { adminService } from '../../../services/adminService';
import { Organization } from '../../../types';

const PAGE_SIZE = 20;

const normalize = (value?: string | null) => (value ?? '').trim();

const useFilteredOrganizations = (items: Organization[] = [], query: string) => {
  return useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return items;
    }
    return items.filter((organization) => {
      const name = (organization.name ?? '').toLowerCase();
      const description = (organization.description ?? '').toLowerCase();
      return name.includes(keyword) || description.includes(keyword);
    });
  }, [items, query]);
};

export const OrganizationAdminSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: listData,
    isLoading: isListLoading,
    isFetching: isListFetching,
    error: listError,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['admin', 'organizations', { page }],
    queryFn: ({ signal }) => organizationService.list({ page, size: PAGE_SIZE }, { signal }),
    keepPreviousData: true,
  });

  const organizations = useFilteredOrganizations(listData?.items ?? [], search);

  useEffect(() => {
    if (organizations.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId === null || !organizations.some((item) => item.id === selectedId)) {
      setSelectedId(organizations[0].id);
    }
  }, [organizations, selectedId]);

  const {
    data: selectedOrganization,
    isLoading: isDetailLoading,
    error: detailError,
  } = useQuery({
    queryKey: ['admin', 'organizations', 'detail', selectedId],
    enabled: selectedId !== null,
    queryFn: ({ signal }) => organizationService.get(selectedId!, { signal }),
  });

  const createMutation = useMutation({
    mutationFn: (values: OrganizationFormValues) => organizationService.create(values),
    onSuccess: (organization: Organization) => {
      setFeedbackMessage('조직이 생성되었습니다.');
      setFormError(null);
      setShowCreate(false);
      setSelectedId(organization.id);
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '조직 생성에 실패했습니다.';
      setFormError(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: OrganizationFormValues) =>
      organizationService.update(selectedId!, values),
    onSuccess: (organization: Organization) => {
      setFeedbackMessage('조직 정보가 저장되었습니다.');
      queryClient.setQueryData<Organization>(['admin', 'organizations', 'detail', organization.id], organization);
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '조직 정보 저장에 실패했습니다.';
      setFeedbackMessage(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (organizationId: number) => organizationService.remove(organizationId),
    onSuccess: () => {
      setFeedbackMessage('조직이 삭제되었습니다.');
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (userId: number) => organizationService.addMember(selectedId!, userId),
    onSuccess: (organization: Organization) => {
      setFeedbackMessage('구성원이 추가되었습니다.');
      queryClient.setQueryData<Organization>(['admin', 'organizations', 'detail', organization.id], organization);
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '구성원 추가에 실패했습니다.';
      setFeedbackMessage(message);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => organizationService.removeMember(selectedId!, userId),
    onSuccess: (organization: Organization) => {
      setFeedbackMessage('구성원 정보가 업데이트되었습니다.');
      queryClient.setQueryData<Organization>(['admin', 'organizations', 'detail', organization.id], organization);
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '구성원 제거에 실패했습니다.';
      setFeedbackMessage(message);
    },
  });

  const handleCreateSubmit = async (values: OrganizationFormValues) => {
    await createMutation.mutateAsync(values);
  };

  const handleUpdateSubmit = async (values: OrganizationFormValues) => {
    if (!selectedId) return;
    await updateMutation.mutateAsync(values);
  };

  const handleDeleteOrganization = async () => {
    if (!selectedId) return;
    if (!window.confirm('선택한 조직을 삭제하시겠습니까? 구성원 정보도 함께 제거됩니다.')) {
      return;
    }
    await deleteMutation.mutateAsync(selectedId);
  };

  const handleUserSearch = async (keyword: string) => {
    const response = await adminService.getUsers({ keyword, page: 1, limit: 10 });
    return response.results;
  };

  const totalPages = useMemo(() => {
    if (!listData) {
      return 1;
    }
    const pageSize = listData.size || PAGE_SIZE;
    const total = listData.total || listData.items.length;
    if (pageSize <= 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(total / pageSize));
  }, [listData]);

  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const handleSelectOrganization = (organizationId: number) => {
    setSelectedId(organizationId);
    setFeedbackMessage(null);
  };

  return (
    <Card padding="lg" className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">조직 관리</h2>
          <p className="text-sm text-gray-600">
            마이크로 서비스 조직 데이터를 기반으로 조직 목록 조회, 생성, 수정 및 구성원 관리를 진행합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetchList()} loading={isListFetching}>
            새로고침
          </Button>
          <Button variant={showCreate ? 'secondary' : 'primary'} onClick={() => setShowCreate((prev) => !prev)}>
            {showCreate ? '생성 폼 닫기' : '새 조직 생성'}
          </Button>
        </div>
      </div>

      {feedbackMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedbackMessage}
        </div>
      )}

      {listError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>
            {(listError as Error)?.message ?? '조직 목록을 불러오는 중 오류가 발생했습니다.'}
          </span>
          <Button variant="outline" size="sm" onClick={() => refetchList()}>
            다시 시도
          </Button>
        </div>
      )}

      {showCreate && (
        <Card padding="lg" className="space-y-4 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900">새 조직 등록</h3>
          <OrganizationForm
            onSubmit={handleCreateSubmit}
            loading={createMutation.isPending}
            errorMessage={formError}
            submitLabel="조직 생성"
            onCancel={() => setShowCreate(false)}
          />
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <div className="space-y-4">
          <Card padding="md" className="space-y-4">
            <Input
              type="search"
              placeholder="조직 이름 또는 설명 검색"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="overflow-hidden border border-gray-200 rounded-md">
              <ul className="divide-y divide-gray-200 max-h-[480px] overflow-auto bg-white">
                {isListLoading ? (
                  <li className="px-4 py-6 text-sm text-gray-500 text-center">
                    조직 목록을 불러오는 중입니다...
                  </li>
                ) : organizations.length === 0 ? (
                  <li className="px-4 py-6 text-sm text-gray-500 text-center">
                    표시할 조직이 없습니다.
                  </li>
                ) : (
                  organizations.map((organization) => {
                    const isActive = organization.id === selectedId;
                    return (
                      <li key={organization.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectOrganization(organization.id)}
                          className={`w-full px-4 py-4 text-left transition-colors ${
                            isActive ? 'bg-blue-100 border-l-4 border-blue-500' : 'hover:bg-blue-50'
                          }`}
                        >
                          <div className="text-sm font-semibold text-gray-900">{organization.name}</div>
                          <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                            {normalize(organization.description) || '설명 없음'}
                          </div>
                          <div className="mt-2 text-[11px] text-gray-400">
                            구성원 {organization.members?.length ?? 0}명
                          </div>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                페이지 {page} / {totalPages} {isListFetching && <span className="ml-2 text-xs text-gray-400">(새로고침 중)</span>}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canGoPrev}
                  onClick={() => canGoPrev && setPage((prev) => Math.max(1, prev - 1))}
                >
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canGoNext}
                  onClick={() => canGoNext && setPage((prev) => prev + 1)}
                >
                  다음
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {!selectedId ? (
            <Card padding="lg" className="text-center text-sm text-gray-600">
              오른쪽 목록에서 조직을 선택하면 상세 정보를 확인하고 수정할 수 있습니다.
            </Card>
          ) : detailError ? (
            <Card padding="lg" className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">조직 정보를 불러오지 못했습니다.</h3>
              <p className="text-sm text-gray-600">
                {(detailError as Error)?.message ?? '네트워크 상태를 확인하고 다시 시도해주세요.'}
              </p>
              <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'organizations', 'detail', selectedId] })}>
                다시 시도
              </Button>
            </Card>
          ) : isDetailLoading || !selectedOrganization ? (
            <Card padding="lg" className="text-sm text-gray-600">
              조직 정보를 불러오는 중입니다...
            </Card>
          ) : (
            <>
              <Card padding="lg" className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedOrganization.name}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      생성일{' '}
                      {selectedOrganization.createdAt
                        ? new Date(selectedOrganization.createdAt).toLocaleString()
                        : '-'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={handleDeleteOrganization}
                    loading={deleteMutation.isPending}
                  >
                    조직 삭제
                  </Button>
                </div>

                <OrganizationForm
                  initialValues={{
                    name: selectedOrganization.name,
                    description: selectedOrganization.description ?? undefined,
                  }}
                  onSubmit={handleUpdateSubmit}
                  loading={updateMutation.isPending}
                  errorMessage={(updateMutation.error as Error)?.message}
                  submitLabel="조직 정보 저장"
                />
              </Card>

              <Card padding="lg">
                <OrganizationMemberManager
                  members={selectedOrganization.members}
                  onSearchUsers={handleUserSearch}
                  onAddMember={(userId) => addMemberMutation.mutateAsync(userId)}
                  onRemoveMember={(userId) => removeMemberMutation.mutateAsync(userId)}
                />
              </Card>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default OrganizationAdminSection;
