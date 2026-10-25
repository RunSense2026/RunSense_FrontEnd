// 갤럭시 워치(RunSense 워치 앱) Data Layer 브리지 — 네이티브 모듈 `RunSenseWear` 래퍼.
//
// 폰 → 워치
//   putState(path, obj)    : DataItem 저장. 워치가 꺼져 있어도 다음 연결 때 동기화된다.
//   sendMessage(path, obj) : 지금 연결된 워치에 즉시 전송. 연결이 없으면 버려진다.
// 워치 → 폰
//   subscribe(handler)     : { path, data } 메시지 구독.
//
// 경로/페이로드 규격은 워치 앱의 PhoneSyncContract.kt 와 1:1 로 맞춘다.
// (안드로이드 전용 — iOS/미지원 환경에서는 모든 호출이 조용히 no-op 이다)

import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

import type { AiFootDataDto } from '@/types/aiApi';

export const WEAR_PATH = {
  // 폰 → 워치
  AUTH: '/runsense/auth',
  AUTH_CLEAR: '/runsense/auth/clear',
  PROFILE: '/runsense/profile',
  INSOLE_STATUS: '/runsense/insole/status',
  INSOLE_DATA: '/runsense/insole/data',
  /** 폰에서 러닝(DashboardA)이 진행 중인지 — 워치는 이때 기록 저장을 폰에 맡긴다 */
  RUN_PHONE: '/runsense/run/phone',
  /** 폰이 생성한 AI 코칭을 워치 화면에도 띄운다 */
  COACH: '/runsense/coach',
  // 워치 → 폰
  INSOLE_REQUEST: '/runsense/insole/request',
  /** 백엔드가 워치 토큰을 거부함 — 폰이 (필요하면 재발급해서) 최신 토큰을 다시 보낸다 */
  AUTH_REQUEST: '/runsense/auth/request',
  RUN_STATE: '/runsense/run/state',
  RUN_LIVE: '/runsense/run/live',
  /** 폰 러닝 중 워치 심박 — 워치에서 러닝을 시작하지 않아도 보낸다 */
  HEART_RATE: '/runsense/hr',
  RUN_COMPLETE: '/runsense/run/complete',
  OPEN_REPORT: '/runsense/open_report',
} as const;

/** 워치 → 폰 `/runsense/run/live` (5초 간격) */
export interface WatchLive {
  phase: 'Running' | 'Paused' | string;
  elapsedSeconds: number;
  distanceKm: number;
  /** 초/km, 0 이면 아직 계산 전 */
  paceSecPerKm: number;
  heartRate: number;
  cadence: number;
  formScore: number;
}

/** 워치 → 폰 `/runsense/hr` — 폰 러닝 중 심박이 바뀔 때마다(같아도 2초마다) */
export interface WatchHeartRate {
  /** bpm, 측정 전·손목 이탈이면 0 */
  heartRate: number;
  state: 'measuring' | 'acquiring' | 'offBody' | 'unavailable' | 'unsupported' | string;
}

/** 워치 → 폰 `/runsense/run/state` */
export interface WatchRunState {
  state: 'started' | 'paused' | 'resumed' | 'ended';
  elapsedSeconds: number;
  distanceKm: number;
}

/** 워치 → 폰 `/runsense/run/complete` */
export interface WatchRunComplete {
  distanceKm: number;
  elapsedSeconds: number;
  avgPaceSecPerKm: number;
  avgHeartRate: number;
  formScore: number;
  /** 워치가 백엔드에 직접 저장했는지 */
  saved: boolean;
  activityId: number | null;
}

export interface WatchStatus {
  connected: boolean;
  appInstalled: boolean;
  nodeName: string | null;
}

export interface WearMessage {
  path: string;
  data: string;
}

const native = Platform.OS === 'android' ? NativeModules.RunSenseWear : null;
const emitter = native ? new NativeEventEmitter(native) : null;

export const isWearSupported = (): boolean => native != null;

const putState = async (path: string, payload: unknown): Promise<void> => {
  if (!native) return;
  try {
    await native.putState(path, JSON.stringify(payload));
  } catch {
    // Play 서비스 미설치 등 — 워치 연동은 부가 기능이라 조용히 무시한다.
  }
};

const deleteState = async (path: string): Promise<void> => {
  if (!native) return;
  try {
    await native.deleteState(path);
  } catch {
    // 무시
  }
};

const sendMessage = async (path: string, payload: unknown): Promise<void> => {
  if (!native) return;
  try {
    await native.sendMessage(path, JSON.stringify(payload));
  } catch {
    // 연결된 워치가 없으면 실패할 수 있다 — 무시
  }
};

export const wearBridge = {
  /** 로그인 토큰 전달 — 워치가 백엔드(코칭 프록시·기록 저장·프로필)를 직접 호출할 수 있게 한다 */
  sendAuth: (auth: {
    accessToken: string;
    refreshToken: string;
    userId: number;
    userName: string;
  }) => putState(WEAR_PATH.AUTH, auth),

  /** 로그아웃 — 워치에 남은 토큰도 지운다 */
  clearAuth: async () => {
    await deleteState(WEAR_PATH.AUTH);
    await sendMessage(WEAR_PATH.AUTH_CLEAR, {});
  },

  /** LTHR·안정시 심박 등 기기에만 저장되는 프로필을 워치 심박존 계산에 쓰도록 전달 */
  sendProfile: (profile: {
    lthr: number | null;
    restingHeartRate: number | null;
    birthDate: string | null;
    height: number | null;
    weight: number | null;
    userName: string | null;
  }) => putState(WEAR_PATH.PROFILE, profile),

  sendInsoleStatus: (status: { leftConnected: boolean; rightConnected: boolean }) =>
    putState(WEAR_PATH.INSOLE_STATUS, status),

  /** 러닝 중 실시간 족압 (AI 서버 FootData 와 같은 snake_case 스키마) */
  sendInsoleData: (left: AiFootDataDto, right: AiFootDataDto) =>
    sendMessage(WEAR_PATH.INSOLE_DATA, { left: toWire(left), right: toWire(right) }),

  /** 폰 러닝 화면 진입/이탈 — 워치는 폰 러닝 중엔 기록 저장·코칭 생성을 폰에 맡긴다 */
  sendPhoneRunState: (active: boolean, targetPaceSpk?: number) =>
    putState(WEAR_PATH.RUN_PHONE, {
      active,
      targetPaceSpk: targetPaceSpk ?? null,
      updatedAt: Date.now(),
    }),

  /** 폰이 만든 AI 코칭을 워치에도 띄운다 (음성은 폰에서 재생) */
  sendCoaching: (c: {
    feedbackText: string;
    focusPoint: string | null;
    recExercise: string | null;
  }) => sendMessage(WEAR_PATH.COACH, c),

  getStatus: async (): Promise<WatchStatus> => {
    if (!native) return { connected: false, appInstalled: false, nodeName: null };
    try {
      return await native.getWatchStatus();
    } catch {
      return { connected: false, appInstalled: false, nodeName: null };
    }
  },

  /** 워치 → 폰 메시지 구독. 반환된 함수로 해제한다. */
  subscribe: (handler: (msg: WearMessage) => void): (() => void) => {
    if (!emitter) return () => {};
    const sub = emitter.addListener('RunSenseWearMessage', handler);
    return () => sub.remove();
  },
};

const toWire = (foot: AiFootDataDto) => ({
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

/** 메시지 본문 JSON 파싱 (깨진 페이로드는 null) */
export const parseWearData = <T>(msg: WearMessage): T | null => {
  try {
    return JSON.parse(msg.data) as T;
  } catch {
    return null;
  }
};
