import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

const getStatusPillClass = (status: ServiceHealthStatus['status']) => {
  switch (status) {
    case 'online':
      return 'border-green-200 bg-green-50 text-green-700';
    case 'offline':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-600';
  }
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
  const [microServiceStatus, setMicroServiceStatus] = useState<ServiceHealthStatus>({
    name: 'Micro Service',
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
    const result = await adminService.checkMicroserviceHealth();
    setMicroServiceStatus({
      name: 'Micro Service',
      status: result.ok ? 'online' : 'offline',
      latency: result.latency,
      message: result.ok ? undefined : result.message,
      lastChecked: new Date().toISOString(),
    });
  }, []);

  useEffect(() => {
    void fetchJudgeServers();
    void refreshMicroServiceHealth();
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

  const serviceCards = useMemo(() => {
    const activeJudgeServers = judgeServers.filter((item) => item.status === 'normal' && !item.is_disabled).length;
    const totalJudgeServers = judgeServers.length;
    const judgeServersStatus: ServiceHealthStatus = {
      name: 'Judge Servers',
      status:
        totalJudgeServers > 0
          ? 'online'
          : backendStatus.status === 'offline'
            ? 'offline'
            : 'unknown',
      message:
        totalJudgeServers > 0
          ? `${activeJudgeServers}/${totalJudgeServers} 활성`
          : '등록된 서버가 없습니다.',
      lastChecked: judgeServers[0]?.last_heartbeat,
    };
    return [backendStatus, microServiceStatus, judgeServersStatus];
  }, [backendStatus, microServiceStatus, judgeServers]);

  return (
    <Card padding="lg">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900">서버 관리</h2>
            <p className="text-sm text-gray-500">채점 서버와 마이크로 서비스 상태를 확인하고 관리할 수 있습니다.</p>
          </div>
          <Button variant="outline" onClick={() => void handleRefresh()} loading={judgeServerLoading}>
            새로고침
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {serviceCards.map((item) => (
            <div
              key={item.name}
              className={`rounded-lg border px-4 py-3 shadow-sm ${getStatusPillClass(item.status)}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{item.name}</span>
                <span className="text-xs text-gray-500">
                  {item.lastChecked ? new Date(item.lastChecked).toLocaleTimeString() : ''}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-base font-medium">
                  {item.status === 'online' ? 'ON' : item.status === 'offline' ? 'OFF' : 'UNKNOWN'}
                </span>
                <span className="text-xs text-gray-600">{formatLatency(item.latency)}</span>
              </div>
              {item.message && <p className="mt-2 text-xs text-gray-600">{item.message}</p>}
            </div>
          ))}
        </div>

        <section className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Judge Server 토큰</h3>
            <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-700">
              {judgeServerToken || '토큰 정보가 없습니다.'}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">상태</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">호스트명</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">작업</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">CPU</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">메모리</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">IP</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">비활성화</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {judgeServerLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                      채점 서버 정보를 불러오는 중입니다...
                    </td>
                  </tr>
                ) : judgeServerError ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-red-600">{judgeServerError}</td>
                  </tr>
                ) : judgeServers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                      등록된 채점 서버가 없습니다.
                    </td>
                  </tr>
                ) : (
                  judgeServers.map((server) => {
                    const online = server.status === 'normal' && !server.is_disabled;
                    return (
                      <tr key={server.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              online ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {online ? '정상' : '오프라인'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="font-medium text-gray-900">{server.hostname}</div>
                          <div className="text-xs text-gray-500">버전 {server.judger_version ?? '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{server.task_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{server.cpu_usage}% / {server.cpu_core}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{server.memory_usage}%</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{server.ip ?? '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
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
                              className={`relative inline-flex h-6 w-12 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#58A0C8] transition-colors duration-150 ease-out ${
                                server.is_disabled ? 'bg-gray-300' : 'bg-green-500'
                              } ${
                                updatingJudgeServerId === server.id
                                  ? 'cursor-not-allowed opacity-60'
                                  : 'cursor-pointer'
                              }`}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-150 ease-out ${
                                  server.is_disabled ? 'translate-x-1' : 'translate-x-6'
                                }`}
                              />
                            </button>
                            <span
                              className={`text-sm ${
                                server.is_disabled ? 'text-gray-500' : 'font-medium text-[#113F67]'
                              }`}
                            >
                              {server.is_disabled ? '비활성' : '활성'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
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
      </div>
    </Card>
  );
};

export default ServerAdminSection;

