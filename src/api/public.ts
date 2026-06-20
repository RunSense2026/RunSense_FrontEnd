import axios from 'axios';
import { getEnvConfig } from '@/constants/env';
import { wgs84ToTM } from '@/utils/tmCoord';
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
    `&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;

  const res = await axios.get(requestUrl);

  // 공공 API 에러 발생 시 JSON이 아닌 XML 텍스트로 에러 내용을 반환하는 경우를 방어합니다.
  if (typeof res.data === 'string') {
    throw new Error('API 연동 에러 - 콘솔 로그를 확인하세요.');
  }
  if (!res.data?.response?.body?.items?.item) {
    throw new Error('기상청 데이터 응답 구조가 다릅니다.');
  }
  
  return res.data.response.body.items.item;
};

/**
 * 기상청 초단기예보(getUltraSrtFcst)에서 하늘상태(SKY) 코드를 조회한다.
 * 초단기실황(getUltraSrtNcst)에는 강수형태(PTY)만 있고 구름 정보가 없어, 맑음/구름낌 판별에 필요하다.
 * SKY 코드: 1=맑음, 3=구름많음, 4=흐림. 실패 시 undefined(아이콘은 PTY만으로 폴백).
 */
export const fetchSkyCode = async (
  nx: number,
  ny: number,
): Promise<string | undefined> => {
  try {
    const { kmaApiUrl, publicApiKey } = getEnvConfig();

    // 초단기예보는 매시 30분에 생성되어 45분 이후 제공된다. 45분 이전이면 직전 시각으로 요청.
    const now = new Date();
    if (now.getMinutes() < 45) {
      now.setHours(now.getHours() - 1);
    }
    const baseDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const baseTime = `${String(now.getHours()).padStart(2, '0')}30`;

    const requestUrl = `${kmaApiUrl}/getUltraSrtFcst` +
      `?serviceKey=${publicApiKey}` +
      `&pageNo=1&numOfRows=60&dataType=JSON` +
      `&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;

    const res = await axios.get(requestUrl);
    const items: WeatherItem[] | undefined = res.data?.response?.body?.items?.item;
    if (!Array.isArray(items)) return undefined;

    // 가장 가까운 예보시각의 SKY 값을 사용.
    const skies = items.filter((i) => i.category === 'SKY');
    if (skies.length === 0) return undefined;
    skies.sort((a, b) => Number(a.fcstTime ?? 0) - Number(b.fcstTime ?? 0));
    return skies[0].fcstValue ?? skies[0].obsrValue;
  } catch {
    return undefined;
  }
};

/** 좌표 기반으로 찾은 최근접 대기질 측정소 */
export interface NearbyStation {
  /** 측정소명 — getMsrstnAcctoRltmMesureDnsty 의 stationName 으로 사용 */
  stationName: string;
  /** 측정소 주소 */
  addr: string;
  /** 입력 좌표로부터의 거리(km) */
  tm: number;
}

/**
 * 위경도 → 최근접 대기질 측정소 조회.
 * 좌표를 TM(중부원점)으로 변환 후 에어코리아 getNearbyMsrstnList 로 가장 가까운 측정소를 찾는다.
 * 자치구명을 그대로 측정소명으로 쓰면 매칭이 안 되는 지역(예: 고양시 덕양구)을 해결한다.
 * 실패 시 null 을 반환하므로 호출부에서 폴백한다.
 */
export const fetchNearestStation = async (
  lat: number,
  lon: number,
): Promise<NearbyStation | null> => {
  try {
    const { airKoreaApiUrl, publicApiKey } = getEnvConfig();
    // 근접측정소는 대기질(ArpltnInforInqireSvc)이 아닌 측정소정보(MsrstnInfoInqireSvc) 서비스 경로.
    const baseUrl = airKoreaApiUrl.replace('ArpltnInforInqireSvc', 'MsrstnInfoInqireSvc');
    const { tmX, tmY } = wgs84ToTM(lat, lon);

    const requestUrl = `${baseUrl}/getNearbyMsrstnList` +
      `?serviceKey=${publicApiKey}` +
      `&returnType=json&numOfRows=10&pageNo=1` +
      `&tmX=${tmX}&tmY=${tmY}&ver=1.1`;

    const res = await axios.get(requestUrl);
    if (typeof res.data === 'string') return null;

    const items = res.data?.response?.body?.items;
    if (!Array.isArray(items) || items.length === 0) return null;

    // API 가 거리 오름차순으로 주지만, 안전하게 tm(거리) 최소값을 고른다.
    const sorted = [...items].sort((a, b) => Number(a.tm ?? 1e9) - Number(b.tm ?? 1e9));
    const s = sorted[0];
    if (!s?.stationName) return null;

    return { stationName: s.stationName, addr: s.addr ?? '', tm: Number(s.tm ?? 0) };
  } catch {
    return null;
  }
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

  const res = await axios.get(requestUrl);

  if (typeof res.data === 'string') {
    throw new Error('대기질 API 연동 에러');
  }

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