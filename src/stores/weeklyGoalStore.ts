import { create } from 'zustand';

// 이번 주 러닝 목표 — 홈 카드와 목표 설정 화면이 공유하는 단일 소스.
// (실서비스에서는 서버/스토리지와 동기화할 위치)
interface WeeklyGoalState {
  /** 주간 목표 거리(km) */
  targetKm: number;
  /** 주간 목표 러닝 횟수 */
  daysPerWeek: number;
  setGoal: (goal: { targetKm: number; daysPerWeek: number }) => void;
}

export const useWeeklyGoalStore = create<WeeklyGoalState>((set) => ({
  targetKm: 20,
  daysPerWeek: 4,
  setGoal: (goal) => set(goal),
}));
