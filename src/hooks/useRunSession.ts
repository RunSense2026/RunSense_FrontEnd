import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';

import { haversineMeters, ensureLocationPermission } from '@/utils/geo';

// GPS 거리 누적 시 잡음을 거르는 임계값.
const MAX_ACCURACY_M = 50; // 이 값보다 오차가 큰 fix 는 무시
const MIN_STEP_M = 1; // 정지 상태 지터 무시
const MAX_STEP_M = 75; // 순간이동(튐) 무시

export interface RunSession {
  /** 1초마다 증가하는 카운터 (시뮬레이션 표시값 등에 사용) */
  tick: number;
  /** 경과 시간(초) — 일시정지 시 멈춤 */
  sec: number;
  /** GPS 누적 거리(km) */
  distKm: number;
  /** 평균 페이스(초/km) — 거리가 충분히 쌓이기 전엔 0 */
  paceSpk: number;
  /** GPS 위치를 한 번이라도 받았는지 */
  gpsReady: boolean;
}

// 라이브 러닝 세션: 경과 시간(타이머) + GPS 실거리/실페이스.
// 화면이 포커스된 동안만 타이머가 돌고, 일시정지 시 시간·거리 누적을 멈춘다.
export const useRunSession = (paused: boolean): RunSession => {
  const [tick, setTick] = useState(0);
  const [distM, setDistM] = useState(0);
  const [gpsReady, setGpsReady] = useState(false);

  // 경과 시간 타이머 (1초)
  useFocusEffect(
    useCallback(() => {
      if (paused) return;
      const id = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(id);
    }, [paused]),
  );

  // 콜백 안에서 최신 paused 를 읽기 위한 ref
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const lastPos = useRef<{ lat: number; lon: number } | null>(null);

  // GPS watch — 마운트 시 1회 시작, 언마운트 시 정리.
  useEffect(() => {
    let watchId: number | null = null;
    let cancelled = false;

    (async () => {
      if (!(await ensureLocationPermission()) || cancelled) return;
      watchId = Geolocation.watchPosition(
        (pos) => {
          setGpsReady(true);
          const { latitude, longitude, accuracy } = pos.coords;
          if (accuracy != null && accuracy > MAX_ACCURACY_M) return; // 부정확한 fix 무시

          const prev = lastPos.current;
          lastPos.current = { lat: latitude, lon: longitude };
          // 일시정지 중엔 기준점만 갱신하고 거리는 더하지 않는다(재개 시 점프 방지).
          if (pausedRef.current || !prev) return;

          const d = haversineMeters(prev.lat, prev.lon, latitude, longitude);
          if (d >= MIN_STEP_M && d <= MAX_STEP_M) setDistM((m) => m + d);
        },
        () => {
          // 위치 오류는 조용히 무시 (다음 fix 를 기다린다)
        },
        { enableHighAccuracy: true, distanceFilter: 0, maximumAge: 1000 },
      );
    })();

    return () => {
      cancelled = true;
      if (watchId != null) Geolocation.clearWatch(watchId);
    };
  }, []);

  const distKm = distM / 1000;
  // 평균 페이스(초/km). 20m 미만에선 값이 튀므로 0(표시: --'--").
  const paceSpk = distKm > 0.02 ? tick / distKm : 0;

  return { tick, sec: tick, distKm, paceSpk, gpsReady };
};
