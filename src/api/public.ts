import axios from 'axios';
import { getEnvConfig } from '@/constants/env';
import type { WeatherItem, AirQualityItem, AirForecastItem } from '@/types/publicApi';

/** 역지오코딩 결과 — 표시용 지역명 + 대기질 측정소로 쓸 자치구명 */
export interface GeoPlace {
  /** 화면 표시용 (예: "서울 · 강남구") */
  name: string;
  /** 자치구/시군구명 (예: "강남구") — 에어코리아 측정소명으로 사용 */
  gu: string;
}

const stripAdminSuffix = (s: string): string =>
  s.replace(/(특별자치시|특별자치도|특별시|광역시)$/u, '').trim() || s;

/**
 * 위경도 → 한국 행정구역명 역지오코딩 (OpenStreetMap Nominatim, 키 불필요).
 * 실패하면 null 을 반환하므로 호출부에서 기본 위치로 폴백한다.
 */
export const reverseGeocodeKo = async (lat: number, lon: number): Promise<GeoPlace | null> => {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${lat}&lon=${lon}&accept-language=ko&zoom=14`;

  const res = await axios.get(url, {
    timeout: 8000,
    headers: { 'User-Agent': 'RunSense/1.0 (running app)' },
  });

  const a = res.data?.address;
  if (!a) return null;

  const gu = (a.city_district || a.borough || a.county || a.city || a.town || '').replace(/\s/g, '');
  const si = stripAdminSuffix(a.city || a.province || a.state || a.region || '');
  const name = [si, gu].filter(Boolean).join(' · ') || a.display_name?.split(',')[0]?.trim() || '현재 위치';

  return { name, gu };
};

/** 기상청 날씨 데이터 조회 예시 */
export const fetchWeatherData = async (
  nx: number,
  ny: number,
): Promise<WeatherItem[]> => {
  const { kmaApiUrl, publicApiKey } = getEnvConfig();

  // 1. 기상청 초단기실황 API는 최신 시간(매시간 40분 이후 업데이트)으로 요청해야 합니다.
  const now = new Date();
  if (now.getMinutes() < 40) {
    now.setHours(now.getHours() - 1); // 40분 이전이면 이전 시간대의 데이터를 요청
  }
  const baseDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const baseTime = `${String(now.getHours()).padStart(2, '0')}00`; // 정시(00분) 기준

  // 2. axios params 객체 대신 직접 URL에 문자열을 결합하여 이중 인코딩 에러를 완벽 차단합니다.
  const requestUrl = `${kmaApiUrl}/getUltraSrtNcst` +
    `?serviceKey=${publicApiKey}` +
    `&pageNo=1&numOfRows=10&dataType=JSON` +
    `&base_date=${baseDate}&base_time=${baseTime}&nx=${Math.round(nx)}&ny=${Math.round(ny)}`;

  console.log('🌐 기상청 API 요청 URL:', requestUrl);

  const res = await axios.get(requestUrl);

  // 공공 API 에러 발생 시 JSON이 아닌 XML 텍스트로 에러 내용을 반환하는 경우를 방어합니다.
  if (typeof res.data === 'string') {
    console.error('기상청 API 에러 원인(XML):', res.data);
    throw new Error('API 연동 에러 - 콘솔 로그를 확인하세요.');
  }
  if (!res.data?.response?.body?.items?.item) {
    throw new Error('기상청 데이터 응답 구조가 다릅니다.');
  }
  
  return res.data.response.body.items.item;
};

/** 에어코리아 대기질(초미세먼지) 데이터 조회 */
export const fetchAirQualityData = async (
  stationName: string,
): Promise<AirQualityItem | null> => {
  const { airKoreaApiUrl, publicApiKey } = getEnvConfig();

  const requestUrl = `${airKoreaApiUrl}/getMsrstnAcctoRltmMesureDnsty` +
    `?serviceKey=${publicApiKey}` +
    `&returnType=json&numOfRows=1&pageNo=1` +
    `&stationName=${encodeURIComponent(stationName)}&dataTerm=DAILY`;

  console.log('🌐 에어코리아 API 요청 URL:', requestUrl);

  const res = await axios.get(requestUrl);

  if (typeof res.data === 'string') {
    console.error('에어코리아 API 에러 원인(XML):', res.data);
    throw new Error('대기질 API 연동 에러 - 콘솔 로그를 확인하세요.');
  }
  
  console.log('✅ 에어코리아 대기질 API 성공 응답:', res.data);

  const items = res.data?.response?.body?.items;
  return items && items.length > 0 ? items[0] : null;
};

/** 에어코리아 대기질 예보통보(텍스트/전망) 데이터 조회 */
export const fetchAirForecastData = async (
  searchDate: string,
  informCode: 'PM10' | 'PM25' | 'O3' = 'PM10',
): Promise<AirForecastItem | null> => {
  const { airKoreaApiUrl, publicApiKey } = getEnvConfig();

  const requestUrl = `${airKoreaApiUrl}/getMinuDustFrcstDspth` +
    `?serviceKey=${publicApiKey}` +
    `&returnType=json&numOfRows=1&pageNo=1` +
    `&searchDate=${searchDate}&InformCode=${informCode}`;

  const res = await axios.get(requestUrl);

  if (typeof res.data === 'string') {
    throw new Error('대기질 예보 API 연동 에러');
  }
  
  const items = res.data?.response?.body?.items;
  return items && items.length > 0 ? items[0] : null;
};