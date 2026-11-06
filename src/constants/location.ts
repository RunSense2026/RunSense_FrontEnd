// 위치 관련 매직 넘버 상수화

// GPS/권한 실패 시 폴백으로 쓰는 기본 위치(서울 강남구).
// 날씨·대기질은 백엔드가 위경도로 조회하므로 좌표만 있으면 된다.
export const DEFAULT_LOCATION = {
  LAT: 37.5172,
  LON: 127.0473,
  NAME: '서울 · 강남구',
} as const;
