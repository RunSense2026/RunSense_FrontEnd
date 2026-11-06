import { apiClient } from './client';
import { toCoachingRequestWire, fromVoiceResponseWire } from './ai';
import type {
  ApiResponse,
  RunCoachingRequestDto,
  RunCoachingResponseDto,
  RunningActivityCreateRequestDto,
  RunningActivityResponseDto,
  RunningActivityListResponseDto,
  RunningActivityDetailResponseDto,
} from '@/types/api';
import type { AiCoachingRequestDto, AiCoachingWithVoiceDto } from '@/types/aiApi';

/** 백엔드가 AI 서버(LLM + TTS)를 거쳐 응답하므로 기본 15초로는 부족하다 */
const RUN_COACHING_TIMEOUT_MS = 45000;

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

/** 러닝 기록 삭제 — DELETE /api/run/{activityId} (인증 필요). 삭제된 activityId 반환 */
export const deleteRun = async (activityId: number): Promise<number> => {
  const res = await apiClient.delete<ApiResponse<number>>(`/api/run/${activityId}`);
  return res.data.data;
};

/**
 * 실시간 AI 코칭 (백엔드 경유) — POST /api/run/coaching (인증 필요)
 * 백엔드가 AI 서버 POST /ai/coaching 에 그대로 전달한다. 응답의 voiceFile 은 AI 서버 경로이므로
 * resolveVoiceUrl 로 AI 서버 주소를 붙여 재생한다. 백엔드가 profile 을 받지 않아 개인화는 빠진다.
 */
export const createRunCoaching = async (
  body: AiCoachingRequestDto,
): Promise<AiCoachingWithVoiceDto> => {
  const payload: RunCoachingRequestDto = toCoachingRequestWire({ ...body, profile: null });
  const res = await apiClient.post<ApiResponse<RunCoachingResponseDto>>('/api/run/coaching', payload, {
    timeout: RUN_COACHING_TIMEOUT_MS,
  });
  return fromVoiceResponseWire(res.data.data);
};
