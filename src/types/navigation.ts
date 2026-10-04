import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

import type { LthrAnalyzeResponseDto } from '@/types/aiApi';

// 러닝 종료 시 대시보드에서 리포트로 넘기는 실제 세션 요약 값.
// (대시보드별로 측정 항목이 달라 모두 optional — 누락 시 ReportScreen 에서 기본값으로 대체)
export interface RunSummaryParam {
  distanceKm?: number;
  durationSec?: number;
  paceSpk?: number; // 초/km
  avgHeartRate?: number;
  cadence?: number;
  formScore?: number;
  /** 러닝 중 수집된 km별 구간 페이스(초/km) — 스플릿 차트·백엔드 저장에 사용 */
  splits?: Array<{ km: number; paceSec: number }>;
  /** 러닝 중 생성된 AI 코칭 목록 — buildRunPayload 에서 백엔드 저장에 사용 */
  coachings?: Array<{ feedbackText: string; focusPoint: string | null; recExercise: string | null }>;
}

// Bottom-tab screens (the persistent 5-tab bar; "run" is a flow launcher, not a tab).
export type MainTabParamList = {
  Home: undefined;
  Course: undefined;
  History: undefined;
  Settings: undefined;
};

// Root stack — hosts the tab navigator plus the full-screen flows that cover it.
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;

  // Auth
  Login: undefined;
  Signup: undefined;
  FindAccount: undefined;
  Onboarding: undefined;

  // Run flow
  RunSetup: undefined;
  // 거리 모드에서 정한 목표 페이스(초/km)를 라이브 화면으로 전달
  DashboardA: { targetPaceSpk?: number } | undefined;
  DashboardB: undefined;
  DashboardC: undefined;
  // activityId 로 들어오면 저장된 기록 조회, run 으로 들어오면 갓 뛴 세션(자동 저장 대상).
  Report: { activityId?: number; run?: RunSummaryParam } | undefined;

  // LTHR
  LTHRTest: undefined;
  LTHRReport: {
    /** LTHR 분석 결과 (AI 서버 실패 시 기기에서 같은 방식으로 계산한 값) */
    result: LthrAnalyzeResponseDto;
    coachingAnalysis?: string;
    /** 차트용 심박 추이 — 본 테스트를 30초 구간 평균으로 줄인 값 */
    samples: number[];
    /** 테스트 전 안정 측정 단계의 평균 심박수 (bpm) */
    restingHeartRate: number;
    /** 본 테스트 진행 시간(초) */
    testSeconds: number;
    /** 테스트 종료 시각 (ISO) */
    finishedAt: string;
    /** 워치 심박이 없어 시뮬레이션 값이 섞였는지 */
    simulated: boolean;
  };

  // Detail
  WeeklyGoalSetup: undefined;
  Devices: undefined;
  EditProfile: undefined;
};

// Props for root-stack screens.
export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

// Props for tab screens — can also reach root-stack routes via the parent navigator.
export type TabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type HomeScreenProps = TabScreenProps<'Home'>;
