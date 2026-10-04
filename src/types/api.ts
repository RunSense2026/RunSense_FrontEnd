// RunSense 백엔드 API 타입 정의
// 출처: 백엔드 OpenAPI 3.1 스펙 (서버 주소는 .env 의 API_BASE_URL)
// 모든 응답은 { success, message, data } 공통 래퍼로 감싸진다.

/** 모든 API 응답의 공통 래퍼 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── Users ────────────────────────────────────────────────────────

/** 회원가입 요청 — POST /api/users/signup */
export interface UserSignUpRequestDto {
  /** 이메일 */
  email: string;
  /** 로그인 비밀번호 (8~20자) */
  loginPw: string;
  /** 사용자 이름 (2~5자) */
  userName: string;
  /** 이메일 인증 여부 */
  isVerified?: boolean;
}

/** 회원가입 응답 */
export interface UserSignUpResponseDto {
  userName: string;
  email: string;
  isVerified: boolean;
  /** 생성일 (date) */
  createdAt: string;
}

/** 로그인 요청 — POST /api/users/login */
export interface UserLoginRequestDto {
  email: string;
  loginPw: string;
}

/** 로그인 응답 — 토큰 포함 */
export interface UserLoginResponseDto {
  userID: number;
  userName: string;
  email: string;
  /** 가입 날짜 (date) */
  createdAt: string;
  /** 누적 러닝 거리(km) */
  totalDistance: number;
  /** 누적 러닝 횟수 */
  totalCount: number;
  tokenType: string;
  /** API 호출 시 사용하는 액세스 토큰 (1시간 유효) */
  accessToken: string;
  /** 액세스 토큰 재발급용 리프레시 토큰 (14일 유효) */
  refreshToken: string;
  /** 액세스 토큰 만료 시간 (초) */
  expiresIn: number;
}

/** 성별 — 서버 저장값 (M: 남성, F: 여성, ETC: 기타) */
export type Gender = 'M' | 'F' | 'ETC';

/**
 * 유저 정보 수정 요청 — PATCH /api/users
 * 보내지 않은(= null) 필드는 서버에서 수정하지 않는다. 즉 값을 비우는(지우는) 건 불가능하다.
 * 안정시 심박수·LTHR 은 여기서 수정할 수 없다 — LTHR 테스트 결과(POST /api/lthr)로만 갱신된다.
 */
export interface UserUpdateRequestDto {
  /** 사용자 이름 (2~5자) */
  userName?: string;
  /** 생년월일 (YYYY-MM-DD) */
  birthDate?: string;
  /** 성별 */
  gender?: Gender;
  /** 키 (cm) */
  height?: number;
  /** 체중 (kg) */
  weight?: number;
}

/** 유저 정보 응답 — PATCH /api/users (수정 후 전체 프로필) */
export interface UserResponseDto {
  userId: number;
  userName: string;
  email: string;
  /** 생년월일 (date) — 미입력이면 null */
  birthDate: string | null;
  gender: Gender | null;
  /** 키 (cm) */
  height: number | null;
  /** 체중 (kg) */
  weight: number | null;
  /** 안정시 심박수 (bpm) — 미입력이면 null */
  restingHeartRate: number | null;
  /** 젖산 역치 심박수 LTHR (bpm) — 미입력이면 null */
  lthr: number | null;
  isVerified: boolean;
  /** 가입일 (date) */
  createdAt: string;
}

/** LTHR 테스트 결과 저장 요청 — POST /api/lthr (유저의 LTHR·안정시 심박수도 함께 갱신된다) */
export interface LthrRecordCreateRequestDto {
  /** 측정된 LTHR (bpm, 정수) */
  lthr: number;
  /** 테스트 전 안정 측정 단계의 평균 심박수 (bpm) */
  restingHeartRate: number;
  /** 테스트 중 최고 심박수 (bpm, 정수) */
  maxHeartRate?: number;
  /** 테스트 중 평균 심박수 (bpm) */
  averageHeartRate?: number;
}

/** LTHR 테스트 기록 응답 — POST /api/lthr, GET /api/lthr/latest */
export interface LthrRecordResponseDto {
  recordId: number;
  lthr: number;
  /** 직전 테스트의 LTHR — 첫 측정이면 null */
  previousLthr: number | null;
  /** 직전 테스트 대비 증감 — 첫 측정이면 null */
  lthrDifference: number | null;
  restingHeartRate: number | null;
  maxHeartRate: number | null;
  averageHeartRate: number | null;
  /** 측정 일시 (ISO, 서울 기준) */
  measuredAt: string;
  /** 측정일로부터 지난 일수 */
  daysSinceMeasured: number;
  /** 측정 후 6주(42일) 이상 지나 재측정을 권장하는지 */
  recommendRetest: boolean;
}

