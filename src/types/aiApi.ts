// RunSense AI 코칭 서버 API 타입 정의
// 출처: AI 서버 OpenAPI 스펙 (서버 주소는 .env 의 AI_API_BASE_URL)
//
// 주의: AI 서버는 백엔드와 달리 (1) 인증이 없고, (2) 응답이 { status, message, data }
// 래퍼로 감싸지지 않으며, (3) 필드가 snake_case 다. 앱 내부에서는 다른 코드와 일관되게
// camelCase 로 다루기 위해 아래 camelCase DTO 로 노출하고, 매핑은 `src/api/ai.ts` 에서 한다.

// ─── 앱 내부에서 사용하는 camelCase DTO ────────────────────────────

/** 한쪽 발의 압력 분포(%) — 인솔 5개 센서를 5구간으로 매핑한 값 */
export interface AiFootHitmapDto {
  /** 안쪽 앞꿈치 (엄지·엄지밑) */
  forefootLeft: number;
  /** 바깥 앞꿈치 (새끼발가락밑) */
  forefootRight: number;
  /** 안쪽 중족 */
  midfootLeft: number;
  /** 바깥 중족 */
  midfootRight: number;
  /** 뒤꿈치 */
  heel: number;
}

/** 한쪽 발의 센서 데이터 — 양발 모두 필수로 전송한다 */
export interface AiFootDataDto {
  /** 회내 유형 (예: "overpronation" / "neutral" / "supination") */
  pronationType?: string | null;
  /** 뒤꿈치 착지율 (0~100) */
  heelStrikeRate?: number | null;
  /** 압력 분포 (필수) */
  hitmap: AiFootHitmapDto;
}

/** 실시간 코칭 생성 요청 — POST /ai/coaching (러닝 중 1분 간격 호출) */
export interface AiCoachingRequestDto {
  /** 평균/현재 페이스 (분/km 실수) */
  pace: number;
  /** 심박수 (bpm) */
  heartRate: number;
  /** 케이던스 (spm) */
  cadence: number;
  /** 왼발 센서 데이터 (필수) */
  leftFoot: AiFootDataDto;
  /** 오른발 센서 데이터 (필수) */
  rightFoot: AiFootDataDto;
}

/** 코칭 조회/단건 응답 — GET /ai/coaching, GET·PATCH /ai/coaching/{id} (activity_id 포함) */
export interface AiCoachingResultDto {
  coachingId: number;
  activityId: number;
  feedbackText: string;
  focusPoint: string | null;
  recExercise: string | null;
}

/** 실시간 코칭 생성 응답 (TTS 음성 파일 포함) — POST /ai/coaching */
export interface AiCoachingWithVoiceDto {
  feedbackText: string;
  focusPoint: string | null;
  recExercise: string | null;
  /** 서버가 생성한 TTS 음성 파일 경로 (예: "/audio/coach_xxxx.mp3") */
  voiceFile: string | null;
}

/** 코칭 수정 요청 — PATCH /ai/coaching/{id} */
export interface AiCoachingUpdateDto {
  feedbackText?: string | null;
  focusPoint?: string | null;
  recExercise?: string | null;
}

/** 요약 리포트 생성에 넘기는 코칭 한 건 — POST /ai/coaching/report */
export interface AiCoachingLogDto {
  feedbackText: string;
  focusPoint?: string | null;
  recExercise?: string | null;
}

/** 코칭 요약 리포트의 개별 항목 */
export interface AiCoachingReportItem {
  title: string;
  description: string;
  recExercise: string | null;
  count: number;
}

/** 코칭 요약 리포트 — POST /ai/coaching/report (서버 저장 없음, 생성 결과만 반환) */
export interface AiCoachingReportDto {
  summaryTitle: string;
  totalCoachingCount: number;
  items: AiCoachingReportItem[];
}

// ─── 서버 와이어 포맷 (snake_case, 매핑 전용) ───────────────────────

/** 발 압력 분포 와이어 */
export interface FootHitmapWire {
  forefoot_left: number;
  forefoot_right: number;
  midfoot_left: number;
  midfoot_right: number;
  heel: number;
}

/** 한쪽 발 센서 데이터 와이어 */
export interface FootDataWire {
  pronation_type?: string | null;
  heel_strike_rate?: number | null;
  hitmap: FootHitmapWire;
}

/** POST /ai/coaching 요청 본문 */
export interface CoachingRequestWire {
  pace: number;
  heart_rate: number;
  cadence: number;
  left_foot: FootDataWire;
  right_foot: FootDataWire;
}

/** 코칭 조회 응답 */
export interface CoachingResponseWire {
  coaching_id: number;
  activity_id: number;
  feedback_text: string;
  focus_point: string | null;
  rec_exercise: string | null;
}

/** POST /ai/coaching 응답 (TTS 음성 파일 포함) */
export interface CoachingWithVoiceResponseWire {
  feedback_text: string;
  focus_point: string | null;
  rec_exercise: string | null;
  voice_file: string | null;
}

/** PATCH /ai/coaching/{id} 요청 본문 */
export interface CoachingUpdateWire {
  feedback_text?: string | null;
  focus_point?: string | null;
  rec_exercise?: string | null;
}

/** POST /ai/coaching/report 요청 본문 */
export interface CoachingReportCreateRequestWire {
  coaching_logs: Array<{
    feedback_text: string;
    focus_point?: string | null;
    rec_exercise?: string | null;
  }>;
}

/** 리포트 항목 와이어 */
export interface CoachingReportItemWire {
  title: string;
  description: string;
  rec_exercise: string | null;
  count: number;
}

/** 리포트 응답 와이어 */
export interface CoachingReportResponseWire {
  summary_title: string;
  total_coaching_count: number;
  items: CoachingReportItemWire[];
}
