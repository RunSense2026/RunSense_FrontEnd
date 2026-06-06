import { apiClient } from './client';
import type {
  ApiResponse,
  RunningActivityCreateRequestDto,
  RunningActivityResponseDto,
  RunningActivityListResponseDto,
  RunningActivityDetailResponseDto,
} from '@/types/api';

/** 러닝 기록 생성 — POST /api/run/save (인증 필요) */
export const saveRun = async (
  body: RunningActivityCreateRequestDto,
): Promise<RunningActivityResponseDto> => {
  const res = await apiClient.post<ApiResponse<RunningActivityResponseDto>>(
    '/api/run/save',
    body,
  );
  return res.data.data;
};

/** 모든 기간 러닝 기록 리스트 조회 — POST /api/run/readAll (인증 필요) */
export const readAllRuns = async (): Promise<RunningActivityListResponseDto> => {
  const res = await apiClient.post<ApiResponse<RunningActivityListResponseDto>>(
    '/api/run/readAll',
  );
  return res.data.data;
};

/** 러닝 기록 단건 상세 조회 — POST /api/run/read/{activityId} (인증 필요) */
export const readRun = async (
  activityId: number,
): Promise<RunningActivityDetailResponseDto> => {
  const res = await apiClient.post<ApiResponse<RunningActivityDetailResponseDto>>(
    `/api/run/read/${activityId}`,
  );
  return res.data.data;
};
