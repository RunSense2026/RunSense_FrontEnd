// Pace + time + heart-rate-zone helpers ported from runsense-ui.jsx.

import { colors } from '@/theme/tokens';

export type HRZone = {
  z: 1 | 2 | 3 | 4 | 5;
  label: string;
  color: string;
};

/** LTHR 미설정 시 쓰는 기본 역치 심박수(bpm). 사용자가 프로필에 입력하면 그 값이 우선한다. */
export const DEFAULT_LTHR = 164;

export const hrZone = (bpm: number, lthr = DEFAULT_LTHR): HRZone => {
  const p = bpm / lthr;
  if (p < 0.81) return { z: 1, label: 'Z1 회복', color: colors.zone.z1 };
  if (p < 0.89) return { z: 2, label: 'Z2 유산소', color: colors.zone.z2 };
  if (p < 0.94) return { z: 3, label: 'Z3 템포', color: colors.zone.z3 };
  if (p < 1.0) return { z: 4, label: 'Z4 역치', color: colors.zone.z4 };
  return { z: 5, label: 'Z5 무산소', color: colors.zone.z5 };
};

// Coarse 3-zone HR model (absolute bpm) for live HR graphs — complements the
// detailed 5-zone hrZone(). 유산소=초록 · 역치=노랑 · 무산소=빨강.
export const HR_AEROBIC_MAX = 150; // 유산소 < 150
export const HR_THRESHOLD_MAX = 165; // 역치 150–165 · 무산소 ≥ 165

export const hrZoneColor = (bpm: number): string => {
  if (bpm < HR_AEROBIC_MAX) return colors.semantic.good;
  if (bpm < HR_THRESHOLD_MAX) return colors.semantic.warn;
  return colors.semantic.bad;
};

// Format pace from seconds-per-km → "M'SS\""
export const fmtPace = (spk: number): string => {
  if (!spk || !isFinite(spk)) return "--'--\"";
  const m = Math.floor(spk / 60);
  const s = Math.round(spk - m * 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
};

export const fmtTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// 초 → "HH:MM:SS" (백엔드 time 필드 등 0-패딩 포맷). fmtTime 과 달리 항상 시·분·초를 채운다.
export const secToHms = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
};

// 초/km → 분 단위 실수 (AI 서버 pace 필드용, 예: 329 → 5.48)
export const spkToMinutes = (spk: number): number =>
  spk > 0 ? Math.round((spk / 60) * 100) / 100 : 0;

// 초/km → "M'SS" (백엔드 pace 필드 포맷 — fmtPace 에서 따옴표만 제거)
export const spkToPace = (spk: number): string => fmtPace(spk).replace(/"/g, '');
