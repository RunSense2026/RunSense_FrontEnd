import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RSBackground } from '@/components/domain';

// Placeholder for screens whose full design hasn't been ported yet.
// Each Phase-2 screen will replace this with the real implementation.
export const ScreenStub = ({ name }: { name: string }) => (
  <View className="flex-1">
    <RSBackground>
      <SafeAreaView className="flex-1 items-center justify-center">
        <Text className="text-t2 text-xs uppercase tracking-widest">RunSense</Text>
        <Text className="text-white text-2xl font-semibold mt-2">{name}</Text>
        <Text className="text-t3 text-xs mt-4">Phase 2에서 구현 예정</Text>
      </SafeAreaView>
    </RSBackground>
  </View>
);

export const makeStub = (name: string) => () => <ScreenStub name={name} />;
