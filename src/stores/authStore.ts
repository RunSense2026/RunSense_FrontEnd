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
    // 이름·이메일·가입일·러닝 횟수·거리까지 모두 영구 저장 → 자동 로그인 시 그대로 복원한다.
    persistSession({
      userId: login.userID,
      userName: login.userName,
      email: login.email,
      createdAt: login.createdAt,
      runCount: login.totalCount,
      totalDistanceKm: login.totalDistance,
    });
    syncProfile(login.userName, login.email);
    // 로그인 응답의 계정 통계(가입일·횟수·거리)를 프로필 스토어에 시드한다. (설정 화면에서 최신값으로 갱신)
    useProfileStore.getState().setStats({
      joinedAt: login.createdAt ?? null,
      runCount: login.totalCount ?? null,
      totalDistanceKm: login.totalDistance ?? null,
    });
    set({
      userId: login.userID,
      userName: login.userName,
      email: login.email,
      isAuthenticated: true,
    });
  },
  restoreSession: (s) => {
    syncProfile(s.userName, s.email);
    // 자동 로그인 시 저장해 둔 가입일·횟수·거리를 함께 복원한다. (설정 화면에서 최신값으로 갱신)
    useProfileStore.getState().setStats({
      joinedAt: s.createdAt ?? null,
      runCount: s.runCount ?? null,
      totalDistanceKm: s.totalDistanceKm ?? null,
    });
    set({ userId: s.userId, userName: s.userName, email: s.email, isAuthenticated: true });
  },
  clearSession: () => {
    clearTokens();
    set({ userId: null, userName: null, email: null, isAuthenticated: false });
  },
}));
