import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// All screens from the RunSense design canvas. Each maps to one artboard.
export type RootStackParamList = {
  // Auth
  Login: undefined;
  LoginPassword: { email: string };
  Signup: undefined;
  FindAccount: undefined;
  Onboarding: undefined;

  // Main tabs
  Home: undefined;
  Course: undefined;
  History: undefined;
  Settings: undefined;

  // Run flow
  RunSetup: undefined;
  DashboardA: undefined;
  DashboardB: undefined;
  DashboardC: undefined;
  Report: undefined;

  // LTHR
  LTHRTest: undefined;
  LTHRReport: undefined;

  // Home details
  WeeklyGoalSetup: undefined;
  AllRuns: undefined;

  // Devices
  Devices: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

// Legacy alias kept for the boilerplate HomeScreen.
export type HomeScreenProps = ScreenProps<'Home'>;
