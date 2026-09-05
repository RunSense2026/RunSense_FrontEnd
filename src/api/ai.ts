import axios, { type AxiosInstance } from 'axios';

import { getEnvConfig } from '@/constants/env';
import type {
  AiCoachingRequestDto,
  AiCoachingResultDto,
  AiCoachingWithVoiceDto,
  AiCoachingUpdateDto,
  AiCoachingLogDto,
  AiCoachingReportDto,
  AiFootDataDto,
  LthrAnalyzeRequestDto,
  LthrAnalyzeResponseDto,
  LthrCoachingRequestDto,
  LthrCoachingResponseDto,
  CoachingRequestWire,
  CoachingResponseWire,
  CoachingWithVoiceResponseWire,
  CoachingUpdateWire,
  CoachingReportCreateRequestWire,
  CoachingReportResponseWire,
  FootDataWire,
  LthrAnalyzeRequestWire,
  LthrAnalyzeResponseWire,
  LthrCoachingResponseWire,
} from '@/types/aiApi';

// AI 코칭 서버는 백엔드와 별도 주소를 쓰고 인증이 없다.
// 응답도 { status, message, data } 래퍼 없이 객체를 그대로 반환하므로 전용 클라이언트를 둔다.
const createAiClient = (): AxiosInstance => {
  const { aiApiBaseUrl } = getEnvConfig();

  return axios.create({
    baseURL: aiApiBaseUrl,
    // Render 무료 티어 콜드 스타트 + LLM 생성 + TTS 합성까지 걸리므로 백엔드보다 여유 있게 둔다.
    timeout: 45000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

const aiClient = createAiClient();

// ─── 와이어 포맷(snake_case) ↔ 앱 DTO(camelCase) 매핑 ───────────────

const toFootWire = (foot: AiFootDataDto): FootDataWire => ({
  pronation_type: foot.pronationType ?? null,
  heel_strike_rate: foot.heelStrikeRate ?? null,
  hitmap: {
    forefoot_left: foot.hitmap.forefootLeft,
    forefoot_right: foot.hitmap.forefootRight,
    midfoot_left: foot.hitmap.midfootLeft,
    midfoot_right: foot.hitmap.midfootRight,
    heel: foot.hitmap.heel,
  },
});

const toRequestWire = (dto: AiCoachingRequestDto): CoachingRequestWire => ({
  pace: dto.pace,
  heart_rate: Math.round(dto.heartRate),
  cadence: Math.round(dto.cadence),
  left_foot: toFootWire(dto.leftFoot),
  right_foot: toFootWire(dto.rightFoot),
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
  feedbackText: wire.feedback_text,
  focusPoint: wire.focus_point ?? null,
  recExercise: wire.rec_exercise ?? null,
  voiceFile: wire.voice_file ?? null,
});

const fromReportWire = (wire: CoachingReportResponseWire): AiCoachingReportDto => ({
  summaryTitle: wire.summary_title,
  totalCoachingCount: wire.total_coaching_count,
  items: (wire.items ?? []).map((it) => ({
    title: it.title,
    description: it.description,
    recExercise: it.rec_exercise ?? null,
    count: it.count,
  })),
});

const toLthrAnalyzeRequestWire = (
  dto: LthrAnalyzeRequestDto,
): LthrAnalyzeRequestWire => ({
  heart_rate_samples: dto.heartRateSamples.map((s) => ({
    elapsed_seconds: s.elapsedSeconds,
    heart_rate: Math.round(s.heartRate),
  })),
  previous_lthr: dto.previousLthr ?? null,
});

const fromLthrAnalyzeResponseWire = (
  wire: LthrAnalyzeResponseWire,
): LthrAnalyzeResponseDto => ({
  lthr: wire.lthr,
  previousLthr: wire.previous_lthr ?? null,
  lthrDifference: wire.lthr_difference ?? null,
  maxHeartRate: wire.max_heart_rate,
  averageHeartRate: wire.average_heart_rate,
  zones: (wire.zones ?? []).map((z) => ({
    zone: z.zone,
    name: z.name,
    minBpm: z.min_bpm ?? null,
    maxBpm: z.max_bpm ?? null,
    durationSeconds: z.duration_seconds,
    percentage: z.percentage,
  })),
});

const toLthrCoachingRequestWire = (
  dto: LthrCoachingRequestDto,
): LthrAnalyzeResponseWire => ({
  lthr: dto.lthr,
  previous_lthr: dto.previousLthr ?? null,
  lthr_difference: dto.lthrDifference ?? null,
  max_heart_rate: dto.maxHeartRate,
  average_heart_rate: dto.averageHeartRate,
  zones: dto.zones.map((z) => ({
    zone: z.zone,
    name: z.name,
    min_bpm: z.minBpm,
    max_bpm: z.maxBpm,
    duration_seconds: z.durationSeconds,
    percentage: z.percentage,
  })),
});

// ─── 엔드포인트 ────────────────────────────────────────────────────

/**
 * 실시간 AI 코칭 생성 — POST /ai/coaching (러닝 중 1분 간격 호출)
 * 양발(left_foot·right_foot) 센서 데이터를 함께 보내며, 응답에는 서버가 합성한
 * TTS 음성 파일 경로(voiceFile)가 포함된다.
 */
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
 * AI 코칭 요약 리포트 생성 — POST /ai/coaching/report
 * 러닝 중 수집한 코칭 목록을 그대로 넘기면 서버가 묶어서 요약한다. (서버 저장은 없음)
 */
export const createCoachingReport = async (
  coachingLogs: AiCoachingLogDto[],
): Promise<AiCoachingReportDto> => {
  const body: CoachingReportCreateRequestWire = {
    coaching_logs: coachingLogs.map((c) => ({
      feedback_text: c.feedbackText,
      focus_point: c.focusPoint ?? null,
      rec_exercise: c.recExercise ?? null,
    })),
  };
  const res = await aiClient.post<CoachingReportResponseWire>(
    '/ai/coaching/report',
    body,
    { timeout: 60000 }, // 요약 생성(LLM)이 길 수 있어 여유 있게
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

/**
 * LTHR 테스트 결과 계산 — POST /lthr/analyze
 * 30분 동안 수집한 심박수 샘플들을 기반으로 LTHR, Training Zone, 통계를 계산한다.
 */
export const analyzeLthr = async (
  body: LthrAnalyzeRequestDto,
): Promise<LthrAnalyzeResponseDto> => {
  const res = await aiClient.post<LthrAnalyzeResponseWire>(
    '/lthr/analyze',
    toLthrAnalyzeRequestWire(body),
  );
  return fromLthrAnalyzeResponseWire(res.data);
};

/**
 * LTHR 테스트 결과 AI 코치 분석 — POST /lthr/coaching
 * LTHR 계산 결과를 바탕으로 사후 AI 코칭 총평을 생성한다.
 */
export const createLthrCoaching = async (
  body: LthrCoachingRequestDto,
): Promise<LthrCoachingResponseDto> => {
  const res = await aiClient.post<LthrCoachingResponseWire>(
    '/lthr/coaching',
    toLthrCoachingRequestWire(body),
    { timeout: 60000 },
  );
  return { analysis: res.data.analysis };
};

