import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { adminService } from '../../services/adminService';
import { JudgeServer, ServiceHealthStatus } from '../../types';

const formatLatency = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} s`;
  }
  return `${Math.round(value)} ms`;
};

export const ServerAdminSection: React.FC = () => {
  const [judgeServers, setJudgeServers] = useState<JudgeServer[]>([]);
  const [judgeServerToken, setJudgeServerToken] = useState('');
  const [judgeServerLoading, setJudgeServerLoading] = useState(false);
  const [judgeServerError, setJudgeServerError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<ServiceHealthStatus>({
    name: 'OJ Backend',
    status: 'unknown',
  });
  const [msBackendStatus, setMsBackendStatus] = useState<ServiceHealthStatus>({
    name: 'Micro Service Server',
    status: 'unknown',
  });

  const [updatingJudgeServerId, setUpdatingJudgeServerId] = useState<number | null>(null);
  const [deletingJudgeServerHostname, setDeletingJudgeServerHostname] = useState<string | null>(null);

  const fetchJudgeServers = useCallback(async () => {
    setJudgeServerError(null);
    setJudgeServerLoading(true);
    const started = performance.now();
    try {
      const { token, servers } = await adminService.getJudgeServers();
      const latency = performance.now() - started;
      setJudgeServerToken(token ?? '');
      setJudgeServers(Array.isArray(servers) ? servers : []);
      setBackendStatus({
        name: 'OJ Backend',
        status: 'online',
        lastChecked: new Date().toISOString(),
        latency,
      });
    } catch (error) {
      const latency = performance.now() - started;
      const message = error instanceof Error ? error.message : '채점 서버 목록을 불러오지 못했습니다.';
      setJudgeServerError(message);
      setJudgeServers([]);
      setJudgeServerToken('');
      setBackendStatus({
        name: 'OJ Backend',
        status: 'offline',
        message,
        lastChecked: new Date().toISOString(),
        latency,
      });
    } finally {
      setJudgeServerLoading(false);
    }
  }, []);

  const refreshMicroServiceHealth = useCallback(async () => {
    try {
      const result = await adminService.checkMicroserviceHealth();
      setMsBackendStatus({
        name: 'Micro Service Server',
        status: result.ok ? 'online' : 'offline',
        lastChecked: new Date().toISOString(),
        latency: result.latency,
        message: result.message,
      });
    } catch (error) {
      setMsBackendStatus({
        name: 'Micro Service Server',
        status: 'offline',
        lastChecked: new Date().toISOString(),
        message: error instanceof Error ? error.message : '오류 발생',
      });
    }
  }, []);

  useEffect(() => {
    void fetchJudgeServers();
    void refreshMicroServiceHealth();

    // MS 서버 health 체크를 주기적으로 호출 (옵션, 필요없다면 제거 가능)
    // const intervalId = setInterval(() => {
    //   void refreshMicroServiceHealth();
    // }, 10000);
    // return () => clearInterval(intervalId);
  }, [fetchJudgeServers, refreshMicroServiceHealth]);

  const handleToggleJudgeServerDisabled = useCallback(
    async (server: JudgeServer, disable: boolean) => {
      setUpdatingJudgeServerId(server.id);
      try {
        await adminService.updateJudgeServer({ id: server.id, is_disabled: disable });
        setJudgeServers((prev) =>
          prev.map((item) => (item.id === server.id ? { ...item, is_disabled: disable } : item))
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : '채점 서버 상태를 변경하지 못했습니다.';
        setJudgeServerError(message);
        await fetchJudgeServers();
      } finally {
        setUpdatingJudgeServerId(null);
      }
    },
    [fetchJudgeServers]
  );

  const handleDeleteJudgeServer = useCallback(
    async (hostname: string) => {
      if (!hostname) {
        return;
      }
      const confirmed = window.confirm(`${hostname} 서버를 삭제하시겠습니까? 다음 하트비트까지 사용할 수 없습니다.`);
      if (!confirmed) {
        return;
      }
      setDeletingJudgeServerHostname(hostname);
      try {
        await adminService.deleteJudgeServer(hostname);
        await fetchJudgeServers();
      } catch (error) {
        const message = error instanceof Error ? error.message : '채점 서버를 삭제하지 못했습니다.';
        setJudgeServerError(message);
      } finally {
        setDeletingJudgeServerHostname(null);
      }
    },
    [fetchJudgeServers]
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchJudgeServers(), refreshMicroServiceHealth()]);
  }, [fetchJudgeServers, refreshMicroServiceHealth]);



  return (
    <Card padding="lg">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 dark:text-slate-100">서버 관리</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">채점 서버와 마이크로 서비스 상태를 확인하고 관리할 수 있습니다.</p>
          </div>
          <Button variant="outline" onClick={() => void handleRefresh()} loading={judgeServerLoading}>
            새로고침
          </Button>
        </div>

        {/* 통합 대시보드 레이아웃 */}
        <div className="space-y-6">
          {/* 상단: 시스템 핵심 지표 (모니터링 + 서버 상태 요약) */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                실시간 시스템 현황
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* 1. 백엔드 상태 */}
              <div className={`rounded-lg p-4 border shadow-sm ${backendStatus.status === 'online'
                ? 'bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-700'
                : 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800/40'
                }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-slate-400">OJ Backend</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className={`text-lg font-bold ${backendStatus.status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {backendStatus.status === 'online' ? '정상 가동' : '중단됨'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                  응답 속도: {formatLatency(backendStatus.latency)}
                </div>
              </div>

              {/* 2. MS Server 상태 */}
              <div className={`rounded-lg p-4 border shadow-sm ${msBackendStatus.status === 'online'
                ? 'bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-700'
                : 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800/40'
                }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-slate-400">Micro Service Server</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className={`text-lg font-bold ${msBackendStatus.status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {msBackendStatus.status === 'online' ? '정상 가동' : '중단됨'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                  응답 속도: {formatLatency(msBackendStatus.latency)}
                </div>
              </div>

              {/* 4. 채점 서버 상태 요약 */}
              <div className="rounded-lg border border-gray-200 dark:border-slate-700 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-slate-400">Judge Servers</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                        {judgeServers.filter(s => s.status === 'normal' && !s.is_disabled).length}
                        <span className="text-sm font-normal text-gray-400 dark:text-slate-500">/{judgeServers.length}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                  총 {judgeServers.length}개 서버 등록됨
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Judge Server 토큰</h3>
            <div className="mt-2 rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2 font-mono text-sm text-gray-700 dark:text-slate-300">
              {judgeServerToken || '토큰 정보가 없습니다.'}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">상태</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">호스트명</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">작업</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">CPU</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">메모리</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">IP</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">비활성화</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
                {judgeServerLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
                      채점 서버 정보를 불러오는 중입니다...
                    </td>
                  </tr>
                ) : judgeServerError ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-red-600">{judgeServerError}</td>
                  </tr>
                ) : judgeServers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
                      등록된 채점 서버가 없습니다.
                    </td>
                  </tr>
                ) : (
                  judgeServers.map((server) => {
                    const online = server.status === 'normal' && !server.is_disabled;
                    return (
                      <tr key={server.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:bg-slate-800">
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${online ? 'bg-green-100 text-green-700' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 dark:text-slate-300'
                              }`}
                          >
                            {online ? '정상' : '오프라인'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                          <div className="font-medium text-gray-900 dark:text-slate-100">{server.hostname}</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">버전 {server.judger_version ?? '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">{server.task_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">{server.cpu_usage}% / {server.cpu_core}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">{server.memory_usage}%</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">{server.ip ?? '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                          <div className="inline-flex items-center gap-3">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={!server.is_disabled}
                              aria-label={`${server.hostname} 서버 ${server.is_disabled ? '비활성화' : '활성화'}`}
                              onClick={() => {
                                if (updatingJudgeServerId === server.id) {
                                  return;
                                }
                                handleToggleJudgeServerDisabled(server, !server.is_disabled);
                              }}
                              disabled={updatingJudgeServerId === server.id}
                              className={`relative inline-flex h-6 w-12 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#58A0C8] transition-colors duration-150 ease-out ${server.is_disabled ? 'bg-gray-300 dark:bg-slate-600' : 'bg-green-500'
                                } ${updatingJudgeServerId === server.id
                                  ? 'cursor-not-allowed opacity-60'
                                  : 'cursor-pointer'
                                }`}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-150 ease-out ${server.is_disabled ? 'translate-x-1' : 'translate-x-6'
                                  }`}
                              />
                            </button>
                            <span
                              className={`text-sm ${server.is_disabled ? 'text-gray-500 dark:text-slate-400' : 'font-medium text-[#113F67] dark:text-emerald-400'
                                }`}
                            >
                              {server.is_disabled ? '비활성' : '활성'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">

                          <Button
                            type="button"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDeleteJudgeServer(server.hostname)}
                            loading={deletingJudgeServerHostname === server.hostname}
                          >
                            삭제
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div >
    </Card >
  );
};

export default ServerAdminSection;
