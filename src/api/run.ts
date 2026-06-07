import { apiClient } from './client';
import type {
  ApiResponse,
  RunningActivityCreateRequestDto,
  RunningActivityResponseDto,
  RunningActivityListResponseDto,
  RunningActivityDetailResponseDto,
} from '@/types/api';

/** 러닝 기록 생성 — POST /api/run (인증 필요) */
export const saveRun = async (
  body: RunningActivityCreateRequestDto,
): Promise<RunningActivityResponseDto> => {
  const res = await apiClient.post<ApiResponse<RunningActivityResponseDto>>(
    '/api/run',
    body,
  );
  return res.data.data;
};

/** 모든 기간 러닝 기록 리스트 조회 — GET /api/run (인증 필요) */
export const readAllRuns = async (): Promise<RunningActivityListResponseDto> => {
  const res = await apiClient.get<ApiResponse<RunningActivityListResponseDto>>(
    '/api/run',
  );
  return res.data.data;
};

/**
 * 특정 기간 내 러닝 기록 리스트 조회 — GET /api/run/date (인증 필요)
 * @param startDate 시작일 (YYYY-MM-DD)
 * @param endDate   종료일 (YYYY-MM-DD)
 */
export const readRunsByDate = async (
  startDate: string,
  endDate: string,
): Promise<RunningActivityListResponseDto> => {
  const res = await apiClient.get<ApiResponse<RunningActivityListResponseDto>>(
    '/api/run/date',
    { params: { startDate, endDate } },
  );
  return res.data.data;
};

/** 러닝 기록 단건 상세 조회 — GET /api/run/{activityId} (인증 필요) */
export const readRun = async (
  activityId: number,
): Promise<RunningActivityDetailResponseDto> => {
  const res = await apiClient.get<ApiResponse<RunningActivityDetailResponseDto>>(
    `/api/run/${activityId}`,
  );
  return res.data.data;
};
