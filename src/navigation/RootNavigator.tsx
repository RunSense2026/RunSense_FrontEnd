import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '@/screens/HomeScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { LoginPasswordScreen } from '@/screens/LoginPasswordScreen';
import { SignupScreen } from '@/screens/SignupScreen';
import { FindAccountScreen } from '@/screens/FindAccountScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { RunSetupScreen } from '@/screens/RunSetupScreen';
import { DashboardAScreen } from '@/screens/DashboardAScreen';
import { DashboardBScreen } from '@/screens/DashboardBScreen';
import { DashboardCScreen } from '@/screens/DashboardCScreen';
import { ReportScreen } from '@/screens/ReportScreen';
import { CourseScreen } from '@/screens/CourseScreen';
import { LTHRTestScreen } from '@/screens/LTHRTestScreen';
import { LTHRReportScreen } from '@/screens/LTHRReportScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { DevicesScreen } from '@/screens/DevicesScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { WeeklyGoalSetupScreen } from '@/screens/WeeklyGoalSetupScreen';
import { AllRunsScreen } from '@/screens/AllRunsScreen';

import type { RootStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0716' } }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />

      {/* Auth */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="LoginPassword" component={LoginPasswordScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="FindAccount" component={FindAccountScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />

      {/* Tabs */}
      <Stack.Screen name="Course" component={CourseScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />

      {/* Run flow */}
      <Stack.Screen name="RunSetup" component={RunSetupScreen} />
      <Stack.Screen name="DashboardA" component={DashboardAScreen} />
      <Stack.Screen name="DashboardB" component={DashboardBScreen} />
      <Stack.Screen name="DashboardC" component={DashboardCScreen} />
      <Stack.Screen name="Report" component={ReportScreen} />

      {/* LTHR */}
      <Stack.Screen name="LTHRTest" component={LTHRTestScreen} />
      <Stack.Screen name="LTHRReport" component={LTHRReportScreen} />

      {/* Home details */}
      <Stack.Screen name="WeeklyGoalSetup" component={WeeklyGoalSetupScreen} />
      <Stack.Screen name="AllRuns" component={AllRunsScreen} />

      {/* Devices */}
      <Stack.Screen name="Devices" component={DevicesScreen} />
    </Stack.Navigator>
  );
};
