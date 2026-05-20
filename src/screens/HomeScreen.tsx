import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { useCounterStore } from '@/stores/counterStore';

import type { HomeScreenProps } from '@/types/navigation';

export const HomeScreen = ({}: HomeScreenProps) => {
  const count = useCounterStore((s) => s.count);
  const increase = useCounterStore((s) => s.increase);
  const decrease = useCounterStore((s) => s.decrease);
  const reset = useCounterStore((s) => s.reset);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-lg text-gray-500 mb-2">카운터</Text>
        <Text className="text-6xl font-bold text-gray-900 mb-12">{count}</Text>

        <View className="flex-row gap-3 mb-3">
          <Button label="-" onPress={decrease} variant="secondary" className="w-20" />
          <Button label="+" onPress={increase} className="w-20" />
        </View>

        <Button label="초기화" onPress={reset} variant="secondary" className="w-44" />
      </View>
    </SafeAreaView>
  );
};
