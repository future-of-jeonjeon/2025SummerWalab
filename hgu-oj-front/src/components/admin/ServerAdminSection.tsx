import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Sparkline } from '../atoms/Sparkline';
import { adminService } from '../../services/adminService';
import { JudgeServer, ServiceHealthStatus, SystemMetrics } from '../../types';

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

  const [updatingJudgeServerId, setUpdatingJudgeServerId] = useState<number | null>(null);
  const [deletingJudgeServerHostname, setDeletingJudgeServerHostname] = useState<string | null>(null);

  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [isGraphExpanded, setIsGraphExpanded] = useState(false);
  const [isQueueGraphExpanded, setIsQueueGraphExpanded] = useState(false);
  const [isLatencyGraphExpanded, setIsLatencyGraphExpanded] = useState(false);

  // 스파크라인용 히스토리 상태 (초기값은 0으로 채움)
  const [queueHistory, setQueueHistory] = useState<number[]>(() =>
    Array.from({ length: 90 }, () => 0)
  );
  const [latencyHistory, setLatencyHistory] = useState<number[]>(() =>
    Array.from({ length: 90 }, () => 0)
  );

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
    // 마이크로 서비스 상태는 별도로 표시하지 않음 (통합 대시보드에 포함되지 않음)
    console.log('Microservice Health:', result);
  }, []);

  const fetchSystemMetrics = useCallback(async () => {
    try {
      const metrics = await adminService.getSystemMetrics();
      setSystemMetrics(metrics);

      // 실시간 데이터 누적 (최대 90개 유지)
      setQueueHistory((prev) => [...prev.slice(1), metrics.queue_size]);
      setLatencyHistory((prev) => [...prev.slice(1), metrics.max_wait_time]);
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
    }
  }, []);

  useEffect(() => {
    void fetchJudgeServers();
    void refreshMicroServiceHealth();
    void fetchSystemMetrics();

    const intervalId = setInterval(() => {
      void fetchSystemMetrics();
    }, 1000);

    return () => clearInterval(intervalId);
  }, [fetchJudgeServers, refreshMicroServiceHealth, fetchSystemMetrics]);

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
    await Promise.all([fetchJudgeServers(), refreshMicroServiceHealth(), fetchSystemMetrics()]);
  }, [fetchJudgeServers, refreshMicroServiceHealth, fetchSystemMetrics]);



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

        {/* 통합 대시보드 레이아웃 */}
        <div className="space-y-6">
          {/* 상단: 시스템 핵심 지표 (모니터링 + 서버 상태 요약) */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                실시간 시스템 현황
              </h3>
              {systemMetrics && (
                <span className="text-xs text-gray-500">
                  마지막 업데이트: {new Date(systemMetrics.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* 1. 대기열 (가장 중요) */}
              {systemMetrics && (
                <div className={`rounded-lg p-4 border ${systemMetrics.queue_size > 10 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-200'} shadow-sm`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium text-gray-500">대기열 (Queue)</div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className={`text-2xl font-bold ${systemMetrics.queue_size > 10 ? 'text-red-600' : 'text-gray-900'}`}>
                          {systemMetrics.queue_size}
                        </span>
                        <span className="text-xs text-gray-500">명</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. 대기 시간 */}
              {systemMetrics && (
                <div className={`rounded-lg p-4 border ${systemMetrics.max_wait_time > 3 ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-200'} shadow-sm`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium text-gray-500">최대 지연 (Latency)</div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className={`text-2xl font-bold ${systemMetrics.max_wait_time > 3 ? 'text-orange-600' : 'text-gray-900'}`}>
                          {systemMetrics.max_wait_time}
                        </span>
                        <span className="text-xs text-gray-500">초</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. 백엔드 상태 */}
              <div className={`rounded-lg p-4 border ${backendStatus.status === 'online' ? 'bg-white border-gray-200' : 'bg-red-50 border-red-100'} shadow-sm`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium text-gray-500">OJ Backend</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className={`text-lg font-bold ${backendStatus.status === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                        {backendStatus.status === 'online' ? '정상 가동' : '중단됨'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  응답 속도: {formatLatency(backendStatus.latency)}
                </div>
              </div>

              {/* 4. 채점 서버 상태 요약 */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Judge Servers</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {judgeServers.filter(s => s.status === 'normal' && !s.is_disabled).length}
                        <span className="text-sm font-normal text-gray-400">/{judgeServers.length}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  총 {judgeServers.length}개 서버 등록됨
                </div>
              </div>
            </div>
          </section>

          {/* 하단: 트래픽 그래프 (넓게 배치) */}
          {systemMetrics && (
            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-lg"
                onClick={() => setIsGraphExpanded(!isGraphExpanded)}
              >
                <h4 className="text-sm font-bold text-gray-700">분당 제출 트래픽 (Last 1 Hour)</h4>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 transform transition-transform duration-200 ${isGraphExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {isGraphExpanded && (
                <div className="p-5 pt-0 border-t border-gray-100">
                  <div className="relative h-32 w-full flex items-end gap-1 mt-4">
                    {(() => {
                      const maxCount = Math.max(...systemMetrics.history.map(h => h.count), 20); // 최소 스케일 20
                      return systemMetrics.history.map((item, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-t-sm transition-all duration-300 group relative ${item.count > maxCount * 0.8 ? 'bg-red-400 hover:bg-red-500' : 'bg-blue-100 hover:bg-blue-200'}`}
                          style={{ height: `${Math.max((item.count / maxCount) * 100, 2)}%` }}
                        >
                          <div className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 hidden group-hover:block z-10">
                            <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                              {item.time} - {item.count}
                            </div>
                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-800 absolute left-1/2 -translate-x-1/2 top-full"></div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  <div className="flex w-full gap-1 mt-2 border-t border-gray-100 pt-2">
                    {systemMetrics.history.map((item, i) => (
                      <div key={i} className="flex-1 flex justify-center">
                        {i % 10 === 0 && (
                          <span className="text-[10px] text-gray-400 whitespace-nowrap transform -rotate-45 origin-top-left sm:rotate-0 sm:origin-center">
                            {item.time}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
          {systemMetrics && (
            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-lg"
                onClick={() => setIsQueueGraphExpanded(!isQueueGraphExpanded)}
              >
                <h4 className="text-sm font-bold text-gray-700">실시간 대기열 추이 (Last 90s)</h4>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 transform transition-transform duration-200 ${isQueueGraphExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {isQueueGraphExpanded && (
                <div className="p-5 pt-0 border-t border-gray-100">
                  <div className="h-24 mt-4">
                    <Sparkline data={queueHistory} color={systemMetrics.queue_size > 10 ? '#ef4444' : '#3b82f6'} fill height={96} />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-gray-400 px-1">
                    <span>-90s</span>
                    <span>-60s</span>
                    <span>-30s</span>
                    <span>Now</span>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 실시간 지연시간 추이 */}
          {systemMetrics && (
            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-lg"
                onClick={() => setIsLatencyGraphExpanded(!isLatencyGraphExpanded)}
              >
                <h4 className="text-sm font-bold text-gray-700">실시간 지연시간 추이 (Last 90s)</h4>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 transform transition-transform duration-200 ${isLatencyGraphExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {isLatencyGraphExpanded && (
                <div className="p-5 pt-0 border-t border-gray-100">
                  <div className="h-24 mt-4">
                    <Sparkline data={latencyHistory} color={systemMetrics.max_wait_time > 3 ? '#f97316' : '#10b981'} fill height={96} />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-gray-400 px-1">
                    <span>-90s</span>
                    <span>-60s</span>
                    <span>-30s</span>
                    <span>Now</span>
                  </div>
                </div>
              )}
            </section>
          )}
        </div >

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
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${online ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
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
                              className={`relative inline-flex h-6 w-12 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#58A0C8] transition-colors duration-150 ease-out ${server.is_disabled ? 'bg-gray-300' : 'bg-green-500'
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
                              className={`text-sm ${server.is_disabled ? 'text-gray-500' : 'font-medium text-[#113F67]'
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
      </div >
    </Card >
  );
};

export default ServerAdminSection;

