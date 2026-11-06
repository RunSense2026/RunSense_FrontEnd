// FSR 인솔 데이터로부터 케이던스·착지 히트맵을 계산하는 순수 함수 모음.

import type { AiFootDataDto, AiFootHitmapDto } from '@/types/aiApi';
import type { InsolePacket } from '@/types/insole';

export const N_SENSORS = 5;
/** 뒤꿈치(5번) 센서의 avg 배열 인덱스 — 케이던스 검출에 사용 */
export const HEEL_INDEX = 4;

// ─── 케이던스 (뒤꿈치 압력 기반 걸음 검출 → 양발 합산 spm) ───────────

/** 뒤꿈치 압력이 이 값을 넘으면 한 발짝으로 본다 (offset 보정된 FSR 값 기준, 튜닝 대상) */
export const HEEL_STRIKE_THRESHOLD = 150;
/** 걸음 간 데드타임 — 아두이노 MIN_STEP_INTERVAL_MS 와 동일하게 0.3초 */
export const MIN_STEP_INTERVAL_MS = 300;
/** 실시간 케이던스 산출 윈도우 — 최근 12초(10~15초 권장 범위 내) */
export const CADENCE_WINDOW_MS = 12000;

/**
 * 화면 표시용 패킷 갱신 최소 간격(ms). BLE 가 초당 수십 건이라 매 패킷마다
 * 스토어를 갱신하면 SVG 화면이 그만큼 리렌더돼 JS 스레드가 막힌다.
 * 누적·걸음 검출은 매 패킷 처리하되, 화면 반영은 이 간격(≈5Hz)으로만 한다.
 */
export const DISPLAY_THROTTLE_MS = 200;

/**
 * 최근 걸음 이벤트 시각 배열(양발 합산)에서 실시간 케이던스(spm)를 계산한다.
 * 윈도우 안의 걸음 수를 분당으로 환산한다. (예: 12초간 36걸음 → 180 spm)
 */
export const cadenceFromSteps = (stepTimes: number[], now: number): number => {
  const recent = stepTimes.filter((t) => now - t <= CADENCE_WINDOW_MS);
  if (recent.length < 2) return 0;
  return Math.round((recent.length / CADENCE_WINDOW_MS) * 60000);
};

// ─── 발 압력 정규화 ──────────────────────────────────────────────

/** 아날로그 10bit(0~1023) 기준 FSR 평균 압력을 0~1 로 정규화. */
export const FSR_MAX = 1023;
export const toFsr = (avg: number[]): number[] =>
  avg.map((v) => Math.max(0, Math.min(1, v / FSR_MAX)));

// ─── AI 코칭 전송용 풋 페이로드 ───────────────────────────────────

/** 한쪽 발의 구간 평균(insoleStore.drainFootAverages 결과) */
export interface FootAvg {
  /** 센서별 구간 평균 압력 (원시 FSR 스케일) */
  avg: number[];
  /** 구간 평균 total 압력 */
  total: number;
}

/**
 * 인솔 미연결 시 사용하는 기본 압력 분포(%).
 * AI 서버는 left_foot·right_foot 을 모두 필수로 요구하므로, 센서가 없을 때도
 * 요청이 422 로 거절되지 않도록 중립적인 분포를 채워 보낸다.
 */
const NEUTRAL_HITMAP: AiFootHitmapDto = {
  forefootLeft: 22,
  forefootRight: 20,
  midfootLeft: 16,
  midfootRight: 16,
  heel: 46,
};

const NEUTRAL_FOOT: AiFootDataDto = {
  pronationType: 'neutral',
  heelStrikeRate: 46,
  hitmap: NEUTRAL_HITMAP,
};

/**
 * 앞꿈치 안쪽/바깥쪽 압력 비율로 회내(프로네이션) 유형을 추정한다.
 * 안쪽(엄지 쪽)에 쏠리면 과내전, 바깥쪽(새끼발가락 쪽)에 쏠리면 회외로 본다.
 * (AI 서버 스펙 예시가 영문 값이므로 영문으로 보낸다)
 */
const pronationOf = (hitmap: AiFootHitmapDto): string => {
  const inner = hitmap.forefootLeft + hitmap.midfootLeft;
  const outer = hitmap.forefootRight + hitmap.midfootRight;
  const sum = inner + outer;
  if (sum <= 0) return 'neutral';
  const innerShare = inner / sum;
  if (innerShare >= 0.62) return 'overpronation';
  if (innerShare <= 0.38) return 'supination';
  return 'neutral';
};

/**
 * 한쪽 발의 구간 평균 → AI 코칭 요청용 발 데이터.
 * 실제 센서 인덱스: 0 엄지 · 1 엄지밑(안쪽 앞꿈치) · 2 새끼발가락밑(바깥 앞꿈치) · 3 중간(중족) · 4 뒤꿈치.
 * hitmap 5키(forefoot_left/right·midfoot_left/right·heel)에 맞춰 0~100 으로 정규화한다.
 * (중족 센서는 1개뿐이라 midfoot_left/right 에 같은 값을 넣는다.)
 */
const toFootData = (data: FootAvg): AiFootDataDto => {
  const toP = (v: number) => Math.round((v / FSR_MAX) * 100);
  const midfoot = toP(data.avg[3] ?? 0); // 중간(중족) — 센서 1개
  const hitmap: AiFootHitmapDto = {
    // 안쪽 앞꿈치 = 엄지/엄지밑 중 큰 값, 바깥 앞꿈치 = 새끼발가락밑
    forefootLeft: Math.max(toP(data.avg[0] ?? 0), toP(data.avg[1] ?? 0)),
    forefootRight: toP(data.avg[2] ?? 0),
    midfootLeft: midfoot,
    midfootRight: midfoot,
    heel: toP(data.avg[HEEL_INDEX] ?? 0),
  };
  return {
    pronationType: pronationOf(hitmap),
    heelStrikeRate: hitmap.heel,
    hitmap,
  };
};

/**
 * 인솔 최신 패킷 1개 → 발 데이터. 워치로 1초마다 흘려보내는 실시간 족압에 쓴다.
 * 패킷이 없으면(미연결) 중립값을 돌려준다.
 */
export const packetToFootData = (packet: InsolePacket | null): AiFootDataDto =>
  packet ? toFootData({ avg: packet.avg, total: packet.total }) : NEUTRAL_FOOT;

/**
 * 러닝 전체 평균(insoleStore.getSessionAverages) → 리포트 저장용 발 데이터.
 * 코칭과 달리 중립값으로 채우지 않는다 — 패킷이 없던 발은 null(미측정)로 둔다.
 */
export const footAverageToData = (data: FootAvg | null): AiFootDataDto | null =>
  data ? toFootData(data) : null;

/**
 * 양발 구간 평균 → AI 코칭 요청의 left_foot / right_foot.
 * 예전에는 압력이 큰 쪽 한 발만 보냈지만, 서버가 양발을 모두 필수로 받으므로 둘 다 채운다.
 * 한쪽 인솔만 연결된 경우 반대쪽은 중립값으로 채워 요청이 거절되지 않게 한다.
 */
export const footCoachingPayload = (
  L: FootAvg | null,
  R: FootAvg | null,
): { leftFoot: AiFootDataDto; rightFoot: AiFootDataDto } => ({
  leftFoot: L ? toFootData(L) : NEUTRAL_FOOT,
  rightFoot: R ? toFootData(R) : NEUTRAL_FOOT,
});
