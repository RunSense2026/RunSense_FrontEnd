import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from '@/navigation/RootNavigator';
import { loadPersistedSession, loadPersistedProfile } from '@/utils/storage';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';

import './global.css';

const App = () => {
  const [booting, setBooting] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Main'>('Login');

  // 앱 시작 시 '로그인 유지' 세션이 있으면 복원하고 홈으로 시작한다.
  // 기기에 저장해 둔 프로필(이름·이메일·신체 정보·사진)은 세션 복원 뒤에 덮어써서,
  // 사용자가 프로필 수정에서 고친 값이 로그인 응답 값보다 우선하게 한다.
  useEffect(() => {
    Promise.all([loadPersistedSession(), loadPersistedProfile()])
      .then(([session, profile]) => {
        if (session) {
          useAuthStore.getState().restoreSession(session);
          setInitialRoute('Main');
        }
        if (profile) useProfileStore.getState().hydrate(profile);
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
