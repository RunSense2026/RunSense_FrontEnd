import axios from 'axios';
import { getEnvConfig } from '@/constants/env';
import type { PublicApiResponse, WeatherItem, AirQualityItem, AirForecastItem } from '@/types/publicApi';

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