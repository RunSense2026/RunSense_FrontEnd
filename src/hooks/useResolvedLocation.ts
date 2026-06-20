import { useState, useEffect } from 'react';

import { reverseGeocodeKo, fetchNearestStation } from '@/api';
import { ensureLocationPermission, getCurrentPosition } from '@/utils/geo';
import { latLonToGrid } from '@/utils/kmaGrid';
import { DEFAULT_LOCATION } from '@/constants/location';

/** 날씨/대기질 조회에 필요한, 현재 위치를 해석한 결과. */
export interface ResolvedLocation {
  /** 기상청 격자 X */
  nx: number;
  /** 기상청 격자 Y */
  ny: number;
  /** 에어코리아 측정소명으로 쓸 자치구명 (예: "강남구") */
  station: string;
  /** 화면 표시용 지역명 (예: "서울 · 강남구") */
  name: string;
  /** 위치 해석이 끝났는지 (GPS/역지오코딩 완료 또는 폴백 확정) */
  ready: boolean;
  /** GPS/권한 실패로 기본 위치(강남구)로 폴백했는지 */
  isFallback: boolean;
}

/**
 * GPS → 기상청 격자/에어코리아 측정소/표시 지역명을 해석한다.
 * 권한 거부·GPS·역지오코딩 실패 시 기본 위치(DEFAULT_LOCATION)로 폴백한다.
 *
 * @param refreshKey 값이 바뀌면 위치를 다시 조회한다(당겨서 새로고침 등).
 */
export const useResolvedLocation = (refreshKey: number = 0): ResolvedLocation => {
  const [loc, setLoc] = useState<ResolvedLocation>({
    nx: DEFAULT_LOCATION.NX,
    ny: DEFAULT_LOCATION.NY,
    station: DEFAULT_LOCATION.STATION_NAME,
    name: DEFAULT_LOCATION.NAME,
    ready: false,
    isFallback: false,
  });

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      // 기본값은 강남구 — 아래에서 실제 위치 해석에 성공하면 덮어쓴다.
      let next: ResolvedLocation = {
        nx: DEFAULT_LOCATION.NX,
        ny: DEFAULT_LOCATION.NY,
        station: DEFAULT_LOCATION.STATION_NAME,
        name: DEFAULT_LOCATION.NAME,
        ready: true,
        isFallback: true,
      };

      try {
        if (await ensureLocationPermission()) {
          const { lat, lon } = await getCurrentPosition();
          const grid = latLonToGrid(lat, lon);
          next = { ...next, nx: grid.nx, ny: grid.ny, isFallback: false };

          // 표시용 지역명(역지오코딩)과 대기질 측정소(좌표 기반 최근접)를 함께 조회.
          const [place, nearest] = await Promise.all([
            reverseGeocodeKo(lat, lon).catch(() => null),
            fetchNearestStation(lat, lon),
          ]);

          if (place) {
            next.name = place.name;
            if (place.gu) next.station = place.gu; // 측정소 조회 실패 시 폴백용
          } else {
            // GPS 는 됐지만 지역명 해석 실패 — "강남구"로 오인되지 않게 좌표 위치로 표시.
            next.name = '현재 위치';
          }

          // 좌표 기반 최근접 측정소가 있으면 자치구명보다 우선(매칭 정확도↑).
          if (nearest?.stationName) next.station = nearest.stationName;
        }
      } catch {
        // 권한 거부/GPS/역지오코딩 실패 → 기본 위치(강남구)로 폴백
      }

      if (!cancelled) setLoc(next);
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return loc;
};
