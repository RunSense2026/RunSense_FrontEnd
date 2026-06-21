import { create } from 'zustand';

// 사용자 프로필 — 설정/프로필 수정 화면이 공유하는 단일 소스.
// (실서비스에서는 서버/스토리지와 동기화할 위치)
interface ProfileState {
  name: string;
  email: string;
  age: string;
  weight: string;
  avatarUri: string | null;
  /** 가입 날짜 (백엔드 createdAt, ISO/date 문자열) */
  joinedAt: string | null;
  /** 누적 러닝 횟수 (백엔드 totalCount) */
  runCount: number | null;
  /** 누적 러닝 거리(km) (백엔드 totalDistance) */
  totalDistanceKm: number | null;
  setProfile: (patch: Partial<Pick<ProfileState, 'name' | 'email' | 'age' | 'weight' | 'avatarUri'>>) => void;
  /** 백엔드에서 받아온 계정 통계(가입일·횟수·거리)를 갱신 */
  setStats: (patch: Partial<Pick<ProfileState, 'joinedAt' | 'runCount' | 'totalDistanceKm'>>) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  name: '정현우',
  email: 'junghyunwoo@runsense.app',
  age: '32',
  weight: '68.5',
  avatarUri: null,
  joinedAt: null,
  runCount: null,
  totalDistanceKm: null,
  setProfile: (patch) => set(patch),
  setStats: (patch) => set(patch),
}));
