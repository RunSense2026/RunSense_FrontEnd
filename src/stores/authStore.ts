import { create } from 'zustand';

import type { UserLoginResponseDto } from '@/types/api';
import { setTokens, clearTokens, persistSession, type PersistedSession } from '@/utils/storage';
import { useProfileStore } from './profileStore';

// 로그인한 사용자 세션 — 토큰은 storage 에, 사용자 식별 정보는 이 스토어에 보관한다.
interface AuthState {
  userId: number | null;
  userName: string | null;
  email: string | null;
  isAuthenticated: boolean;
  /** 로그인 응답으로 세션 + 토큰을 한 번에 설정 */
  setSession: (login: UserLoginResponseDto) => void;
  /** 영구 저장된 세션으로 복원 (앱 시작 시 자동 로그인) */
  restoreSession: (session: PersistedSession) => void;
  /** 로그아웃 — 세션과 토큰을 모두 비운다 */
  clearSession: () => void;
}

// 로그인/복원 시 프로필 스토어(설정 화면 표시용)에 이름·이메일을 동기화한다.
const syncProfile = (name: string, email: string) => {
  useProfileStore.getState().setProfile({ name, email });
};

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  userName: null,
  email: null,
  isAuthenticated: false,
  setSession: (login) => {
    setTokens(login.accessToken, login.refreshToken);
    persistSession({ userId: login.userID, userName: login.userName, email: login.email });
    syncProfile(login.userName, login.email);
    set({
      userId: login.userID,
      userName: login.userName,
      email: login.email,
      isAuthenticated: true,
    });
  },
  restoreSession: (s) => {
    syncProfile(s.userName, s.email);
    set({ userId: s.userId, userName: s.userName, email: s.email, isAuthenticated: true });
  },
  clearSession: () => {
    clearTokens();
    set({ userId: null, userName: null, email: null, isAuthenticated: false });
  },
}));
