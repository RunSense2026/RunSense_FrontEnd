// FSR 인솔 데이터로부터 케이던스·착지 히트맵을 계산하는 순수 함수 모음.

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

// ─── AI 코칭 전송용 풋필드 ────────────────────────────────────────

/** 한쪽 발의 구간 평균(insoleStore.drainFootAverages 결과) */
export interface FootAvg {
  /** 센서별 구간 평균 압력 (원시 FSR 스케일) */
  avg: number[];
  /** 구간 평균 total 압력 */
  total: number;
}

/** AI 코칭 요청(/ai/coaching)에 실리는 풋센서 필드 */
export interface CoachingFootFields {
  footSide: 'left' | 'right' | null;
  heelStrikeRate: number | null;
  hitmapJson: Record<string, number> | null;
}

/**
 * 양발 구간 평균 → AI 코칭 전송용 풋필드.
 * total 압력이 더 큰 쪽 발을 골라 센서별 평균을 0~100 으로 정규화한다.
 * 실제 센서 인덱스: 0 엄지 · 1 엄지밑(안쪽 앞꿈치) · 2 새끼발가락밑(바깥 앞꿈치) · 3 중간(중족) · 4 뒤꿈치.
 * 백엔드 hitmapJson 5키(forefoot_left/right·midfoot_left/right·heel)에 맞춰 매핑한다.
 * (중족 센서는 1개뿐이라 midfoot_left/right 에 같은 값을 넣는다.)
 */
export const footCoachingFields = (
  L: FootAvg | null,
  R: FootAvg | null,
): CoachingFootFields => {
  const side: 'L' | 'R' | null =
    L && R ? (L.total >= R.total ? 'L' : 'R') : L ? 'L' : R ? 'R' : null;
  const data = side === 'L' ? L : side === 'R' ? R : null;
  if (!side || !data) return { footSide: null, heelStrikeRate: null, hitmapJson: null };
  const toP = (v: number) => Math.round((v / FSR_MAX) * 100);
  const midfoot = toP(data.avg[3] ?? 0); // 중간(중족) — 센서 1개
  return {
    footSide: side === 'L' ? 'left' : 'right',
    heelStrikeRate: toP(data.avg[HEEL_INDEX] ?? 0),
    hitmapJson: {
      // 안쪽 앞꿈치 = 엄지/엄지밑 중 큰 값, 바깥 앞꿈치 = 새끼발가락밑
      forefoot_left: Math.max(toP(data.avg[0] ?? 0), toP(data.avg[1] ?? 0)),
      forefoot_right: toP(data.avg[2] ?? 0),
      midfoot_left: midfoot,
      midfoot_right: midfoot,
      heel: toP(data.avg[4] ?? 0),
    },
  };
};
