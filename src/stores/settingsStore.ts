import { create } from 'zustand';

// 앱 환경설정 — 설정 화면의 토글이 공유하는 단일 소스.
// (거리 단위는 현재 설정값 저장까지. 화면 전반의 km↔mi 표시 변환은 후속 작업)
interface SettingsState {
  notifications: boolean;
  distanceUnit: 'km' | 'mi';
  setNotifications: (v: boolean) => void;
  toggleDistanceUnit: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  notifications: true,
  distanceUnit: 'km',
  setNotifications: (v) => set({ notifications: v }),
  toggleDistanceUnit: () =>
    set((s) => ({ distanceUnit: s.distanceUnit === 'km' ? 'mi' : 'km' })),
}));
