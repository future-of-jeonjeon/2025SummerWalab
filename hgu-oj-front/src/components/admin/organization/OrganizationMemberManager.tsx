import React, { useMemo, useState } from 'react';
import { Input } from '../../atoms/Input';
import { Button } from '../../atoms/Button';
import { AdminUser, OrganizationMember } from '../../../types';

interface OrganizationMemberManagerProps {
  members?: OrganizationMember[];
  onSearchUsers: (keyword: string) => Promise<AdminUser[]>;
  onAddMember: (userId: number) => Promise<void>;
  onRemoveMember: (userId: number) => Promise<void>;
}

export const OrganizationMemberManager: React.FC<OrganizationMemberManagerProps> = ({
  members = [],
  onSearchUsers,
  onAddMember,
  onRemoveMember,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pendingMemberIds, setPendingMemberIds] = useState<Set<number>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  const memberIdSet = useMemo(() => {
    return new Set((members ?? []).map((member) => member.id));
  }, [members]);

  const handleSearchSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const keyword = searchTerm.trim();
    if (!keyword) {
      setSearchResults([]);
      setSearchError('검색어를 입력해주세요.');
      return;
    }
    setSearchError(null);
    setSearchLoading(true);
    try {
      const results = await onSearchUsers(keyword);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('검색 결과가 없습니다.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '사용자 검색에 실패했습니다.';
      setSearchError(message);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const withPending = async (memberId: number, task: () => Promise<void>) => {
    setPendingMemberIds((prev) => new Set(prev).add(memberId));
    setActionError(null);
    try {
      await task();
    } catch (error) {
      const message = error instanceof Error ? error.message : '요청 처리 중 오류가 발생했습니다.';
      setActionError(message);
    } finally {
      setPendingMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });
    }
  };

  const handleAddMember = async (userId: number) => {
    if (memberIdSet.has(userId)) {
      setActionError('이미 조직 구성원으로 등록된 사용자입니다.');
      return;
    }
    await withPending(userId, () => onAddMember(userId));
  };

  const handleRemoveMember = async (userId: number) => {
    await withPending(userId, () => onRemoveMember(userId));
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">구성원 목록</h3>
        <p className="text-sm text-gray-500 mt-1">조직에 포함된 구성원을 확인하고 관리합니다.</p>
      </div>

      {actionError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {actionError}
        </div>
      )}

      <div className="space-y-3">
        {(members ?? []).length === 0 ? (
          <p className="text-sm text-gray-600">등록된 구성원이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {(members ?? []).map((member) => (
              <li key={member.id} className="flex items-center justify-between px-4 py-3 bg-white">
                <div>
                  <div className="text-sm font-medium text-gray-900">{member.username}</div>
                  <div className="text-xs text-gray-500 space-x-2">
                    {member.realName && <span>{member.realName}</span>}
                    {member.email && <span>{member.email}</span>}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  loading={pendingMemberIds.has(member.id)}
                  onClick={() => handleRemoveMember(member.id)}
                >
                  제거
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-md font-semibold text-gray-900">구성원 추가</h4>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSearchSubmit}>
          <Input
            type="search"
            placeholder="사용자 이름 또는 이메일"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="flex-1"
          />
          <Button type="submit" loading={searchLoading}>
            사용자 검색
          </Button>
        </form>
        {searchError && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {searchError}
          </div>
        )}
        {searchResults.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              검색 결과
            </div>
            <ul className="divide-y divide-gray-200">
              {searchResults.map((user) => {
                const isMember = memberIdSet.has(user.id);
                const loading = pendingMemberIds.has(user.id);
                return (
                  <li key={user.id} className="flex items-center justify-between px-4 py-3 text-sm text-gray-700">
                    <div>
                      <div className="font-medium text-gray-900">{user.username}</div>
                      <div className="text-xs text-gray-500 space-x-2">
                        {user.real_name && <span>{user.real_name}</span>}
                        {user.email && <span>{user.email}</span>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isMember ? 'outline' : 'primary'}
                      disabled={isMember}
                      loading={loading}
                      onClick={() => handleAddMember(user.id)}
                    >
                      {isMember ? '등록됨' : '추가'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
