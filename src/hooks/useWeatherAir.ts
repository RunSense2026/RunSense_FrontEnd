import { useState, useEffect } from 'react';

import { fetchWeather, fetchAirQuality } from '@/api';
import type { WeatherResponseDto, AirQualityResponseDto } from '@/types/api';

import type { ResolvedLocation } from './useResolvedLocation';

/** 대기질 조회 실패 시 다시 시도하기까지의 간격(ms) */
const AIR_RETRY_MS = 20000;

/** 날씨 조회 상태 — 홈/코스 카드가 로딩·에러·값을 그대로 그린다. */
export interface WeatherState {
  weather: WeatherResponseDto | null;
  loading: boolean;
  error: string | null;
}

/**
 * 현재 위치의 날씨 조회 (`GET /api/public/weather`).
 * 좌표가 정해지는 즉시(`ready`) 조회하고, 위치가 갱신되면 다시 조회한다.
 *
 * 대기질은 따로 조회한다(useAirQuality) — 공공 API 서버가 달라
 * 한쪽(에어코리아)이 느리거나 죽어도 날씨는 그대로 뜨게 하기 위함이다.
 */
export const useWeather = ({ lat, lon, ready }: ResolvedLocation): WeatherState => {
  const [weather, setWeather] = useState<WeatherResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWeather(lat, lon);
        if (cancelled) return;
        setWeather(data);
      } catch {
        if (cancelled) return;
        setError('날씨 정보를 불러오지 못했어요.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, lat, lon]);

  return { weather, loading, error };
};

/**
 * 현재 위치의 대기질 조회 (`GET /api/public/air-quality`).
 * 실패해도 날씨 표시에는 영향을 주지 않는다 — 직전 값을 유지한 채 잠시 뒤 한 번 더 시도한다.
 * (에어코리아 혼잡으로 백엔드가 502 를 주는 일이 잦다)
 */
export const useAirQuality = ({ lat, lon, ready }: ResolvedLocation): AirQualityResponseDto | null => {
  const [air, setAir] = useState<AirQualityResponseDto | null>(null);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const load = () => {
      fetchAirQuality(lat, lon)
        .then((data) => {
          if (!cancelled && data) setAir(data);
        })
        .catch(() => {
          if (!cancelled) retryTimer = setTimeout(load, AIR_RETRY_MS);
        });
    };
    load();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [ready, lat, lon]);

  return air;
};
