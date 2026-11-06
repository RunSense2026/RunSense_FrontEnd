import { create } from 'zustand';

import type { WatchHeartRate, WatchLive, WatchRunComplete, WatchStatus } from '@/wear/wearBridge';

// 갤럭시 워치(RunSense 워치 앱) 연결 상태와 워치가 보내오는 실시간 지표.
//
// 워치는 내장 광학 심박 센서·GPS 로 심박/케이던스/거리를 재고 5초마다 `/runsense/run/live` 로 보낸다.
// 폰 러닝 화면(DashboardA)은 값이 있으면 시뮬레이션 대신 이 값을 쓴다.
interface WatchState {
  /** 블루투스로 붙어 있는 워치가 있는지 */
  connected: boolean;
  /** 워치에 RunSense 워치 앱이 설치돼 있는지 */
  appInstalled: boolean;
  nodeName: string | null;
  /** 워치 쪽 러닝 진행 상태 (워치에서 시작한 러닝) */
  runPhase: 'idle' | 'running' | 'paused';
  /** 최근 실시간 지표. 15초 넘게 갱신이 없으면 stale 로 본다. */
  live: WatchLive | null;
  liveAt: number;
  /** 폰 러닝 중 워치가 따로 보내는 심박(`/runsense/hr`) */
  heartRate: WatchHeartRate | null;
  heartRateAt: number;
  /** 마지막으로 끝난 워치 러닝 요약 */
  lastComplete: WatchRunComplete | null;

  setStatus: (status: WatchStatus) => void;
  setRunPhase: (phase: WatchState['runPhase']) => void;
  setLive: (live: WatchLive) => void;
  setHeartRate: (hr: WatchHeartRate) => void;
  setComplete: (summary: WatchRunComplete) => void;
  clearLive: () => void;
}

export const WATCH_LIVE_STALE_MS = 15000;
/** 워치 심박은 최소 2초마다 오므로 이보다 오래 끊기면 측정 안 됨으로 본다. */
export const WATCH_HR_STALE_MS = 8000;

export const useWatchStore = create<WatchState>((set) => ({
  connected: false,
  appInstalled: false,
  nodeName: null,
  runPhase: 'idle',
  live: null,
  liveAt: 0,
  heartRate: null,
  heartRateAt: 0,
  lastComplete: null,

  setStatus: (status) =>
    set({
      connected: status.connected,
      appInstalled: status.appInstalled,
      nodeName: status.nodeName,
    }),
  setRunPhase: (runPhase) => set({ runPhase }),
  setLive: (live) => set({ live, liveAt: Date.now(), connected: true }),
  setHeartRate: (heartRate) => set({ heartRate, heartRateAt: Date.now(), connected: true }),
  setComplete: (summary) => set({ lastComplete: summary, runPhase: 'idle', live: null }),
  clearLive: () => set({ live: null, runPhase: 'idle' }),
}));

/** 워치 실시간 지표 — 최근 15초 안에 받은 값만 돌려준다 (그 뒤엔 null). */
export const useWatchLive = (): WatchLive | null =>
  useWatchStore((s) => (s.live && Date.now() - s.liveAt <= WATCH_LIVE_STALE_MS ? s.live : null));

/** 폰 러닝 중 워치 심박(bpm) — 최근 8초 안에 받은 측정값만, 없으면 0. */
export const useWatchHeartRate = (): number =>
  useWatchStore((s) =>
    s.heartRate && Date.now() - s.heartRateAt <= WATCH_HR_STALE_MS ? s.heartRate.heartRate : 0,
  );
