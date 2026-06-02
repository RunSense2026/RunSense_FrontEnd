import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MainTabs } from './MainTabs';
import { LoginScreen } from '@/screens/LoginScreen';
import { SignupScreen } from '@/screens/SignupScreen';
import { FindAccountScreen } from '@/screens/FindAccountScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { RunSetupScreen } from '@/screens/RunSetupScreen';
import { DashboardAScreen } from '@/screens/DashboardAScreen';
import { DashboardBScreen } from '@/screens/DashboardBScreen';
import { DashboardCScreen } from '@/screens/DashboardCScreen';
import { ReportScreen } from '@/screens/ReportScreen';
import { LTHRTestScreen } from '@/screens/LTHRTestScreen';
import { LTHRReportScreen } from '@/screens/LTHRReportScreen';
import { DevicesScreen } from '@/screens/DevicesScreen';
import { WeeklyGoalSetupScreen } from '@/screens/WeeklyGoalSetupScreen';
import { EditProfileScreen } from '@/screens/EditProfileScreen';

import type { RootStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0716' } }}
    >
      {/* Bottom-tab home (Home / Course / History / Settings) */}
      <Stack.Screen name="Main" component={MainTabs} />

      {/* Auth */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="FindAccount" component={FindAccountScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />

      {/* Run flow — full-screen, covers the tab bar */}
      <Stack.Screen name="RunSetup" component={RunSetupScreen} />
      <Stack.Screen name="DashboardA" component={DashboardAScreen} />
      <Stack.Screen name="DashboardB" component={DashboardBScreen} />
      <Stack.Screen name="DashboardC" component={DashboardCScreen} />
      <Stack.Screen name="Report" component={ReportScreen} />

      {/* LTHR */}
      <Stack.Screen name="LTHRTest" component={LTHRTestScreen} />
      <Stack.Screen name="LTHRReport" component={LTHRReportScreen} />

      {/* Detail */}
      <Stack.Screen name="WeeklyGoalSetup" component={WeeklyGoalSetupScreen} />
      <Stack.Screen name="Devices" component={DevicesScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  );
};
