import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

import { getEnvConfig } from '@/constants/env';
import type { ApiResponse, UserTokenResponseDto } from '@/types/api';
import { accessToken, refreshToken, setTokens, clearTokens } from '@/utils/storage';

// 백엔드 경로는 모두 `/api/...` 형태이고 별도 버전 세그먼트가 없다.
// baseURL 은 서버 루트로 두고, 각 엔드포인트에서 전체 경로(`/api/users/login` 등)를 지정한다.
const createApiClient = (): AxiosInstance => {
  const { apiBaseUrl } = getEnvConfig();

  const client = axios.create({
    baseURL: apiBaseUrl,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use((config) => {
    const token = accessToken.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => handleAuthError(client, error),
  );

  return client;
};

// 401 이 오면 refreshToken 으로 accessToken 을 한 번 재발급받고 원요청을 재시도한다.
// 동시에 여러 요청이 401 을 받아도 재발급은 한 번만 수행되도록 in-flight 프라미스를 공유한다.
let refreshPromise: Promise<string | null> | null = null;

const reissueTokens = async (): Promise<string | null> => {
  const refresh = refreshToken.get();
  if (!refresh) return null;

  try {
    // 재발급은 인터셉터를 다시 타지 않도록 순수 axios 로 호출한다.
    const { apiBaseUrl } = getEnvConfig();
    const res = await axios.post<ApiResponse<UserTokenResponseDto>>(
      `${apiBaseUrl}/api/users/reissue`,
      { refreshToken: refresh },
      { headers: { 'Content-Type': 'application/json' } },
    );
    const data = res.data.data;
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
};

const handleAuthError = async (client: AxiosInstance, error: AxiosError): Promise<unknown> => {
  const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

  const isUnauthorized = error.response?.status === 401;
  const canRetry = original && !original._retry && !!refreshToken.get();

  // reissue 요청 자체가 실패한 경우엔 재시도하지 않는다.
  const isReissueCall = original?.url?.includes('/api/users/reissue');

  if (isUnauthorized && canRetry && !isReissueCall) {
    original._retry = true;

    if (!refreshPromise) {
      refreshPromise = reissueTokens().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;

    if (newToken) {
      original.headers.Authorization = `Bearer ${newToken}`;
      return client(original);
    }
  }

  if (isUnauthorized) {
    clearTokens();
  }
  return Promise.reject(error);
};

export const apiClient = createApiClient();
