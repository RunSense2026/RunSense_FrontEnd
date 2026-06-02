import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { TabId } from '@/components/domain';
import type { MainTabParamList, RootStackParamList } from '@/types/navigation';

// Bottom-tab route name → RSTabBar id, for highlighting the active tab.
export const ROUTE_TO_TAB: Record<keyof MainTabParamList, TabId> = {
  Home: 'home',
  Course: 'course',
  History: 'log',
  Settings: 'settings',
};

// Used by root-stack screens that still render RSTabBar (Report / LTHRTest /
// Devices): route a tab press into the Main tab navigator, or launch the run flow.
// Literal `screen` values keep TS happy with NavigatorScreenParams' discriminated union.
export const handleRootTabPress = <T extends keyof RootStackParamList>(
  navigation: NativeStackNavigationProp<RootStackParamList, T>,
  id: TabId,
) => {
  switch (id) {
    case 'home':
      navigation.navigate('Main', { screen: 'Home' });
      break;
    case 'course':
      navigation.navigate('Main', { screen: 'Course' });
      break;
    case 'log':
      navigation.navigate('Main', { screen: 'History' });
      break;
    case 'settings':
      navigation.navigate('Main', { screen: 'Settings' });
      break;
    case 'run':
      navigation.navigate('RunSetup');
      break;
  }
};
