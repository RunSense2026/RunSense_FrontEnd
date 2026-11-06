import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from '@/navigation/RootNavigator';
import { navigationRef } from '@/navigation/navigationRef';
import { useWatchSync } from '@/hooks/useWatchSync';
import { loadPersistedSession, loadPersistedProfile } from '@/utils/storage';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';

import './global.css';

// 갤럭시 워치 동기화 — NavigationContainer 안에서 한 번만 마운트되는 빈 컴포넌트.
const WatchSync = () => {
  useWatchSync();
  return null;
};

const App = () => {
  const [booting, setBooting] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Main'>('Login');

  // 앱 시작 시 '로그인 유지' 세션이 있으면 복원하고 홈으로 시작한다.
  // 기기에 캐시해 둔 프로필(이름·신체 정보·사진)은 세션 복원 뒤에 얹어 첫 화면부터 값이 보이게 한다.
  // 서버 값(이름·생년월일·성별·키·체중)은 설정 화면 진입 시 readMyProfile() 로 최신화된다.
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
      <NavigationContainer ref={navigationRef}>
        <WatchSync />
        <RootNavigator initialRouteName={initialRoute} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
