import axios from 'axios';

import type {
  ApiResponse,
  WeatherResponseDto,
  LocationResponseDto,
  AirQualityResponseDto,
} from '@/types/api';

import { apiClient } from './client';

// 날씨·위치·대기질은 백엔드의 `/api/public/*` 를 통해 조회한다.
// (기상청 격자 변환·에어코리아 측정소 탐색·서비스 키 관리는 모두 서버가 담당하고,
//  프론트는 위경도만 넘긴다. 앱에 공공데이터 키를 굽지 않아도 되고, 키 교체도 서버 배포로 끝난다.)
//
// 실패 형태는 두 가지다 — 백엔드 자체 오류(500)와 공공데이터 API 통신 오류(502).
// 둘 다 잠시 뒤면 풀리는 경우가 많아(특히 에어코리아 혼잡) 간격을 늘려가며 재시도한다.

/** Render 무료 티어 콜드 스타트를 감안한 기본 타임아웃 */
const PUBLIC_TIMEOUT_MS = 25000;
const PUBLIC_RETRIES = 2;
/** 재시도 간격(ms) — attempt 번째 실패 후 대기 시간 */
const RETRY_BACKOFF_MS = [800, 1600, 3200, 5000];

/**
 * 대기질 전용 재시도 간격.
 * 에어코리아가 혼잡할 때는 실패 응답 자체가 5~10초 걸리고 그 구간이 수십 초 이어진다.
 * 짧은 간격으로 몰아치면 같은 혼잡 구간을 두드릴 뿐이라 간격을 넉넉히 벌린다.
 * (그래도 실패하면 호출부가 20초 주기로 다시 시도한다 — useAirQuality)
 */
const AIR_BACKOFF_MS = [2000, 6000];

/** 재시도할 만한 일시적 오류인지 — 네트워크 끊김/타임아웃/5xx(500·502·504) */
const isRetryable = (e: unknown): boolean => {
  if (!axios.isAxiosError(e)) return false;
  const status = e.response?.status;
  return !e.response || e.code === 'ECONNABORTED' || (status !== undefined && status >= 500);
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** `/api/public/*` GET — 위경도를 넘기고, 일시적 오류만 간격을 늘려가며 재시도한다. */
const getPublic = async <T>(
  path: string,
  lat: number,
  lon: number,
  { retries = PUBLIC_RETRIES, timeout = PUBLIC_TIMEOUT_MS, backoff = RETRY_BACKOFF_MS } = {},
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await apiClient.get<ApiResponse<T>>(path, { params: { lat, lon }, timeout });
      return res.data.data;
    } catch (e) {
      lastError = e;
      if (attempt === retries || !isRetryable(e)) break;
      await delay(backoff[Math.min(attempt, backoff.length - 1)]);
    }
  }
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn('[public-api] 요청 실패:', path, String(lastError));
  }
  throw lastError;
};

/**
 * 날씨 조회 — GET /api/public/weather
 * 기상청 초단기실황(기온·습도·풍속·강수형태) + 초단기예보(하늘상태)를 서버가 합쳐서 준다.
 */
export const fetchWeather = (lat: number, lon: number): Promise<WeatherResponseDto> =>
  getPublic<WeatherResponseDto>('/api/public/weather', lat, lon);

/**
 * 위치 역지오코딩 — GET /api/public/location
 * 화면 표시용 지역명을 조회한다. 지역명이 늦어도 날씨가 밀리지 않도록 짧게 한 번만 시도하고,
 * 실패 시 null 을 반환하므로 호출부에서 기본 위치명으로 폴백한다.
 */
export const reverseGeocode = async (
  lat: number,
  lon: number,
): Promise<LocationResponseDto | null> => {
  try {
    return await getPublic<LocationResponseDto>('/api/public/location', lat, lon, {
      retries: 0,
      timeout: 12000,
    });
  } catch {
    return null;
  }
};

/**
 * 대기질 조회 — GET /api/public/air-quality
 * 좌표 기준 최근접 측정소의 실시간 측정정보(PM10·PM2.5·통합지수)를 준다.
 *
 * 에어코리아는 혼잡할 때 `SERVICETIMEOUT_ERROR`(504) 를 자주 돌려주고(실측 실패율 50% 안팎),
 * 이 엔드포인트는 측정소 조회 + 측정값 조회로 그 API 를 두 번 타서 체감 실패율이 더 높다.
 * 백엔드는 그 실패를 502 로 전달한다. 여기서 몇 번 더 시도해 보되, 오래 물고 있지는 않는다 —
 * 최종 실패해도 호출부(useAirQuality)가 직전 값을 유지한 채 20초 주기로 다시 시도한다.
 */
export const fetchAirQuality = async (
  lat: number,
  lon: number,
): Promise<AirQualityResponseDto | null> => {
  const data = await getPublic<AirQualityResponseDto>('/api/public/air-quality', lat, lon, {
    retries: 2,
    backoff: AIR_BACKOFF_MS,
  });
  return data ?? null;
};
