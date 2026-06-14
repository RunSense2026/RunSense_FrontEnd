import { create } from 'zustand';

import type { FootSide, InsolePacket } from '@/types/insole';
import {
  HEEL_INDEX,
  HEEL_STRIKE_THRESHOLD,
  MIN_STEP_INTERVAL_MS,
  CADENCE_WINDOW_MS,
} from '@/utils/insoleMetrics';

// 한쪽 발(인솔)의 연결 상태와 최신 패킷.
interface FootState {
  connected: boolean;
  deviceName: string | null;
  address: string | null;
  packet: InsolePacket | null;
}

// 뒤꿈치 압력의 상승 엣지 검출용 내부 상태(발별).
interface HeelEdge {
  above: boolean;
  lastStepMs: number;
}

interface InsoleState {
  L: FootState;
  R: FootState;
  /** 최근 걸음 이벤트 시각(Date.now, ms) — 양발 합산 케이던스 계산용 */
  stepTimes: number[];
  _heel: Record<FootSide, HeelEdge>;

  /** 연결/해제 상태 갱신 */
  setConnection: (
    foot: FootSide,
    info: { connected: boolean; deviceName?: string | null; address?: string | null },
  ) => void;
  /** 인솔 패킷 수신 → 저장 + 뒤꿈치 기반 걸음 검출 */
  ingest: (packet: InsolePacket) => void;
  /** 한쪽 발 상태 초기화(연결 해제 시) */
  resetFoot: (foot: FootSide) => void;
}

const emptyFoot = (): FootState => ({
  connected: false,
  deviceName: null,
  address: null,
  packet: null,
});

export const useInsoleStore = create<InsoleState>((set) => ({
  L: emptyFoot(),
  R: emptyFoot(),
  stepTimes: [],
  _heel: { L: { above: false, lastStepMs: 0 }, R: { above: false, lastStepMs: 0 } },

  setConnection: (foot, info) =>
    set((state) => {
      const next: FootState = {
        ...state[foot],
        connected: info.connected,
        deviceName: info.deviceName ?? (info.connected ? state[foot].deviceName : null),
        address: info.address ?? (info.connected ? state[foot].address : null),
      };
      return foot === 'L' ? { L: next } : { R: next };
    }),

  ingest: (packet) =>
    set((state) => {
      const foot = packet.foot;
      const heel = packet.avg[HEEL_INDEX] ?? 0;
      const now = Date.now();
      const edge = state._heel[foot];

      let stepTimes = state.stepTimes;
      const nextEdge: HeelEdge = { ...edge };

      // 뒤꿈치 압력의 상승 엣지 + 데드타임으로 한 걸음 검출.
      if (heel >= HEEL_STRIKE_THRESHOLD) {
        if (!edge.above && now - edge.lastStepMs > MIN_STEP_INTERVAL_MS) {
          stepTimes = [...state.stepTimes.filter((t) => now - t <= CADENCE_WINDOW_MS), now];
          nextEdge.lastStepMs = now;
        }
        nextEdge.above = true;
      } else {
        nextEdge.above = false;
      }

      const nextFoot: FootState = { ...state[foot], packet };
      return {
        ...(foot === 'L' ? { L: nextFoot } : { R: nextFoot }),
        stepTimes,
        _heel: { ...state._heel, [foot]: nextEdge },
      };
    }),

  resetFoot: (foot) => set(() => (foot === 'L' ? { L: emptyFoot() } : { R: emptyFoot() })),
}));
