import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from '@/navigation/RootNavigator';
import { loadPersistedSession } from '@/utils/storage';
import { useAuthStore } from '@/stores/authStore';

import './global.css';

const App = () => {
  const [booting, setBooting] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Main'>('Login');

  // 앱 시작 시 '로그인 유지' 세션이 있으면 복원하고 홈으로 시작한다.
  useEffect(() => {
    loadPersistedSession()
      .then((session) => {
        if (session) {
          useAuthStore.getState().restoreSession(session);
          setInitialRoute('Main');
        }
      })
      .finally(() => setBooting(false));
  }, []);

  if (booting) {
    // AsyncStorage 로드 동안의 짧은 스플래시 (흰 화면 깜빡임 방지)
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: '#0a0716' }} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator initialRouteName={initialRoute} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
