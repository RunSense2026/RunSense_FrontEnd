import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

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
  Report: { activityId?: number } | undefined;

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
