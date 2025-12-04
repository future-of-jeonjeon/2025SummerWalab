import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { adminService, CreateContestPayload } from '../../services/adminService';
import { Problem } from '../../types';
import { normalizeProblemKey } from '../../lib/problemKey';
import { contestUserService } from '../../services/contestUserService';

type ContestFormState = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  ruleType: 'ACM' | 'OI';
  password: string;
  visible: boolean;
  realTimeRank: boolean;
  allowedIpRanges: string;
  requiresApproval: boolean;
};

type ContestAnnouncementDraft = {
  title: string;
  content: string;
  visible: boolean;
};

const initialContestForm: ContestFormState = {
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  ruleType: 'ACM',
  password: '',
  visible: true,
  realTimeRank: true,
  allowedIpRanges: '',
  requiresApproval: false,
};

export const ContestCreateSection: React.FC = () => {
  const [contestForm, setContestForm] = useState<ContestFormState>(initialContestForm);
  const [contestLoading, setContestLoading] = useState(false);
  const [contestMessage, setContestMessage] = useState<{ success?: string; error?: string }>({});
  const [contestFormProblems, setContestFormProblems] = useState<Array<{ problem: Problem; displayId: string }>>([]);
  const [contestFormProblemInput, setContestFormProblemInput] = useState('');
  const [contestFormProblemDisplayId, setContestFormProblemDisplayId] = useState('');
  const [contestFormProblemSearch, setContestFormProblemSearch] = useState<{
    results: Problem[];
    loading: boolean;
    error: string | null;
  }>({ results: [], loading: false, error: null });
  const contestFormProblemSearchTimerRef = useRef<number | null>(null);
  const [contestFormProblemSelected, setContestFormProblemSelected] = useState<Problem | null>(null);
  const [contestFormProblemMessage, setContestFormProblemMessage] = useState<{ success?: string; error?: string }>({});
  const [contestFormAnnouncements, setContestFormAnnouncements] = useState<ContestAnnouncementDraft[]>([]);
  const [contestFormAnnouncementDraft, setContestFormAnnouncementDraft] = useState<ContestAnnouncementDraft>({
    title: '',
    content: '',
    visible: true,
  });
  const [contestFormAnnouncementMessage, setContestFormAnnouncementMessage] = useState<{ success?: string; error?: string }>({});

  useEffect(() => {
    return () => {
      if (contestFormProblemSearchTimerRef.current) {
        window.clearTimeout(contestFormProblemSearchTimerRef.current);
        contestFormProblemSearchTimerRef.current = null;
      }
    };
  }, []);

  const scheduleContestFormProblemSearch = useCallback(
    (keyword: string) => {
      if (contestFormProblemSearchTimerRef.current) {
        window.clearTimeout(contestFormProblemSearchTimerRef.current);
      }

      const trimmed = keyword.trim();
      if (!trimmed) {
        setContestFormProblemSearch({ results: [], loading: false, error: null });
        contestFormProblemSearchTimerRef.current = null;
        return;
      }

      contestFormProblemSearchTimerRef.current = window.setTimeout(async () => {
        setContestFormProblemSearch({ results: [], loading: true, error: null });
        try {
          const results = await adminService.searchAdminProblems({ keyword: trimmed, limit: 20, offset: 0 });
          const usedDisplayIds = new Set(
            contestFormProblems
              .map((item) => item.displayId.trim().toLowerCase())
              .filter((value) => value.length > 0),
          );
          const usedIds = new Set(contestFormProblems.map((item) => item.problem.id));
          const filtered = results.filter((problem) => {
            if (typeof problem.id === 'number' && usedIds.has(problem.id)) {
              return false;
            }
            const displayId = problem.displayId ? problem.displayId.toLowerCase() : '';
            if (!displayId) {
              return true;
            }
            return !usedDisplayIds.has(displayId);
          });
          setContestFormProblemSearch({ results: filtered, loading: false, error: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : '문제를 검색하지 못했습니다.';
          setContestFormProblemSearch({ results: [], loading: false, error: message });
        } finally {
          if (contestFormProblemSearchTimerRef.current) {
            window.clearTimeout(contestFormProblemSearchTimerRef.current);
            contestFormProblemSearchTimerRef.current = null;
          }
        }
      }, 300);
    },
    [contestFormProblems],
  );

  const handleContestFormProblemInputChange = (value: string) => {
    setContestFormProblemInput(value);
    setContestFormProblemSelected(null);
    setContestFormProblemMessage({});
    scheduleContestFormProblemSearch(value);
  };

  const handleContestFormProblemDisplayIdChange = (value: string) => {
    setContestFormProblemDisplayId(value);
    setContestFormProblemMessage({});
  };

  const handleContestAnnouncementDraftChange = (updates: Partial<ContestAnnouncementDraft>) => {
    setContestFormAnnouncementDraft((prev) => ({ ...prev, ...updates }));
    setContestFormAnnouncementMessage({});
  };

  const handleSelectContestFormProblemSuggestion = (problem: Problem) => {
    setContestFormProblemSelected(problem);
    const label = problem.displayId ?? String(problem.id);
    setContestFormProblemInput(label);
    setContestFormProblemDisplayId(label);
    setContestFormProblemSearch({ results: [], loading: false, error: null });
    setContestFormProblemMessage({});
    if (contestFormProblemSearchTimerRef.current) {
      window.clearTimeout(contestFormProblemSearchTimerRef.current);
      contestFormProblemSearchTimerRef.current = null;
    }
  };

  const tryAddContestFormProblem = async (): Promise<boolean> => {
    const trimmedQuery = contestFormProblemInput.trim();
    let targetProblem = contestFormProblemSelected;

    if (!targetProblem) {
      if (!trimmedQuery) {
        setContestFormProblemMessage({ error: '추가할 문제를 검색해 선택하세요.' });
        return false;
      }

      const lowered = trimmedQuery.toLowerCase();
      const inMemory = contestFormProblemSearch.results.find((problem) => {
        if (typeof problem.id === 'number' && String(problem.id) === trimmedQuery) {
          return true;
        }
        return normalizeProblemKey(problem) === lowered;
      });

      if (inMemory) {
        targetProblem = inMemory;
      } else {
        try {
          const fetched = await adminService.searchAdminProblems({ keyword: trimmedQuery, limit: 1, offset: 0 });
          targetProblem = fetched[0];
        } catch (error) {
          const message = error instanceof Error ? error.message : '문제를 검색하지 못했습니다.';
          setContestFormProblemMessage({ error: message });
          return false;
        }
      }
    }

    if (!targetProblem) {
      setContestFormProblemMessage({ error: '해당 문제를 찾지 못했습니다.' });
      return false;
    }

    const resolvedProblem = targetProblem;

    if (!contestFormProblemSelected) {
      setContestFormProblemSelected(resolvedProblem);
    }

    const normalizedDisplayId = (contestFormProblemDisplayId.trim() || resolvedProblem.displayId || String(resolvedProblem.id)).trim();
    if (!normalizedDisplayId) {
      setContestFormProblemMessage({ error: '표시 ID를 입력하세요.' });
      return false;
    }

    const normalizedKey = normalizedDisplayId.toLowerCase();
    const duplicate = contestFormProblems.some((item) => {
      if (item.problem.id === resolvedProblem.id) {
        return true;
      }
      return item.displayId.trim().toLowerCase() === normalizedKey;
    });

    if (duplicate) {
      setContestFormProblemMessage({ error: `표시 ID ${normalizedDisplayId}는 이미 추가되어 있습니다.` });
      return false;
    }

    setContestFormProblems((prev) => [...prev, { problem: resolvedProblem, displayId: normalizedDisplayId }]);
    setContestFormProblemInput('');
    setContestFormProblemDisplayId('');
    setContestFormProblemSelected(null);
    setContestFormProblemSearch({ results: [], loading: false, error: null });
    setContestFormProblemMessage({ success: `문제 ${normalizedDisplayId}을(를) 추가했습니다.` });
    return true;
  };

  const handleAddContestFormProblem = async () => {
    await tryAddContestFormProblem();
  };

  const handleRemoveContestFormProblem = (problemId: number) => {
    setContestFormProblems((prev) => prev.filter((item) => item.problem.id !== problemId));
  };

  const handleAddContestAnnouncement = () => {
    const title = contestFormAnnouncementDraft.title.trim();
    const content = contestFormAnnouncementDraft.content.trim();
    if (!title || !content) {
      setContestFormAnnouncementMessage({ error: '공지 제목과 내용을 모두 입력하세요.' });
      return;
    }
    setContestFormAnnouncements((prev) => [...prev, { title, content, visible: contestFormAnnouncementDraft.visible }]);
    setContestFormAnnouncementDraft({ title: '', content: '', visible: true });
    setContestFormAnnouncementMessage({ success: '공지를 임시 목록에 추가했습니다.' });
  };

  const handleRemoveContestAnnouncement = (index: number) => {
    setContestFormAnnouncements((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleContestSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setContestMessage({});

    if (!contestForm.startTime || !contestForm.endTime) {
      setContestMessage({ error: '대회 시작/종료 시간을 모두 입력하세요.' });
      return;
    }

    const start = new Date(contestForm.startTime);
    const end = new Date(contestForm.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setContestMessage({ error: '유효한 날짜와 시간을 입력하세요.' });
      return;
    }

    const allowedIpRanges = contestForm.allowedIpRanges
      .split(/[\n,]+/)
      .map((ip) => ip.trim())
      .filter((ip) => ip.length > 0);

    const payload: CreateContestPayload = {
      title: contestForm.title.trim(),
      description: contestForm.description,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      rule_type: contestForm.ruleType,
      password: contestForm.password,
      visible: contestForm.visible,
      real_time_rank: contestForm.realTimeRank,
      allowed_ip_ranges: allowedIpRanges,
      requires_approval: contestForm.requiresApproval,
    };

    try {
      setContestLoading(true);
      const created = await adminService.createContest(payload);
      if (created?.id) {
        try {
          await contestUserService.setPolicy(created.id, contestForm.requiresApproval);
        } catch {
          // 정책 저장 실패 시에도 대회 생성은 유지
          setContestMessage((prev) => ({
            ...prev,
            error: '대회는 생성됐지만 참여 승인 설정을 저장하지 못했습니다. 관리자에서 다시 시도해주세요.',
          }));
        }
      }

      let problemError: string | undefined;
      let announcementError: string | undefined;
      if (created?.id && contestFormProblems.length > 0) {
        const failures: string[] = [];
        for (const item of contestFormProblems) {
          try {
            await adminService.addContestProblemFromPublic(created.id, item.problem.id, item.displayId);
          } catch (error) {
            const message = error instanceof Error ? error.message : '문제를 추가하지 못했습니다.';
            failures.push(`${item.displayId}: ${message}`);
          }
        }
        if (failures.length > 0) {
          problemError = failures.join('\n');
        }
      }

      if (created?.id && contestFormAnnouncements.length > 0) {
        const announcementFailures: string[] = [];
        for (const announcement of contestFormAnnouncements) {
          try {
            await adminService.createContestAnnouncement({
              contestId: created.id,
              title: announcement.title,
              content: announcement.content,
              visible: announcement.visible,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : '공지를 등록하지 못했습니다.';
            announcementFailures.push(`${announcement.title}: ${message}`);
          }
        }
        if (announcementFailures.length > 0) {
          announcementError = announcementFailures.join('\n');
        }
      }

      if (problemError || announcementError) {
        const combinedError = [problemError, announcementError].filter(Boolean).join('\n');
        setContestMessage({
          success: `대회(ID: ${created?.id})를 생성했지만 일부 항목 처리에 실패했습니다.`,
          error: combinedError,
        });
      } else {
        setContestMessage({ success: `대회(ID: ${created?.id})가 등록되었습니다.` });
      }

      setContestForm(initialContestForm);
      setContestFormProblems([]);
      setContestFormAnnouncements([]);
      setContestFormAnnouncementDraft({ title: '', content: '', visible: true });
      setContestFormAnnouncementMessage({});
      setContestFormProblemInput('');
      setContestFormProblemDisplayId('');
      setContestFormProblemSelected(null);
      setContestFormProblemSearch({ results: [], loading: false, error: null });
      setContestFormProblemMessage({});
    } catch (error) {
      const message = error instanceof Error ? error.message : '대회 등록 중 오류가 발생했습니다.';
      setContestMessage({ error: message });
    } finally {
      setContestLoading(false);
    }
  };

  return (
    <Card padding="lg">
      <form onSubmit={handleContestSubmit} className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-gray-900">대회 등록</h2>
          <p className="text-sm text-gray-500">대회 기본 정보를 입력한 뒤 등록할 수 있습니다.</p>
        </div>

        {contestMessage.error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600 whitespace-pre-line">{contestMessage.error}</div>}
        {contestMessage.success && <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-600">{contestMessage.success}</div>}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Input
            label="대회 제목"
            value={contestForm.title}
            onChange={(event) => setContestForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <Input
            label="대회 비밀번호 (선택)"
            value={contestForm.password}
            onChange={(event) => setContestForm((prev) => ({ ...prev, password: event.target.value }))}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">시작 시간</label>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
              value={contestForm.startTime}
              onChange={(event) => setContestForm((prev) => ({ ...prev, startTime: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">종료 시간</label>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
              value={contestForm.endTime}
              onChange={(event) => setContestForm((prev) => ({ ...prev, endTime: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">룰 타입</label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
              value={contestForm.ruleType}
              onChange={(event) => setContestForm((prev) => ({ ...prev, ruleType: event.target.value as ContestFormState['ruleType'] }))}
            >
              <option value="ACM">ACM</option>
              <option value="OI">OI</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">표시 설정</label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={contestForm.visible}
                  onChange={(event) => setContestForm((prev) => ({ ...prev, visible: event.target.checked }))}
                />
                <span>공개</span>
              </label>
              <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={contestForm.realTimeRank}
                  onChange={(event) => setContestForm((prev) => ({ ...prev, realTimeRank: event.target.checked }))}
                />
                <span>실시간 랭크</span>
              </label>
              <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={contestForm.requiresApproval}
                  onChange={(event) => setContestForm((prev) => ({ ...prev, requiresApproval: event.target.checked }))}
                />
                <span>참여 승인 필요</span>
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">대회 설명</label>
          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
            rows={4}
            value={contestForm.description}
            onChange={(event) => setContestForm((prev) => ({ ...prev, description: event.target.value }))}
          />
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-gray-900">대회 공지 추가</h3>
            <p className="text-sm text-gray-500">대회 생성 시 함께 등록할 공지를 작성해 임시 목록에 추가하세요.</p>
          </div>
          {contestFormAnnouncementMessage.error && (
            <div className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{contestFormAnnouncementMessage.error}</div>
          )}
          {contestFormAnnouncementMessage.success && (
            <div className="mb-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-600">{contestFormAnnouncementMessage.success}</div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              placeholder="공지 제목"
              value={contestFormAnnouncementDraft.title}
              onChange={(event) => handleContestAnnouncementDraftChange({ title: event.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
            />
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={contestFormAnnouncementDraft.visible}
                onChange={(event) => handleContestAnnouncementDraftChange({ visible: event.target.checked })}
              />
              <span>공지 공개</span>
            </label>
          </div>
          <textarea
            placeholder="공지 내용을 입력하세요"
            className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
            rows={3}
            value={contestFormAnnouncementDraft.content}
            onChange={(event) => handleContestAnnouncementDraftChange({ content: event.target.value })}
          />
          <div className="mt-3 flex items-center gap-3">
            <Button type="button" onClick={handleAddContestAnnouncement}>
              공지 추가
            </Button>
            {contestFormAnnouncements.length > 0 && (
              <span className="text-sm text-gray-600">임시 공지 {contestFormAnnouncements.length}건</span>
            )}
          </div>

          {contestFormAnnouncements.length > 0 && (
            <div className="mt-4 space-y-2">
              {contestFormAnnouncements.map((announcement, index) => (
                <div key={`contest-announcement-${index}`} className="rounded-md border border-gray-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {announcement.title}
                        {!announcement.visible && <span className="ml-2 text-xs text-gray-500">(비공개)</span>}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2">{announcement.content}</p>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:text-red-700"
                      onClick={() => handleRemoveContestAnnouncement(index)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">허용 IP CIDR (쉼표 또는 줄바꿈 구분)</label>
          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#58A0C8]"
            rows={2}
            value={contestForm.allowedIpRanges}
            onChange={(event) => setContestForm((prev) => ({ ...prev, allowedIpRanges: event.target.value }))}
            placeholder="127.0.0.1/32, 10.0.0.0/24"
          />
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">대회 문제 구성</label>
            <p className="mt-1 text-xs text-gray-500">등록 전에 포함할 문제를 검색해 선택하세요. 대회 생성 후 자동으로 추가됩니다.</p>
          </div>

          {contestFormProblemMessage.error && <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{contestFormProblemMessage.error}</div>}
          {contestFormProblemMessage.success && <div className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-600">{contestFormProblemMessage.success}</div>}

          {contestFormProblems.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
              아직 선택한 문제가 없습니다. 아래에서 검색해 추가하세요.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {contestFormProblems.map((item) => (
                <span key={`contest-form-problem-${item.problem.id}`} className="inline-flex items-center gap-2 rounded-full bg-[#113F67]/10 px-3 py-1 text-sm text-[#113F67]">
                  <span className="font-medium">문제 {item.displayId}</span>
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:text-red-700"
                    onClick={() => handleRemoveContestFormProblem(item.problem.id)}
                  >
                    삭제
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Input
              label="문제 검색 또는 ID 입력"
              value={contestFormProblemInput}
              placeholder="문제 ID 또는 제목"
              onChange={(event) => handleContestFormProblemInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleAddContestFormProblem();
                }
              }}
            />
            <Input
              label="표시 ID"
              value={contestFormProblemDisplayId}
              placeholder="예: A, B, P100"
              onChange={(event) => handleContestFormProblemDisplayIdChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleAddContestFormProblem();
                }
              }}
            />
            {contestFormProblemSearch.loading && <p className="text-xs text-gray-500">문제를 검색 중입니다...</p>}
            {contestFormProblemSearch.error && <p className="text-xs text-red-600">{contestFormProblemSearch.error}</p>}
            {!contestFormProblemSearch.loading && contestFormProblemSearch.results.length > 0 && (
              <ul className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                {contestFormProblemSearch.results.map((result) => (
                  <li key={`contest-form-suggestion-${result.id}`}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
                      onClick={() => handleSelectContestFormProblemSuggestion(result)}
                    >
                      <div>
                        <p className="font-medium text-gray-800">
                          {result.displayId ?? result.id} · {result.title}
                        </p>
                        <p className="text-xs text-gray-500">난이도: {result.difficulty}</p>
                      </div>
                      <span className="text-xs text-[#113F67]">선택</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => void handleAddContestFormProblem()}>
              문제 추가
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={contestLoading}>
            대회 등록
          </Button>
        </div>
      </form>
    </Card>
  );
};
