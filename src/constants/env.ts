import Config from 'react-native-config';

// API 서버 주소는 .env 의 API_BASE_URL 로만 주입한다. (.env 는 gitignore 됨)
// 값이 비어 있으면 .env 누락이므로 개발 중 콘솔에 경고를 남긴다.
interface EnvConfig {
  apiBaseUrl: string;
  env: 'development' | 'production';
}

export const getEnvConfig = (): EnvConfig => {
  const apiBaseUrl = Config.API_BASE_URL ?? '';

  if (__DEV__ && !apiBaseUrl) {
    // eslint-disable-next-line no-console
    console.warn('[env] API_BASE_URL 이 설정되지 않았습니다. 프로젝트 루트에 .env 파일을 확인하세요.');
  }

  return {
    apiBaseUrl,
    env: (Config.ENV as EnvConfig['env']) ?? 'development',
  };
};
