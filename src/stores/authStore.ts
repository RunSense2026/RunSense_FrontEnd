import { create } from 'zustand';

import type { UserLoginResponseDto } from '@/types/api';
import { setTokens, clearTokens } from '@/utils/storage';

// 로그인한 사용자 세션 — 토큰은 storage 에, 사용자 식별 정보는 이 스토어에 보관한다.
interface AuthState {
  userId: number | null;
  userName: string | null;
  email: string | null;
  isAuthenticated: boolean;
  /** 로그인 응답으로 세션 + 토큰을 한 번에 설정 */
  setSession: (login: UserLoginResponseDto) => void;
  /** 로그아웃 — 세션과 토큰을 모두 비운다 */
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  userName: null,
  email: null,
  isAuthenticated: false,
  setSession: (login) => {
    setTokens(login.accessToken, login.refreshToken);
    set({
      userId: login.userID,
      userName: login.userName,
      email: login.email,
      isAuthenticated: true,
    });
  },
  clearSession: () => {
    clearTokens();
    set({ userId: null, userName: null, email: null, isAuthenticated: false });
  },
}));
