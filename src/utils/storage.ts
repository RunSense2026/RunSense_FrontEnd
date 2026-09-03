// 토큰 저장소.
// API 요청 인터셉터가 동기적으로 토큰을 읽어야 하므로 메모리에 보관하고,
// '로그인 유지'가 켜져 있으면 AsyncStorage 로 write-through 영구 저장한다.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Gender } from '@/types/api';

const K_ACCESS = 'auth.accessToken';
const K_REFRESH = 'auth.refreshToken';
const K_SESSION = 'auth.session';
const K_REMEMBER = 'auth.remember';
// 프로필 — 서버 값(이름·생년월일·성별·키·체중)의 오프라인 캐시 +
// 서버에 저장 필드가 없는 값(안정시 심박수·LTHR·사진)의 유일한 보관처.
const K_PROFILE = 'profile.prefs';
const PERSIST_KEYS = [K_ACCESS, K_REFRESH, K_SESSION, K_REMEMBER];

const removePersisted = () => {
  PERSIST_KEYS.forEach((k) => {
    AsyncStorage.removeItem(k).catch(() => {});
  });
};

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _remember = false;

export interface PersistedSession {
  userId: number;
  userName: string;
  email: string;
  /** 가입 날짜 (재시작 시 설정 화면 표시용) */
  createdAt?: string;
  /** 누적 러닝 횟수 (재시작 시 설정 화면 표시용) */
  runCount?: number;
  /** 누적 러닝 거리(km) (재시작 시 설정 화면 표시용) */
  totalDistanceKm?: number;
}

export const accessToken = {
  get: (): string | null => _accessToken,
  set: (token: string): void => {
    _accessToken = token;
  },
  clear: (): void => {
    _accessToken = null;
  },
};

export const refreshToken = {
  get: (): string | null => _refreshToken,
  set: (token: string): void => {
    _refreshToken = token;
  },
  clear: (): void => {
    _refreshToken = null;
  },
};

/** 로그인 성공/재발급 시 두 토큰을 한 번에 저장 (remember 면 영구 저장도 갱신) */
export const setTokens = (access: string, refresh: string): void => {
  _accessToken = access;
  _refreshToken = refresh;
  if (_remember) {
    AsyncStorage.setItem(K_ACCESS, access).catch(() => {});
    AsyncStorage.setItem(K_REFRESH, refresh).catch(() => {});
  }
};

/** 로그아웃 시 메모리 + 영구 저장 모두 제거 */
export const clearTokens = (): void => {
  _accessToken = null;
  _refreshToken = null;
  _remember = false;
  removePersisted();
};

/** '로그인 유지' 여부 설정. 끄면 영구 저장된 토큰/세션을 제거한다. */
export const setRememberMe = (remember: boolean): void => {
  _remember = remember;
  if (remember) {
    AsyncStorage.setItem(K_REMEMBER, 'true').catch(() => {});
  } else {
    removePersisted();
  }
};

/** 세션 식별 정보(이름 등) 영구 저장 — 재시작 시 화면에 표시하기 위함 */
export const persistSession = (session: PersistedSession): void => {
  if (_remember) {
    AsyncStorage.setItem(K_SESSION, JSON.stringify(session)).catch(() => {});
  }
};

// ─── 프로필(신체 정보) ─────────────────────────────────────────────

export interface PersistedProfile {
  // 서버(PATCH /api/users) 값의 캐시 — 부팅 직후·오프라인 표시용이고, 서버 응답이 오면 덮어쓴다.
  name?: string;
  /** 생년월일 (YYYY-MM-DD) */
  birthDate?: string;
  /** 성별 코드 (M/F/ETC), 미설정이면 '' */
  gender?: Gender | '';
  /** 키 (cm) */
  height?: string;
  /** 체중 (kg) */
  weight?: string;

  // 서버에 저장 필드가 없는 값 — 기기에만 남는다.
  /** 안정시 심박수 (bpm) */
  restingHr?: string;
  /** 젖산 역치 심박수 (bpm) */
  lthr?: string;
  avatarUri?: string | null;
}

/** 프로필 수정 저장 시 호출 — '로그인 유지' 여부와 무관하게 기기에 남긴다. */
export const persistProfile = (profile: PersistedProfile): void => {
  AsyncStorage.setItem(K_PROFILE, JSON.stringify(profile)).catch(() => {});
};

/** 앱 시작 시 저장된 프로필을 읽어온다. (없으면 null) */
export const loadPersistedProfile = async (): Promise<PersistedProfile | null> => {
  try {
    const raw = await AsyncStorage.getItem(K_PROFILE);
    return raw ? (JSON.parse(raw) as PersistedProfile) : null;
  } catch {
    return null;
  }
};

/** 로그아웃 시 호출 — 다음 사용자에게 이전 사용자의 프로필이 남지 않게 지운다. */
export const clearPersistedProfile = (): void => {
  AsyncStorage.removeItem(K_PROFILE).catch(() => {});
};

/**
 * 앱 시작 시 영구 저장된 세션을 메모리로 복원한다.
 * '로그인 유지'가 켜져 있고 토큰·세션이 모두 있으면 세션을 반환, 아니면 null.
 */
export const loadPersistedSession = async (): Promise<PersistedSession | null> => {
  try {
    const [remember, access, refresh, session] = await Promise.all([
      AsyncStorage.getItem(K_REMEMBER),
      AsyncStorage.getItem(K_ACCESS),
      AsyncStorage.getItem(K_REFRESH),
      AsyncStorage.getItem(K_SESSION),
    ]);
    if (remember !== 'true' || !access || !refresh || !session) return null;
    _accessToken = access;
    _refreshToken = refresh;
    _remember = true;
    return JSON.parse(session) as PersistedSession;
  } catch {
    return null;
  }
};
