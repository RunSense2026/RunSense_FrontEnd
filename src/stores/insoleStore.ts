import { create } from 'zustand';

import type { FootSide, InsolePacket } from '@/types/insole';
import {
  HEEL_INDEX,
  HEEL_STRIKE_THRESHOLD,
  MIN_STEP_INTERVAL_MS,
  CADENCE_WINDOW_MS,
  DISPLAY_THROTTLE_MS,
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

// AI 코칭 전송용 구간 평균 누적기(발별) — drainFootAverages 호출 시 평균을 내고 비운다.
interface FootAccum {
  /** 센서별 압력 합(요소별 누적) */
  sumAvg: number[];
  /** total 압력 합 */
  sumTotal: number;
  /** 누적된 패킷 수 */
  count: number;
}

/** drainFootAverages 가 돌려주는 한쪽 발의 구간 평균(없으면 null) */
export interface FootAverage {
  /** 센서별 구간 평균 압력 (원시 FSR 스케일) */
  avg: number[];
  /** 구간 평균 total 압력 */
  total: number;
}

interface InsoleState {
  L: FootState;
  R: FootState;
  /** 최근 걸음 이벤트 시각(Date.now, ms) — 양발 합산 케이던스 계산용 */
  stepTimes: number[];
  _heel: Record<FootSide, HeelEdge>;
  _accum: Record<FootSide, FootAccum>;
  /** 화면 표시용 packet 을 마지막으로 갱신한 시각(발별, ms) — 갱신 스로틀용 */
  _lastShownMs: Record<FootSide, number>;

  /** 연결/해제 상태 갱신 */
  setConnection: (
    foot: FootSide,
    info: { connected: boolean; deviceName?: string | null; address?: string | null },
  ) => void;
  /** 인솔 패킷 수신 → 저장 + 뒤꿈치 기반 걸음 검출 + 구간 평균 누적 */
  ingest: (packet: InsolePacket) => void;
  /** 한쪽 발 상태 초기화(연결 해제 시) */
  resetFoot: (foot: FootSide) => void;
  /**
   * 마지막 호출 이후 누적된 양발 압력의 평균을 돌려주고 누적기를 비운다.
   * AI 코칭 전송 주기(60초)마다 호출해 '직전 구간 평균'을 얻는 용도.
   */
  drainFootAverages: () => Record<FootSide, FootAverage | null>;
}

const emptyFoot = (): FootState => ({
  connected: false,
  deviceName: null,
  address: null,
  packet: null,
});

const emptyAccum = (): FootAccum => ({ sumAvg: [], sumTotal: 0, count: 0 });

export const useInsoleStore = create<InsoleState>((set, get) => ({
  L: emptyFoot(),
  R: emptyFoot(),
  stepTimes: [],
  _heel: { L: { above: false, lastStepMs: 0 }, R: { above: false, lastStepMs: 0 } },
  _accum: { L: emptyAccum(), R: emptyAccum() },
  _lastShownMs: { L: 0, R: 0 },

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

      // 구간 평균용 누적 — 센서별 압력/​total/​패킷 수를 더한다.
      const accum = state._accum[foot];
      const nextAccum: FootAccum = {
        sumAvg: packet.avg.map((v, i) => (accum.sumAvg[i] ?? 0) + v),
        sumTotal: accum.sumTotal + packet.total,
        count: accum.count + 1,
      };

      // 화면 표시용 packet 은 스로틀 — 마지막 갱신 후 DISPLAY_THROTTLE_MS 지났을 때만
      // L/R 을 새로 써서 구독 컴포넌트(무거운 SVG 화면)가 그 빈도로만 리렌더되게 한다.
      // 누적(_accum)·걸음 검출(_heel/stepTimes)은 위에서 매 패킷 이미 처리했다.
      const shouldShow = now - state._lastShownMs[foot] >= DISPLAY_THROTTLE_MS;
      const nextFoot: FootState = { ...state[foot], packet };
      return {
        ...(shouldShow ? (foot === 'L' ? { L: nextFoot } : { R: nextFoot }) : {}),
        ...(shouldShow ? { _lastShownMs: { ...state._lastShownMs, [foot]: now } } : {}),
        stepTimes,
        _heel: { ...state._heel, [foot]: nextEdge },
        _accum: { ...state._accum, [foot]: nextAccum },
      };
    }),

  resetFoot: (foot) =>
    set((state) => ({
      ...(foot === 'L' ? { L: emptyFoot() } : { R: emptyFoot() }),
      _accum: { ...state._accum, [foot]: emptyAccum() },
    })),

  drainFootAverages: () => {
    const { _accum } = get();
    // [임시 진단] 코칭 전송 시점의 누적 패킷 수 확인용. 원인 파악 후 제거할 것.
    if (__DEV__) console.log(`[insole] drain — L:${_accum.L.count}건, R:${_accum.R.count}건`);
    const build = (a: FootAccum): FootAverage | null =>
      a.count > 0
        ? { avg: a.sumAvg.map((s) => s / a.count), total: a.sumTotal / a.count }
        : null;
    const result: Record<FootSide, FootAverage | null> = {
      L: build(_accum.L),
      R: build(_accum.R),
    };
    set({ _accum: { L: emptyAccum(), R: emptyAccum() } });
    return result;
  },
}));
