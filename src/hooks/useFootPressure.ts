import { useInsoleStore } from '@/stores/insoleStore';
import { toFsr } from '@/utils/insoleMetrics';

export interface FootPressureData {
  /** 왼발 센서별 정규화 압력(0~1) */
  lFsr: number[];
  /** 오른발 센서별 정규화 압력(0~1) */
  rFsr: number[];
  /** 좌우 균형 표기 (예: "49 / 51") */
  balance: string;
  /** 한쪽이라도 인솔이 연결돼 있는지 */
  connected: boolean;
}

/**
 * 실시간 발 압력 분포 데이터.
 * 인솔이 연결돼 있으면 실제 FSR 압력/히트맵을, 아니면 `tick` 기반 시뮬레이션을 돌려준다.
 * (DashboardA 2페이지·DashboardC 가 공유)
 */
export const useFootPressure = (tick: number): FootPressureData => {
  const insoleL = useInsoleStore((s) => s.L);
  const insoleR = useInsoleStore((s) => s.R);

  const lFsr = insoleL.packet
    ? toFsr(insoleL.packet.avg)
    : [0.4, 0.55, 0.3, 0.7, 0.85].map((v, i) => Math.min(1, v + Math.sin((tick + i) / 2) * 0.15));
  const rFsr = insoleR.packet
    ? toFsr(insoleR.packet.avg)
    : [0.45, 0.5, 0.32, 0.65, 0.82].map((v, i) => Math.min(1, v + Math.cos((tick + i) / 2) * 0.15));

  // 좌우 균형 — 양발 인솔 total 압력 비율(둘 다 연결 시), 아니면 목업.
  const balance = (() => {
    const lt = insoleL.packet?.total ?? 0;
    const rt = insoleR.packet?.total ?? 0;
    if (insoleL.packet && insoleR.packet && lt + rt > 0) {
      const lp = Math.round((lt / (lt + rt)) * 100);
      return `${lp} / ${100 - lp}`;
    }
    return '49 / 51';
  })();

  return {
    lFsr,
    rFsr,
    balance,
    connected: insoleL.connected || insoleR.connected,
  };
};
