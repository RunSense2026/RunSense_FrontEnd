import axios, { type AxiosInstance } from 'axios';

import { getEnvConfig } from '@/constants/env';
import type {
  AiCoachingRequestDto,
  AiCoachingResultDto,
  AiCoachingWithVoiceDto,
  AiCoachingUpdateDto,
  AiCoachingReportDto,
  CoachingRequestWire,
  CoachingResponseWire,
  CoachingWithVoiceResponseWire,
  CoachingUpdateWire,
  CoachingReportResponseWire,
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
  coachingId: wire.coaching_id,
  feedbackText: wire.feedback_text,
  focusPoint: wire.focus_point,
  recExercise: wire.rec_exercise,
  voiceFile: wire.voice_file,
});

const fromReportWire = (wire: CoachingReportResponseWire): AiCoachingReportDto => ({
  reportId: wire.report_id,
  activityId: wire.activity_id,
  summaryTitle: wire.summary_title,
  totalCoachingCount: wire.total_coaching_count,
  items: wire.items.map((it) => ({
    title: it.title,
    description: it.description,
    recExercise: it.rec_exercise,
    count: it.count,
  })),
});

// ─── 엔드포인트 ────────────────────────────────────────────────────

/** 실시간 AI 코칭 생성 — POST /ai/coaching (러닝 중 1분 간격 호출, 음성 파일 경로 포함 응답) */
export const createCoaching = async (
  body: AiCoachingRequestDto,
): Promise<AiCoachingWithVoiceDto> => {
  const res = await aiClient.post<CoachingWithVoiceResponseWire>(
    '/ai/coaching',
    toRequestWire(body),
  );
  return fromVoiceResponseWire(res.data);
};

/**
 * AI 코칭 요약 리포트 생성·저장 — POST /ai/coaching/report
 * 러닝 종료 후 백엔드에 기록을 저장해 받은 activityId 로 호출한다(서버가 코칭들을 요약).
 */
export const createCoachingReport = async (
  activityId: number,
): Promise<AiCoachingReportDto> => {
  const res = await aiClient.post<CoachingReportResponseWire>(
    '/ai/coaching/report',
    { activity_id: activityId },
    { timeout: 60000 }, // 요약 생성(LLM)이 길 수 있어 여유 있게
  );
  return fromReportWire(res.data);
};

/** 저장된 AI 코칭 요약 리포트 조회 — GET /ai/coaching/report/{activityId} */
export const readCoachingReport = async (
  activityId: number,
): Promise<AiCoachingReportDto> => {
  const res = await aiClient.get<CoachingReportResponseWire>(
    `/ai/coaching/report/${activityId}`,
  );
  return fromReportWire(res.data);
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
