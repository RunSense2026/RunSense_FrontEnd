import { create } from 'zustand';

import type { Gender, UserResponseDto } from '@/types/api';
import { numberToField } from '@/utils/profile';
import { persistProfile, type PersistedProfile } from '@/utils/storage';

// 사용자 프로필 — 설정(마이페이지)/프로필 수정 화면이 공유하는 단일 소스.
//
// 값의 출처가 셋으로 나뉜다:
//  - 이름·생년월일(→나이)·성별·키·체중: 백엔드 `PATCH /api/users` (readMyProfile/updateMyProfile)
//  - 이메일·가입일·러닝 횟수·누적 거리: 로그인 응답 시드 → 설정 화면에서 서버 값으로 갱신
//  - 안정시 심박수·LTHR·프로필 사진: 서버에 저장 필드가 없어 기기(AsyncStorage)에만 보관
// 서버 값도 기기에 캐시해 두어 부팅 직후·오프라인에서 바로 보여주고, 서버 응답이 오면 덮어쓴다.
// 값이 없으면 빈 문자열로 두고, 화면에서 '--' 로 표시한다.
interface ProfileState {
  name: string;
  /** 로그인 계정 이메일 (서버에 수정 API 가 없어 읽기 전용) */
  email: string;
  /** 생년월일 'YYYY-MM-DD' (서버 birthDate) — 나이는 여기서 계산한다 */
  birthDate: string;
  /** 성별 (서버 gender), 미설정이면 '' */
  gender: Gender | '';
  /** 키 (cm) */
  height: string;
  /** 체중 (kg) */
  weight: string;
  /** 안정시 심박수 (bpm) — 기기 저장 */
  restingHr: string;
  /** 젖산 역치 심박수 (bpm) — 기기 저장 */
  lthr: string;
  avatarUri: string | null;
  /** 가입 날짜 (백엔드 createdAt, ISO/date 문자열) */
  joinedAt: string | null;
  /** 누적 러닝 횟수 (백엔드 totalCount) */
  runCount: number | null;
  /** 누적 러닝 거리(km) (백엔드 totalDistance) */
  totalDistanceKm: number | null;
  /**
   * 프로필 값 갱신. 기기에 보관하는 항목이 바뀌면 AsyncStorage 에도 write-through 저장한다.
   * 로그인 응답 동기화처럼 '기기 저장은 하지 않을' 때는 `{ persist: false }` 로 호출한다.
   */
  setProfile: (patch: Partial<EditableProfile>, options?: { persist?: boolean }) => void;
  /** 서버 프로필 응답(PATCH /api/users)을 반영 — 서버 값이 기기 캐시보다 우선한다 */
  applyServerProfile: (user: UserResponseDto) => void;
  /** 로그인/세션 복원 시 계정 이름·이메일을 동기화 (기기 캐시는 건드리지 않는다) */
  setAccount: (name: string, email: string) => void;
  /** 백엔드에서 받아온 계정 통계(가입일·횟수·거리)를 갱신 */
  setStats: (patch: Partial<Pick<ProfileState, 'joinedAt' | 'runCount' | 'totalDistanceKm'>>) => void;
  /** 앱 시작 시 저장된 프로필을 복원. 세션 복원 뒤에 호출한다. */
  hydrate: (profile: PersistedProfile) => void;
  /** 로그아웃 시 초기화 */
  reset: () => void;
}

/** 프로필 수정 화면에서 고칠 수 있는 = 기기에 저장(캐시)하는 항목 */
type EditableProfile = Pick<
  ProfileState,
  'name' | 'birthDate' | 'gender' | 'height' | 'weight' | 'restingHr' | 'lthr' | 'avatarUri'
>;

const EDITABLE_KEYS: (keyof EditableProfile)[] = [
  'name',
  'birthDate',
  'gender',
  'height',
  'weight',
  'restingHr',
  'lthr',
  'avatarUri',
];

const emptyProfile = () => ({
  name: '',
  email: '',
  birthDate: '',
  gender: '' as Gender | '',
  height: '',
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
    // 기기 보관 항목이 바뀐 경우에만 다시 저장한다.
    // (로그인 응답 동기화는 persist:false 로 호출돼 저장된 값을 덮어쓰지 않는다)
    if (persist && EDITABLE_KEYS.some((k) => k in patch)) {
      const s = get();
      persistProfile({
        name: s.name,
        birthDate: s.birthDate,
        gender: s.gender,
        height: s.height,
        weight: s.weight,
        restingHr: s.restingHr,
        lthr: s.lthr,
        avatarUri: s.avatarUri,
      });
    }
  },

  applyServerProfile: (user) => {
    // 이름·신체 정보는 서버 값으로 덮어쓰고 기기 캐시에도 반영한다.
    get().setProfile({
      name: user.userName || '',
      birthDate: user.birthDate ?? '',
      gender: user.gender ?? '',
      height: numberToField(user.height),
      weight: numberToField(user.weight),
    });
    // 이메일·가입일은 수정 대상이 아니라 캐시하지 않고 화면 표시용으로만 갱신한다.
    set((s) => ({
      email: user.email || s.email,
      joinedAt: user.createdAt ?? s.joinedAt,
    }));
  },

  setAccount: (name, email) => set({ name, email }),

  setStats: (patch) => set(patch),

  hydrate: (profile) =>
    set((s) => ({
      // 이름은 캐시된 값이 있을 때만 덮어쓴다(없으면 로그인 세션 값 유지).
      name: profile.name || s.name,
      birthDate: profile.birthDate ?? '',
      gender: profile.gender ?? '',
      height: profile.height ?? '',
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
