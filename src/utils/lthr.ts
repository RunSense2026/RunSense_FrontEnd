// LTHR 테스트 계산 헬퍼 — 측정 화면(LTHRTestScreen)과 결과 화면(LTHRReportScreen)이 함께 쓴다.
//
// 테스트 구성 (Friel 30분 테스트):
//   안정 측정 REST_SECONDS → 워밍업 WARMUP_SECONDS → 본 테스트 TEST_SECONDS
//   본 테스트의 후반 20분(MEASURE_START_SECONDS 이후) 평균 심박이 LTHR 이다.
// 정식 분석은 AI 서버 `/lthr/analyze` 가 하고, 서버 호출이 실패하면 analyzeLthrLocally 로 같은 값을 계산한다.

import type { LthrAnalyzeResponseDto, LthrHeartRateSampleDto, LthrZoneResultDto } from '@/types/aiApi';

/** 테스트 전 안정 측정 시간(초) — 이 동안의 평균 심박을 안정시 심박수로 저장한다 */
export const REST_SECONDS = 10;
/** 워밍업 시간(초) — 측정에는 쓰지 않는다 */
export const WARMUP_SECONDS = 10 * 60;
/** 본 테스트 시간(초) */
export const TEST_SECONDS = 30 * 60;
/** 본 테스트에서 LTHR 측정이 시작되는 시점(초) — 이후 20분 평균이 LTHR */
export const MEASURE_START_SECONDS = 10 * 60;

/** AI 서버가 받는 심박 범위(bpm) — 범위 밖 값은 센서 오류로 보고 버린다 */
const HR_MIN = 30;
const HR_MAX = 250;

export const isValidHeartRate = (hr: number): boolean =>
  Number.isFinite(hr) && hr >= HR_MIN && hr <= HR_MAX;

const average = (values: number[]): number =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

/** 후반 20분 구간 샘플의 평균 심박 — 아직 측정 구간 샘플이 없으면 undefined */
export const runningLthrEstimate = (samples: LthrHeartRateSampleDto[]): number | undefined => {
  const measured = samples.filter((s) => s.elapsedSeconds >= MEASURE_START_SECONDS).map((s) => s.heartRate);
  return measured.length ? Math.round(average(measured)) : undefined;
};

// hrZone()(utils/format.ts) 과 같은 LTHR 비율 경계 — Z1 회복 … Z5 무산소
const ZONE_DEFS: { zone: string; name: string; from: number | null; to: number | null }[] = [
  { zone: 'Z1', name: '회복', from: null, to: 0.81 },
  { zone: 'Z2', name: '유산소', from: 0.81, to: 0.89 },
  { zone: 'Z3', name: '템포', from: 0.89, to: 0.94 },
  { zone: 'Z4', name: '역치', from: 0.94, to: 1.0 },
  { zone: 'Z5', name: '무산소', from: 1.0, to: null },
];

/**
 * AI 서버 분석이 실패했을 때 쓰는 로컬 계산. 서버(`/lthr/analyze`)와 같은 항목을 같은 모양으로 돌려준다.
 * 샘플은 일정 간격(1초)으로 모았다고 보고, 존 체류 시간은 샘플 수 × 간격으로 계산한다.
 */
export const analyzeLthrLocally = (
  samples: LthrHeartRateSampleDto[],
  previousLthr: number | null,
): LthrAnalyzeResponseDto => {
  const all = samples.map((s) => s.heartRate);
  // 후반 20분 샘플이 없으면(조기 종료) 전체 평균으로 대신한다.
  const lthr = runningLthrEstimate(samples) ?? Math.round(average(all));
  const interval = samples.length > 1
    ? (samples[samples.length - 1].elapsedSeconds - samples[0].elapsedSeconds) / (samples.length - 1)
    : 1;

  const zones: LthrZoneResultDto[] = ZONE_DEFS.map((def) => {
    const minBpm = def.from != null ? Math.round(lthr * def.from) : null;
    const maxBpm = def.to != null ? Math.round(lthr * def.to) - 1 : null;
    const count = all.filter(
      (hr) => (def.from == null || hr >= lthr * def.from) && (def.to == null || hr < lthr * def.to),
    ).length;
    return {
      zone: def.zone,
      name: def.name,
      minBpm,
      maxBpm,
      durationSeconds: Math.round(count * interval),
      percentage: all.length ? Math.round((count / all.length) * 1000) / 10 : 0,
    };
  });

  return {
    lthr,
    previousLthr,
    lthrDifference: previousLthr != null ? lthr - previousLthr : null,
    maxHeartRate: all.length ? Math.max(...all) : 0,
    averageHeartRate: Math.round(average(all)),
    zones,
  };
};

/**
 * 결과 화면 차트용 — 본 테스트 샘플을 bucketSeconds 구간 평균으로 줄인다 (기본 30초 → 30분에 60점).
 * 샘플이 없는 구간은 건너뛴다.
 */
export const downsampleHeartRates = (
  samples: LthrHeartRateSampleDto[],
  bucketSeconds = 30,
): number[] => {
  const buckets = new Map<number, number[]>();
  for (const s of samples) {
    const key = Math.floor(s.elapsedSeconds / bucketSeconds);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(s.heartRate);
    else buckets.set(key, [s.heartRate]);
  }
  return [...buckets.entries()].sort(([a], [b]) => a - b).map(([, hrs]) => Math.round(average(hrs)));
};

/** 초 → 'MM:SS' */
export const fmtClock = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
