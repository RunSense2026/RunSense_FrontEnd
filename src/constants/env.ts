import Config from 'react-native-config';

interface EnvConfig {
  apiBaseUrl: string;
  apiVersion: string;
  env: 'development' | 'production';
}

export const getEnvConfig = (): EnvConfig => {
  return {
    apiBaseUrl: Config.API_BASE_URL ?? '',
    apiVersion: Config.API_VERSION ?? 'v1',
    env: (Config.ENV as EnvConfig['env']) ?? 'development',
  };
};

export const buildAuthUrl = (path: string): string => {
  const { apiBaseUrl, apiVersion } = getEnvConfig();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}/${apiVersion}/auth${normalized}`;
};

export const buildApiUrl = (path: string): string => {
  const { apiBaseUrl, apiVersion } = getEnvConfig();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}/${apiVersion}${normalized}`;
};
