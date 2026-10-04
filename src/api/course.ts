import { apiClient } from './client';
import type { ApiResponse, NearbyParkQuery, ParkResponseDto, ParkListResponseDto } from '@/types/api';

/** Render 무료 티어 콜드 스타트를 감안한 타임아웃 */
const COURSE_TIMEOUT_MS = 25000;

/**
 * 주변 공원 추천 — GET /api/course/nearby (인증 필요)
 * 현재 위치에서 직선거리가 가까운 공원을 순위대로 받는다. 묘지공원은 서버가 제외한다.
 * tags 는 Spring 이 읽는 `tags=a&tags=b` 형태(대괄호 없이 반복)로 보낸다.
 */
export const fetchNearbyParks = async ({
  lat,
  lon,
  limit,
  minArea,
  tags,
}: NearbyParkQuery): Promise<ParkResponseDto[]> => {
  const res = await apiClient.get<ApiResponse<ParkListResponseDto>>('/api/course/nearby', {
    params: { lat, lon, limit, minArea, tags: tags?.length ? tags : undefined },
    paramsSerializer: { indexes: null },
    timeout: COURSE_TIMEOUT_MS,
  });
  return res.data.data?.parks ?? [];
};
