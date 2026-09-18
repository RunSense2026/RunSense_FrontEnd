import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { reissue } from '@/api';
import { navigateFromOutside } from '@/navigation/navigationRef';
import { useAuthStore } from '@/stores/authStore';
import { useInsoleStore } from '@/stores/insoleStore';
import { useProfileStore } from '@/stores/profileStore';
import { useWatchStore } from '@/stores/watchStore';
import { packetToFootData } from '@/utils/insoleMetrics';
import { accessToken, refreshToken, onTokensChanged, setTokens } from '@/utils/storage';
import {
  WEAR_PATH,
  isWearSupported,
  parseWearData,
  wearBridge,
  type WatchLive,
  type WatchRunComplete,
  type WatchRunState,
} from '@/wear/wearBridge';

/** 워치로 족압을 흘려보내는 최소 간격(ms). 인솔은 초당 수십 패킷이라 1Hz 로만 보낸다. */
const INSOLE_SYNC_MS = 1000;
/** 워치 연결 상태를 다시 확인하는 간격(ms) */
const STATUS_POLL_MS = 10000;

const toNumberOrNull = (v: string): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** JWT 의 만료 시각(ms). 파싱 실패 시 null */
const jwtExpiresAt = (token: string): number | null => {
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp?: number;
    };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
};

/** 만료가 5분 미만 남았으면 재발급이 필요하다고 본다 */
const ACCESS_REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * 워치가 토큰을 거부당했을 때: 리프레시 토큰은 계정당 하나이고 서버가 회전시키므로
 * 재발급은 항상 폰이 한다. 새 토큰은 setTokens → onTokensChanged 로 워치에 자동 전달된다.
 */
const answerWatchAuthRequest = async (): Promise<void> => {
  const access = accessToken.get();
  const refresh = refreshToken.get();
  if (!access || !refresh) return;
  const exp = jwtExpiresAt(access);
  const stale = exp == null || exp - Date.now() < ACCESS_REFRESH_MARGIN_MS;
  if (!stale) {
    // 아직 유효한 토큰 — 워치 저장본이 어긋났을 뿐이니 그대로 다시 보낸다.
    const { userId, userName } = useAuthStore.getState();
    if (userId != null) {
      void wearBridge.sendAuth({
        accessToken: access,
        refreshToken: refresh,
        userId,
        userName: userName ?? '',
      });
    }
    return;
  }
  try {
    const tokens = await reissue({ refreshToken: refresh });
    setTokens(tokens.accessToken, tokens.refreshToken);
  } catch {
    // 리프레시도 만료 — 사용자가 다시 로그인해야 한다. (apiClient 가 세션을 정리한다)
  }
};

/**
 * 폰 ↔ 갤럭시 워치 동기화 (App 루트에서 한 번만 마운트).
 *
 *  폰 → 워치 : 로그인 토큰 · 프로필(LTHR 등) · 인솔 연결 상태 · 인솔 실시간 족압
 *  워치 → 폰 : 러닝 상태 · 실시간 지표(심박·케이던스·거리) · 완료 요약 · 리포트 열기 요청
 */
