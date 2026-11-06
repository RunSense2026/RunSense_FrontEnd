import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { HomeScreen } from '@/screens/HomeScreen';
import { CourseScreen } from '@/screens/CourseScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { RSTabBar, type TabId } from '@/components/domain';

import type { MainTabParamList, RootStackParamList } from '@/types/navigation';
import { ROUTE_TO_TAB } from './tabRoutes';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Custom tab bar: render RSTabBar and wire its ids to the navigator.
// The "run" id is a flow launcher, so it pushes RunSetup on the root stack.
const MainTabBar = ({ state, navigation }: BottomTabBarProps) => {
  const activeRoute = state.routes[state.index].name as keyof MainTabParamList;

  const handleChange = (id: TabId) => {
    switch (id) {
      case 'home':
        navigation.navigate('Home');
        break;
      case 'course':
        navigation.navigate('Course');
        break;
      case 'log':
        navigation.navigate('History');
        break;
      case 'settings':
        navigation.navigate('Settings');
        break;
      case 'run':
        navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('RunSetup');
        break;
    }
  };

  return <RSTabBar active={ROUTE_TO_TAB[activeRoute]} onChange={handleChange} />;
};

export const MainTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <MainTabBar {...props} />}>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Course" component={CourseScreen} />
    <Tab.Screen name="History" component={HistoryScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);
