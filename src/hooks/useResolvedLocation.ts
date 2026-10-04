import { useState, useEffect } from 'react';

import { reverseGeocode } from '@/api';
import { ensureLocationPermission, getCurrentPosition } from '@/utils/geo';
import { DEFAULT_LOCATION } from '@/constants/location';

/** 날씨/대기질 조회에 필요한, 현재 위치를 해석한 결과. */
export interface ResolvedLocation {
  /** 위도 */
  lat: number;
  /** 경도 */
  lon: number;
  /** 화면 표시용 지역명 (예: "서울 · 강남구") */
  name: string;
  /** 위치 해석이 끝났는지 (GPS 확보 또는 폴백 확정) */
  ready: boolean;
  /** GPS/권한 실패로 기본 위치(강남구)로 폴백했는지 */
  isFallback: boolean;
}

/** 위치가 이 시간 안에 안 잡히면 기본 위치로 먼저 화면을 채운다. */
const LOCATION_GRACE_MS = 3000;

const fallbackLocation = (ready: boolean): ResolvedLocation => ({
  lat: DEFAULT_LOCATION.LAT,
  lon: DEFAULT_LOCATION.LON,
  name: DEFAULT_LOCATION.NAME,
  ready,
  isFallback: true,
});

/**
 * GPS → 위경도 + 표시 지역명을 해석한다.
 * 권한 거부·GPS 실패 시 기본 위치(DEFAULT_LOCATION)로 폴백한다.
 *
 * 2단계로 동작한다 — (1) 좌표가 잡히는 즉시 `ready` 를 세워 날씨/대기질 조회를 시작시키고,
 * (2) 지역명(역지오코딩, `GET /api/public/location`)은 뒤이어 도착하는 대로 갱신한다.
 * 부가 조회가 느려도 날씨가 통째로 밀리지 않게 하기 위함이다.
 *
 * @param refreshKey 값이 바뀌면 위치를 다시 조회한다(당겨서 새로고침 등).
 */
export const useResolvedLocation = (refreshKey: number = 0): ResolvedLocation => {
  const [loc, setLoc] = useState<ResolvedLocation>(() => fallbackLocation(false));

  useEffect(() => {
    let cancelled = false;

    // 권한 팝업이 떠 있거나 GPS 가 늦어도 날씨 카드가 계속 로딩만 하지 않도록,
    // 3초 안에 위치가 안 잡히면 기본 위치로 먼저 보여주고 GPS 가 오면 갱신한다.
    const graceTimer = setTimeout(() => {
      if (!cancelled) setLoc((prev) => (prev.ready ? prev : fallbackLocation(true)));
    }, LOCATION_GRACE_MS);

    const resolve = async () => {
      let lat: number;
      let lon: number;

      try {
        if (!(await ensureLocationPermission())) throw new Error('위치 권한 없음');
        ({ lat, lon } = await getCurrentPosition());
      } catch {
        // 권한 거부/GPS 실패(에뮬레이터 등) → 기본 위치(강남구)로 확정하고 끝낸다.
        if (!cancelled) setLoc(fallbackLocation(true));
        return;
      }

      // (1) 좌표가 나오는 즉시 날씨/대기질 조회를 시작할 수 있게 한다.
      if (cancelled) return;
      setLoc({ lat, lon, name: '현재 위치', ready: true, isFallback: false });

      // (2) 지역명은 뒤따라 채운다. 실패하면 위의 값('현재 위치')이 그대로 유지된다.
      const place = await reverseGeocode(lat, lon);
      if (cancelled) return;

      setLoc((prev) => ({ ...prev, name: place?.name || prev.name }));
    };

    resolve();
    return () => {
      cancelled = true;
      clearTimeout(graceTimer);
    };
  }, [refreshKey]);

  return loc;
};
