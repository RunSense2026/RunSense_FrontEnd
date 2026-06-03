import { create } from 'zustand';

// 사용자 프로필 — 설정/프로필 수정 화면이 공유하는 단일 소스.
// (실서비스에서는 서버/스토리지와 동기화할 위치)
interface ProfileState {
  name: string;
  email: string;
  age: string;
  weight: string;
  avatarUri: string | null;
  setProfile: (patch: Partial<Pick<ProfileState, 'name' | 'email' | 'age' | 'weight' | 'avatarUri'>>) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  name: '정현우',
  email: 'junghyunwoo@runsense.app',
  age: '32',
  weight: '68.5',
  avatarUri: null,
  setProfile: (patch) => set(patch),
}));
