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