export const useWatchSync = (): void => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.userId);
  const userName = useAuthStore((s) => s.userName);

  const insoleLConnected = useInsoleStore((s) => s.L.connected);
  const insoleRConnected = useInsoleStore((s) => s.R.connected);

  const lthr = useProfileStore((s) => s.lthr);
  const restingHr = useProfileStore((s) => s.restingHr);
  const birthDate = useProfileStore((s) => s.birthDate);
  const height = useProfileStore((s) => s.height);
  const weight = useProfileStore((s) => s.weight);
  const profileName = useProfileStore((s) => s.name);

  // ── 로그인 토큰 ─────────────────────────────────────
  useEffect(() => {
    if (!isWearSupported()) return;
    if (!isAuthenticated) {
      void wearBridge.clearAuth();
      return;
    }
    const push = () => {
      const access = accessToken.get();
      const refresh = refreshToken.get();
      if (!access || !refresh || userId == null) return;
      void wearBridge.sendAuth({
        accessToken: access,
        refreshToken: refresh,
        userId,
        userName: userName ?? '',
      });
    };
    push();
    // 재발급으로 토큰이 바뀌면 워치 것도 갱신한다.
    return onTokensChanged(push);
  }, [isAuthenticated, userId, userName]);

  // ── 프로필 (LTHR 은 서버에 없고 기기에만 있어 워치가 폰에서 받아야 한다) ──
  useEffect(() => {
    if (!isWearSupported()) return;
    void wearBridge.sendProfile({
      lthr: toNumberOrNull(lthr),
      restingHeartRate: toNumberOrNull(restingHr),
      birthDate: birthDate || null,
      height: toNumberOrNull(height),
      weight: toNumberOrNull(weight),
      userName: profileName || userName || null,
    });
  }, [lthr, restingHr, birthDate, height, weight, profileName, userName]);

  // ── 인솔 연결 상태 ──────────────────────────────────
  useEffect(() => {
    if (!isWearSupported()) return;
    void wearBridge.sendInsoleStatus({
      leftConnected: insoleLConnected,
      rightConnected: insoleRConnected,
    });
  }, [insoleLConnected, insoleRConnected]);

  // ── 인솔 실시간 족압 (1Hz) ──────────────────────────
  const lastInsoleSent = useRef(0);
  useEffect(() => {
    if (!isWearSupported()) return;
    return useInsoleStore.subscribe((state) => {
      if (!state.L.connected && !state.R.connected) return;
      const now = Date.now();
      if (now - lastInsoleSent.current < INSOLE_SYNC_MS) return;
      lastInsoleSent.current = now;
      void wearBridge.sendInsoleData(
        packetToFootData(state.L.packet),
        packetToFootData(state.R.packet),
      );
    });
  }, []);

  // ── 워치 → 폰 메시지 ────────────────────────────────
  useEffect(() => {
    if (!isWearSupported()) return;
    const store = useWatchStore.getState();
    return wearBridge.subscribe((msg) => {
      switch (msg.path) {
        case WEAR_PATH.RUN_STATE: {
          const s = parseWearData<WatchRunState>(msg);
          if (!s) return;
          store.setRunPhase(
            s.state === 'ended' ? 'idle' : s.state === 'paused' ? 'paused' : 'running',
          );
          break;
        }
        case WEAR_PATH.RUN_LIVE: {
          const live = parseWearData<WatchLive>(msg);
          if (live) store.setLive(live);
          break;
        }
        case WEAR_PATH.RUN_COMPLETE: {
          const summary = parseWearData<WatchRunComplete>(msg);
          if (summary) store.setComplete(summary);
          break;
        }
        case WEAR_PATH.OPEN_REPORT: {
          const body = parseWearData<{ activityId: number | null }>(msg);
          const activityId =
            body?.activityId ?? useWatchStore.getState().lastComplete?.activityId ?? null;
          if (activityId != null) navigateFromOutside('Report', { activityId });
          else navigateFromOutside('Main', { screen: 'History' });
          break;
        }
        case WEAR_PATH.AUTH_REQUEST: {
          void answerWatchAuthRequest();
          break;
        }
        case WEAR_PATH.INSOLE_REQUEST: {
          // 워치 센서 확인 화면이 현재 인솔 상태를 물어봄 — 즉시 다시 보낸다.
          const ins = useInsoleStore.getState();
          void wearBridge.sendInsoleStatus({
            leftConnected: ins.L.connected,
            rightConnected: ins.R.connected,
          });
          if (ins.L.connected || ins.R.connected) {
            void wearBridge.sendInsoleData(
              packetToFootData(ins.L.packet),
              packetToFootData(ins.R.packet),
            );
          }
          break;
        }
        default:
          break;
      }
    });
  }, []);

  // ── 연결 상태 폴링 (앱이 화면에 있을 때만) ──────────
  useEffect(() => {
    if (!isWearSupported()) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const refresh = () => {
      void wearBridge.getStatus().then((status) => useWatchStore.getState().setStatus(status));
    };
    const start = () => {
      refresh();
      if (!timer) timer = setInterval(refresh, STATUS_POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    start();
    const sub = AppState.addEventListener('change', (state) =>
      state === 'active' ? start() : stop(),
    );
    return () => {
      stop();
      sub.remove();
    };
  }, []);
};
