import axios from 'axios';
import { getEnvConfig } from '@/constants/env';
import { wgs84ToTM } from '@/utils/tmCoord';
import type { WeatherItem, AirQualityItem, AirForecastItem } from '@/types/publicApi';

// 공공데이터포털(data.go.kr)은 트래픽이 몰리면 간헐적으로 504 SERVICETIMEOUT_ERROR 를 돌려준다.
// (에어코리아 실시간 측정 조회는 체감 실패율이 높다) 타임아웃 없이 기다리다 화면이 멈추지 않도록
// 제한을 두고, '일시적'으로 판정된 오류만 간격을 늘려가며 재시도한다.
const PUBLIC_TIMEOUT_MS = 10000;
const PUBLIC_RETRIES = 2;
/** 재시도 간격(ms) — attempt 번째 실패 후 대기 시간 */
const RETRY_BACKOFF_MS = [800, 1600, 3200, 5000];

/** 서버 혼잡 등 잠시 뒤 다시 하면 될 오류 코드 (그 외 — 키·파라미터·쿼터 오류는 재시도 무의미) */
const TRANSIENT_MSG = /SERVICETIMEOUT|TIMEOUT|BUSY|INTERNAL_ERROR|UNKNOWN_ERROR/i;

/** data.go.kr 오류를 재시도 가능 여부와 함께 나타내는 에러 */
class PublicApiError extends Error {
  constructor(message: string, readonly transient: boolean) {
    super(message);
    this.name = 'PublicApiError';
  }
}

/** 재시도할 만한 일시적 오류인지 — 타임아웃/네트워크 끊김/5xx 또는 일시적 오류 코드 */
const isRetryable = (e: unknown): boolean => {
  if (e instanceof PublicApiError) return e.transient;
  if (!axios.isAxiosError(e)) return false;
  const status = e.response?.status;
  return !e.response || e.code === 'ECONNABORTED' || (status !== undefined && status >= 500);
};

/**
 * 응답 본문에 실린 오류를 찾아낸다(정상이면 null).
 * data.go.kr 은 오류를 (1) XML 문자열, (2) `OpenAPI_ServiceResponse` 봉투,
 * (3) 200 + `response.header.resultCode !== '00'` 세 가지 형태로 준다.
 */
const findApiError = (data: unknown): PublicApiError | null => {
  if (typeof data === 'string') return new PublicApiError('오류 응답(XML)', false);

  const body = data as {
    OpenAPI_ServiceResponse?: { cmmMsgHeader?: { errMsg?: string; returnAuthMsg?: string } };
    response?: { header?: { resultCode?: string; resultMsg?: string } };
  };

  const envelope = body?.OpenAPI_ServiceResponse?.cmmMsgHeader;
  if (envelope) {
    const msg = envelope.errMsg ?? envelope.returnAuthMsg ?? '알 수 없는 오류';
    return new PublicApiError(msg, TRANSIENT_MSG.test(msg));
  }

  const header = body?.response?.header;
  if (header?.resultCode && header.resultCode !== '00') {
    const msg = header.resultMsg ?? header.resultCode;
    return new PublicApiError(msg, TRANSIENT_MSG.test(msg));
  }

  return null;
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 기상청 응답 봉투 — items.item 배열 */
interface KmaEnvelope {
  response?: { body?: { items?: { item?: WeatherItem[] } } };
}

/** 에어코리아 응답 봉투 — items 배열 */
interface AirKoreaEnvelope<T> {
  response?: { body?: { items?: T[] } };
}

/** 근접 측정소 항목 (getNearbyMsrstnList) */
interface NearbyStationItem {
  stationName?: string;
  addr?: string;
  tm?: string | number;
}

/** 공공 API GET — 타임아웃을 걸고, 일시적 오류만 간격을 늘려가며 재시도한다. */
const getPublic = async <T>(
  url: string,
  { retries = PUBLIC_RETRIES, timeout = PUBLIC_TIMEOUT_MS } = {},
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await axios.get(url, { timeout });
      const apiError = findApiError(res.data);
      if (apiError) throw apiError;
      return res.data as T;
    } catch (e) {
      lastError = e;
      if (attempt === retries || !isRetryable(e)) break;
      await delay(RETRY_BACKOFF_MS[Math.min(attempt, RETRY_BACKOFF_MS.length - 1)]);
    }
  }
  if (__DEV__) {
    // 실패 원인 파악용 — 키가 노출되지 않도록 쿼리스트링은 제외하고 남긴다.
    // eslint-disable-next-line no-console
    console.warn('[public-api] 요청 실패:', url.split('?')[0], String(lastError));
  }
  throw lastError;
};

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

  const data = await getPublic<KmaEnvelope>(requestUrl);
  const items = data?.response?.body?.items?.item;
  if (!items) {
    throw new Error('기상청 데이터 응답 구조가 다릅니다.');
  }

  return items;
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

    const data = await getPublic<KmaEnvelope>(requestUrl);
    const items: WeatherItem[] | undefined = data?.response?.body?.items?.item;
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

    // 측정소 조회가 늦어지면 날씨 표시 자체가 밀리므로, 짧게 한 번만 시도하고 실패 시 자치구명으로 폴백한다.
    const data = await getPublic<AirKoreaEnvelope<NearbyStationItem>>(requestUrl, {
      retries: 0,
      timeout: 6000,
    });
    const items = data?.response?.body?.items;
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

  // ver=1.3 을 줘야 PM2.5(pm25Value·pm25Grade)가 응답에 포함된다. (미지정 시 PM10 항목만 내려옴)
  const requestUrl = `${airKoreaApiUrl}/getMsrstnAcctoRltmMesureDnsty` +
    `?serviceKey=${publicApiKey}` +
    `&returnType=json&numOfRows=1&pageNo=1&ver=1.3` +
    `&stationName=${encodeURIComponent(stationName)}&dataTerm=DAILY`;

  // 이 엔드포인트가 유독 자주 혼잡(504)하므로 재시도를 넉넉히 준다. (날씨 표시를 막지 않는 백그라운드 조회)
  const data = await getPublic<AirKoreaEnvelope<AirQualityItem>>(requestUrl, { retries: 3 });
  const items = data?.response?.body?.items;
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

  const data = await getPublic<AirKoreaEnvelope<AirForecastItem>>(requestUrl);
  const items = data?.response?.body?.items;
  return items && items.length > 0 ? items[0] : null;
};