/** 이메일 중복 체크 응답 — GET /api/users/email-duplicate */
export interface EmailDuplicateCheckResponseDto {
  isDuplicated: boolean;
}

/** 토큰 재발급 요청 — POST /api/users/reissue */
export interface TokenReissueRequestDto {
  refreshToken: string;
}

/** 로그아웃 요청 — POST /api/users/logout */
export interface TokenLogoutRequestDto {
  refreshToken: string;
}

/** 토큰 재발급 응답 */
export interface UserTokenResponseDto {
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ─── Running Activity ─────────────────────────────────────────────

/** 구간별 기록 (최대 5개) */
export interface LapSplitCreateRequestDto {
  /** 구간 순서 */
  lapNumber: number;
  /** 구간 페이스 (예: "5'00") */
  lapPace: string;
  /** 평균 심박수 */
  avgHeartRate: number;
  /** 페이스 상태 (예: "Green") */
  paceStatue: string;
}

/** 발 센서 데이터 (정확히 2개: 좌/우) */
export interface FootSensorDataCreateRequestDto {
  /** 발 방향 (예: "Left" / "Right") */
  footSide: string;
  /** 회내 유형 (예: "정상", "과내선") */
  pronationType: string;
  /** 뒤꿈치 착지율 */
  heelStrikeRate: number;
  /** 히트맵 데이터 (JSON 문자열) */
  hitmapJson: string;
}

/** AI 코칭 요약 (최대 3개) */
export interface AiCoachingCreateRequestDto {
  /** 피드백 내용 */
  feedbackText: string;
  /** 분석 중점 */
  focusPoint: string;
  /** 추천 운동 */
  recExercise: string;
}

/** 러닝 기록 생성 요청 — POST /api/run */
export interface RunningActivityCreateRequestDto {
  /** 총 거리 (km) */
  distance: number;
  /** 총 시간 (예: "00:30:00") */
  time: string;
  /** 평균 페이스 (예: "5'00") */
  pace: string;
  /** 폼 점수 */
  formScore: number;
  /** 구간 기록 (0~5개) */
  lapSplits: LapSplitCreateRequestDto[];
  /** 발 센서 데이터 (정확히 2개) */
  footSensorData: FootSensorDataCreateRequestDto[];
  /** AI 코칭 (0~3개) */
  aiCoachings: AiCoachingCreateRequestDto[];
}

/** 러닝 기록 요약 (생성 응답 / 리스트 항목 공용) */
export interface RunningActivityResponseDto {
  activityId: number;
  distance: number;
  time: string;
  pace: string;
  activityDate: string;
  formScore: number;
  lapSplitCount: number;
  footSensorDataCount: number;
  aiCoachingCount: number;
}

/** 모든 기간 러닝 기록 리스트 응답 — GET /api/run */
export interface RunningActivityListResponseDto {
  /** 전체 누적 거리 (km) */
  totalDistance: number;
  /** 평균 폼 점수 */
  averageFormScore: number;
  /** 총 러닝 횟수 */
  totalCount: number;
  /** 러닝 기록 목록 */
  activities: RunningActivityResponseDto[];
}

/** 구간 기록 조회 응답 */
export interface LapSplitResponseDto {
  splitId: number;
  lapNumber: number;
  lapPace: string;
  avgHeartRate: number;
  paceStatue: string;
}

/** 발 센서 데이터 조회 응답 */
export interface FootSensorDataResponseDto {
  sensorDataId: number;
  footSide: string;
  pronationType: string;
  heelStrikeRate: number;
  hitmapJson: string;
}

/** AI 코칭 조회 응답 */
export interface AiCoachingResponseDto {
  coachingId: number;
  feedbackText: string;
  focusPoint: string;
  recExercise: string;
}

/** 러닝 기록 단건 상세 응답 — GET /api/run/{activityId} */
export interface RunningActivityDetailResponseDto {
  activityId: number;
  distance: number;
  time: string;
  pace: string;
  activityDate: string;
  formScore: number;
  lapSplits: LapSplitResponseDto[];
  footSensorData: FootSensorDataResponseDto[];
  aiCoachings: AiCoachingResponseDto[];
}

// ─── Public (날씨 · 위치 · 대기질) ────────────────────────────────
// 공공데이터(기상청·에어코리아)와 역지오코딩은 백엔드가 대신 호출한다.
// 프론트는 위경도만 넘기고, 격자 변환·측정소 탐색·서비스 키는 서버가 처리한다.

/** 날씨 조회 응답 — GET /api/public/weather?lat=&lon= */
export interface WeatherResponseDto {
  /** 기온(°C) */
  temperature: number | null;
  /** 습도(%) */
  humidity: number | null;
  /** 풍속(m/s) */
  windSpeed: number | null;
  /** 강수형태 코드 (0:없음, 1/5:비, 2/6:비/눈, 3/7:눈) */
  precipitationType: string | null;
  /** 하늘상태 코드 (1:맑음, 3:구름많음, 4:흐림) — 조회 실패 시 null */
  skyCondition: string | null;
}

/** 위치 역지오코딩 응답 — GET /api/public/location?lat=&lon= */
export interface LocationResponseDto {
  /** 화면 표시용 지역명 (예: "서울 · 강남구") */
  name: string | null;
  /** 자치구/시군구명 (예: "강남구") */
  gu: string | null;
}

/** 대기질 조회 응답 — GET /api/public/air-quality?lat=&lon= */
export interface AirQualityResponseDto {
  /** 측정소명 (좌표 기준 최근접 측정소) */
  stationName: string | null;
  /** 측정시각 (예: "2026-07-19 04:00") */
  dataTime: string | null;
  /** 미세먼지 PM10 농도(㎍/㎥) */
  pm10Value: number | null;
  /** 초미세먼지 PM2.5 농도(㎍/㎥) */
  pm25Value: number | null;
  /** 통합대기환경지수 */
  khaiValue: number | null;
  /** PM10 등급 (1:좋음, 2:보통, 3:나쁨, 4:매우나쁨) */
  pm10Grade: string | null;
  /** PM2.5 등급 (1:좋음, 2:보통, 3:나쁨, 4:매우나쁨) */
  pm25Grade: string | null;
  /** 통합대기환경 등급 (1:좋음, 2:보통, 3:나쁨, 4:매우나쁨) */
  khaiGrade: string | null;
}

// ─── Course (주변 공원 추천) ──────────────────────────────────────
// 전국도시공원정보표준데이터 기준으로 현재 위치에서 직선거리가 가까운 공원을 서버가 골라 준다.

/** 공원 시설 태그 — 필터(tags)와 응답 태그에 공통으로 쓰인다 */
export type ParkTag = '산책로' | '운동기구' | '구기장' | '화장실' | '음수대' | '주차장' | '휴식공간' | 'CCTV';

export const PARK_TAGS: ParkTag[] = ['산책로', '운동기구', '구기장', '화장실', '음수대', '주차장', '휴식공간', 'CCTV'];

/** 주변 공원 추천 요청 — GET /api/course/nearby */
export interface NearbyParkQuery {
  lat: number;
  lon: number;
  /** 추천 개수 (1~10, 서버 기본 3) */
  limit?: number;
  /** 최소 공원면적(㎡). 0이면 면적 필터 없음 (서버 기본 10,000) */
  minArea?: number;
  /** 필수 시설 태그 — 모두 갖춘 공원만 반환 (걸수록 후보가 크게 줄어든다) */
  tags?: ParkTag[];
}

/** 공원 보유시설 원문 (공공데이터 값 그대로, 없으면 null) */
export interface ParkFacilityDto {
  /** 운동시설 */
  sports: string | null;
  /** 유희시설 */
  play: string | null;
  /** 편익시설 */
  convenience: string | null;
  /** 교양시설 */
  culture: string | null;
  /** 기타시설 */
  etc: string | null;
}

/** 추천 공원 */
export interface ParkResponseDto {
  /** 추천 순위 (1부터, 가까운 순) */
  rank: number;
  name: string;
  /** 공원구분 (예: "근린공원") */
  type: string;
  /** 소재지 주소 (도로명 우선, 없으면 지번) */
  address: string;
  latitude: number;
  longitude: number;
  /** 공원면적(㎡), 정보 없으면 null */
  area: number | null;
  /** 현재 위치로부터 직선거리(km) */
  distanceKm: number;
  /** 표준 시설 태그 (없으면 빈 배열) */
  tags: ParkTag[];
  facilities: ParkFacilityDto | null;
}

/** 주변 공원 추천 응답 */
export interface ParkListResponseDto {
  /** 가까운 순으로 정렬된 추천 공원 */
  parks: ParkResponseDto[];
}
