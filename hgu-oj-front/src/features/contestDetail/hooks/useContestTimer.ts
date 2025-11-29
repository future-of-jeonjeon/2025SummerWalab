import { useEffect, useMemo, useRef, useState } from 'react';
import type { Contest } from '../../../types';
import { formatDateTime } from '../../../utils/date';

export const useContestTimer = (contest?: Contest) => {
  const [contestPhase, setContestPhase] = useState<'before' | 'running' | 'after'>('before');
  const [serverClock, setServerClock] = useState('--:--:--');
  const [timeLeft, setTimeLeft] = useState('-');
  const offsetRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  const startTimeMs = useMemo(() => (contest?.startTime ? new Date(contest.startTime).getTime() : Number.NaN), [contest?.startTime]);
  const endTimeMs = useMemo(() => (contest?.endTime ? new Date(contest.endTime).getTime() : Number.NaN), [contest?.endTime]);

  useEffect(() => {
    if (!contest?.now) {
      offsetRef.current = 0;
      return;
    }
    const serverNow = new Date(contest.now).getTime();
    offsetRef.current = Number.isNaN(serverNow) ? 0 : serverNow - Date.now();
  }, [contest?.now]);

  useEffect(() => {
    const update = () => {
      const nowWithOffset = Date.now() + offsetRef.current;
      if (Number.isNaN(nowWithOffset)) {
        setServerClock('--:--:--');
        setContestPhase('before');
        setTimeLeft('-');
        return;
      }

      const serverDate = new Date(nowWithOffset);
      setServerClock(serverDate.toLocaleTimeString('ko-KR', { hour12: false }));

      if (!Number.isNaN(startTimeMs) && nowWithOffset < startTimeMs) {
        setContestPhase('before');
      } else if (!Number.isNaN(endTimeMs) && nowWithOffset > endTimeMs) {
        setContestPhase('after');
      } else {
        setContestPhase('running');
      }

      if (Number.isNaN(endTimeMs)) {
        setTimeLeft('-');
        return;
      }

      const diff = endTimeMs - nowWithOffset;
      if (diff <= 0) {
        setTimeLeft('대회가 종료되었습니다.');
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const formatted = `${days ? `${days}일 ` : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setTimeLeft(formatted);
    };

    update();
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    intervalRef.current = window.setInterval(update, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startTimeMs, endTimeMs]);

  return {
    contestPhase,
    serverClock,
    timeLeft,
    startTimeDisplay: formatDateTime(contest?.startTime),
    endTimeDisplay: formatDateTime(contest?.endTime),
  };
};
