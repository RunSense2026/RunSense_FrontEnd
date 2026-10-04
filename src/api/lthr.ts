import { apiClient } from './client';
import type {
  ApiResponse,
  LthrRecordCreateRequestDto,
  LthrRecordResponseDto,
} from '@/types/api';

/**
 * LTHR 테스트 결과 저장 — POST /api/lthr (인증 필요)
 * 기록이 쌓이고, 유저 프로필의 LTHR·안정시 심박수도 이 값으로 갱신된다.
 */
export const createLthrRecord = async (
  body: LthrRecordCreateRequestDto,
): Promise<LthrRecordResponseDto> => {
  const res = await apiClient.post<ApiResponse<LthrRecordResponseDto>>('/api/lthr', body);
  return res.data.data;
};

/** 마지막 LTHR 테스트 기록 — GET /api/lthr/latest (인증 필요). 기록이 없으면 null */
export const readLatestLthrRecord = async (): Promise<LthrRecordResponseDto | null> => {
  const res = await apiClient.get<ApiResponse<LthrRecordResponseDto | null>>('/api/lthr/latest');
  return res.data.data;
};
