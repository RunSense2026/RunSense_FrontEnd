import Config from 'react-native-config';

// API 서버 주소 및 공공 API 주소는 .env 에서만 주입한다. (.env 는 gitignore 됨)
interface EnvConfig {
  apiBaseUrl: string;
  airKoreaApiUrl: string; // 에어코리아 API 엔드포인트
  kmaApiUrl: string;      // 기상청 API 엔드포인트
  publicApiKey: string;   // 공공데이터포털 공통 서비스 키
  env: 'development' | 'production';
}

export const getEnvConfig = (): EnvConfig => {
  const apiBaseUrl = Config.API_BASE_URL ?? '';
  const airKoreaApiUrl = Config.AIR_KOREA_API_URL ?? '';
  const kmaApiUrl = Config.KMA_API_URL ?? '';
  const publicApiKey = Config.PUBLIC_API_KEY ?? '';

  if (__DEV__) {
    // eslint-disable-next-line no-console
    if (!apiBaseUrl) console.warn('[env] API_BASE_URL 이 설정되지 않았습니다. 프로젝트 루트의 .env 파일을 확인하세요.');
    // eslint-disable-next-line no-console
    if (!publicApiKey) console.warn('[env] PUBLIC_API_KEY 가 설정되지 않았습니다.');
  }

  return {
    apiBaseUrl,
    airKoreaApiUrl,
    kmaApiUrl,
    publicApiKey,
    env: (Config.ENV as EnvConfig['env']) ?? 'development',
  };
};