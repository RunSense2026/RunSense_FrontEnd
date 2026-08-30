import { create } from 'zustand';

import { persistProfile, type PersistedProfile } from '@/utils/storage';

// 사용자 프로필 — 설정(마이페이지)/프로필 수정 화면이 공유하는 단일 소스.
//
// 값의 출처가 셋으로 나뉜다:
//  - 이름·이메일: 로그인 응답(authStore 가 동기화) — 사용자가 프로필 수정에서 고치면 그 값이 우선
//  - 가입일·러닝 횟수·누적 거리: 백엔드 통계(로그인 응답 시드 → GET /api/run 로 갱신)
//  - 나이·체중·안정시 심박수·LTHR·사진: 서버에 저장 필드가 없음
// 백엔드에 프로필 수정 API 가 없어, 사용자가 고친 값은 모두 기기(AsyncStorage)에 저장한다.
// 값이 없으면 빈 문자열로 두고, 화면에서 '--' 로 표시한다.
interface ProfileState {
  name: string;
  email: string;
  age: string;
  weight: string;
  /** 안정시 심박수 (bpm) */
  restingHr: string;
  /** 젖산 역치 심박수 (bpm) */
  lthr: string;
  avatarUri: string | null;
  /** 가입 날짜 (백엔드 createdAt, ISO/date 문자열) */
  joinedAt: string | null;
  /** 누적 러닝 횟수 (백엔드 totalCount) */
  runCount: number | null;
  /** 누적 러닝 거리(km) (백엔드 totalDistance) */
  totalDistanceKm: number | null;
  /**
   * 프로필 값 갱신. 사용자가 고친 값은 AsyncStorage 에도 write-through 저장한다.
   * 로그인 응답 동기화처럼 '기기 저장은 하지 않을' 때는 `{ persist: false }` 로 호출한다.
   */
  setProfile: (patch: Partial<EditableProfile>, options?: { persist?: boolean }) => void;
  /** 백엔드에서 받아온 계정 통계(가입일·횟수·거리)를 갱신 */
  setStats: (patch: Partial<Pick<ProfileState, 'joinedAt' | 'runCount' | 'totalDistanceKm'>>) => void;
  /** 앱 시작 시 저장된 프로필을 복원. 세션 복원 뒤에 호출해 사용자가 고친 값이 우선하게 한다. */
  hydrate: (profile: PersistedProfile) => void;
  /** 로그아웃 시 초기화 */
  reset: () => void;
}

/** 프로필 수정 화면에서 고칠 수 있는 = 기기에 저장하는 항목 */
type EditableProfile = Pick<
  ProfileState,
  'name' | 'email' | 'age' | 'weight' | 'restingHr' | 'lthr' | 'avatarUri'
>;

const EDITABLE_KEYS: (keyof EditableProfile)[] = [
  'name',
  'email',
  'age',
  'weight',
  'restingHr',
  'lthr',
  'avatarUri',
];

const emptyProfile = () => ({
  name: '',
  email: '',
  age: '',
  weight: '',
  restingHr: '',
  lthr: '',
  avatarUri: null as string | null,
  joinedAt: null as string | null,
  runCount: null as number | null,
  totalDistanceKm: null as number | null,
});

export const useProfileStore = create<ProfileState>((set, get) => ({
  ...emptyProfile(),

  setProfile: (patch, { persist = true } = {}) => {
    set(patch);
    // 사용자가 고친 값일 때만 기기에 다시 저장한다.
    // (로그인 응답 동기화는 persist:false 로 호출돼 저장된 사용자 수정값을 덮어쓰지 않는다)
    if (persist && EDITABLE_KEYS.some((k) => k in patch)) {
      const s = get();
      persistProfile({
        name: s.name,
        email: s.email,
        age: s.age,
        weight: s.weight,
        restingHr: s.restingHr,
        lthr: s.lthr,
        avatarUri: s.avatarUri,
      });
    }
  },

  setStats: (patch) => set(patch),

  hydrate: (profile) =>
    set((s) => ({
      // 이름·이메일은 저장된 수정값이 있을 때만 덮어쓴다(없으면 로그인 세션 값 유지).
      name: profile.name || s.name,
      email: profile.email || s.email,
      age: profile.age ?? '',
      weight: profile.weight ?? '',
      restingHr: profile.restingHr ?? '',
      lthr: profile.lthr ?? '',
      avatarUri: profile.avatarUri ?? null,
    })),

  reset: () => set(emptyProfile()),
}));

/**
 * 프로필(마이페이지)에 저장된 LTHR(bpm)을 숫자로 돌려준다.
 * 미설정이면 undefined — 호출부는 기본값(format.ts 의 DEFAULT_LTHR)을 쓰면 된다.
 */
export const useMyLthr = (): number | undefined =>
  useProfileStore((s) => {
    const n = Number(s.lthr);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  });
