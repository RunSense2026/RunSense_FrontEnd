// 위치 관련 매직 넘버 상수화

// GPS/역지오코딩 실패 시 폴백으로 쓰는 기본 위치(서울 강남구).
export const DEFAULT_LOCATION = {
  NX: 61,
  NY: 125,
  STATION_NAME: '강남구',
  NAME: '서울 · 강남구',
} as const;