import axios, { type AxiosInstance } from 'axios';

import { getEnvConfig } from '@/constants/env';
import type {
  AiCoachingRequestDto,
  AiCoachingResultDto,
  AiCoachingWithVoiceDto,
  AiCoachingUpdateDto,
  CoachingRequestWire,
  CoachingResponseWire,
  CoachingWithVoiceResponseWire,
  CoachingUpdateWire,
} from '@/types/aiApi';

// AI 코칭 서버는 백엔드와 별도 주소를 쓰고 인증이 없다.
// 응답도 { status, message, data } 래퍼 없이 객체를 그대로 반환하므로 전용 클라이언트를 둔다.
const createAiClient = (): AxiosInstance => {
  const { aiApiBaseUrl } = getEnvConfig();

  return axios.create({
    baseURL: aiApiBaseUrl,
    // Render 무료 티어 콜드 스타트로 AI 생성 요청이 느릴 수 있어 백엔드보다 여유 있게 둔다.
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

const aiClient = createAiClient();

// ─── 와이어 포맷(snake_case) ↔ 앱 DTO(camelCase) 매핑 ───────────────

const toRequestWire = (dto: AiCoachingRequestDto): CoachingRequestWire => ({
  activity_id: dto.activityId,
  pace: dto.pace,
  heart_rate: dto.heartRate,
  cadence: dto.cadence,
  foot_side: dto.footSide ?? null,
  pronation_type: dto.pronationType ?? null,
  heel_strike_rate: dto.heelStrikeRate ?? null,
  hitmap_json: dto.hitmapJson ?? null,
});

const toUpdateWire = (dto: AiCoachingUpdateDto): CoachingUpdateWire => ({
  feedback_text: dto.feedbackText,
  focus_point: dto.focusPoint,
  rec_exercise: dto.recExercise,
});

const fromResponseWire = (wire: CoachingResponseWire): AiCoachingResultDto => ({
  coachingId: wire.coaching_id,
  activityId: wire.activity_id,
  feedbackText: wire.feedback_text,
  focusPoint: wire.focus_point,
  recExercise: wire.rec_exercise,
});

const fromVoiceResponseWire = (
  wire: CoachingWithVoiceResponseWire,
): AiCoachingWithVoiceDto => ({
  ...fromResponseWire(wire),
  voiceFile: wire.voice_file,
});

// ─── 엔드포인트 ────────────────────────────────────────────────────

/** AI 코칭 생성 — POST /ai/coaching (음성 파일 경로 포함 응답) */
export const createCoaching = async (
  body: AiCoachingRequestDto,
): Promise<AiCoachingWithVoiceDto> => {
  const res = await aiClient.post<CoachingWithVoiceResponseWire>(
    '/ai/coaching',
    toRequestWire(body),
  );
  return fromVoiceResponseWire(res.data);
};

/** 러닝 기록별 AI 코칭 리스트 조회 — GET /ai/coaching?activity_id= */
export const readCoachingsByActivity = async (
  activityId: number,
): Promise<AiCoachingResultDto[]> => {
  const res = await aiClient.get<CoachingResponseWire[]>('/ai/coaching', {
    params: { activity_id: activityId },
  });
  return res.data.map(fromResponseWire);
};

/** AI 코칭 단건 조회 — GET /ai/coaching/{coachingId} */
export const readCoaching = async (
  coachingId: number,
): Promise<AiCoachingResultDto> => {
  const res = await aiClient.get<CoachingResponseWire>(`/ai/coaching/${coachingId}`);
  return fromResponseWire(res.data);
};

/** AI 코칭 수정 — PATCH /ai/coaching/{coachingId} */
export const updateCoaching = async (
  coachingId: number,
  body: AiCoachingUpdateDto,
): Promise<AiCoachingResultDto> => {
  const res = await aiClient.patch<CoachingResponseWire>(
    `/ai/coaching/${coachingId}`,
    toUpdateWire(body),
  );
  return fromResponseWire(res.data);
};

/** AI 코칭 삭제 — DELETE /ai/coaching/{coachingId} */
export const deleteCoaching = async (coachingId: number): Promise<void> => {
  await aiClient.delete(`/ai/coaching/${coachingId}`);
};

/**
 * 코칭 응답의 voiceFile(예: "/audio/coach_xxxx.mp3")을 재생 가능한 절대 URL 로 변환한다.
 * 이미 절대 URL 이면 그대로 반환하고, 값이 없으면 null 을 반환한다.
 */
export const resolveVoiceUrl = (voiceFile: string | null | undefined): string | null => {
  if (!voiceFile) return null;
  if (/^https?:\/\//i.test(voiceFile)) return voiceFile;
  const { aiApiBaseUrl } = getEnvConfig();
  return `${aiApiBaseUrl}${voiceFile.startsWith('/') ? '' : '/'}${voiceFile}`;
};
