import Config from 'react-native-config';

// API 서버 주소는 .env 에서만 주입한다. (.env 는 gitignore 됨)
// 공공데이터(기상청·에어코리아)와 역지오코딩은 백엔드 `/api/public/*` 가 대신 호출하므로,
// 앱에는 공공데이터포털 서비스 키를 두지 않는다.
interface EnvConfig {
  apiBaseUrl: string;
  aiApiBaseUrl: string; // AI 코칭 서버 엔드포인트 (백엔드와 별도)
  env: 'development' | 'production';
}

export const getEnvConfig = (): EnvConfig => {
  const apiBaseUrl = Config.API_BASE_URL ?? '';
  const aiApiBaseUrl = Config.AI_API_BASE_URL ?? '';

  if (__DEV__) {
    // eslint-disable-next-line no-console
    if (!apiBaseUrl) console.warn('[env] API_BASE_URL 이 설정되지 않았습니다. 프로젝트 루트의 .env 파일을 확인하세요.');
    // eslint-disable-next-line no-console
    if (!aiApiBaseUrl) console.warn('[env] AI_API_BASE_URL 이 설정되지 않았습니다. AI 코칭 연동이 동작하지 않습니다.');
  }

  return {
    apiBaseUrl,
    aiApiBaseUrl,
    env: (Config.ENV as EnvConfig['env']) ?? 'development',
  };
};
