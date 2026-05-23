// Pace + time + heart-rate-zone helpers ported from runsense-ui.jsx.

export type HRZone = {
  z: 1 | 2 | 3 | 4 | 5;
  label: string;
  color: string;
};

export const hrZone = (bpm: number, lthr = 164): HRZone => {
  const p = bpm / lthr;
  if (p < 0.81) return { z: 1, label: 'Z1 회복', color: '#93c5fd' };
  if (p < 0.89) return { z: 2, label: 'Z2 유산소', color: '#6ee7b7' };
  if (p < 0.94) return { z: 3, label: 'Z3 템포', color: '#a78bfa' };
  if (p < 1.0) return { z: 4, label: 'Z4 역치', color: '#fbbf24' };
  return { z: 5, label: 'Z5 무산소', color: '#f87171' };
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
