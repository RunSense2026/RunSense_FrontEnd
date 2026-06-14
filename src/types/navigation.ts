import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// 러닝 종료 시 대시보드에서 리포트로 넘기는 실제 세션 요약 값.
// (대시보드별로 측정 항목이 달라 모두 optional — 누락 시 ReportScreen 에서 기본값으로 대체)
export interface RunSummaryParam {
  distanceKm?: number;
  durationSec?: number;
  paceSpk?: number; // 초/km
  avgHeartRate?: number;
  cadence?: number;
  formScore?: number;
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
  DashboardA: undefined;
  DashboardB: undefined;
  DashboardC: undefined;
  // activityId 로 들어오면 저장된 기록 조회, run 으로 들어오면 갓 뛴 세션(자동 저장 대상).
  Report: { activityId?: number; run?: RunSummaryParam } | undefined;

  // LTHR
  LTHRTest: undefined;
  LTHRReport: undefined;

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
