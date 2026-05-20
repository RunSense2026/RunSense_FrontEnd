import axios, { type AxiosInstance } from 'axios';

import { getEnvConfig } from '@/constants/env';
import { accessToken } from '@/utils/storage';

const createApiClient = (): AxiosInstance => {
  const { apiBaseUrl, apiVersion } = getEnvConfig();

  const client = axios.create({
    baseURL: `${apiBaseUrl}/${apiVersion}`,
    timeout: 10000,
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
    (error) => {
      if (error.response?.status === 401) {
        accessToken.clear();
      }
      return Promise.reject(error);
    },
  );

  return client;
};

export const apiClient = createApiClient();
