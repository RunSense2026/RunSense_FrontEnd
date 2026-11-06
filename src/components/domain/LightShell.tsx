import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { ReactNode } from 'react';

// Light-themed shell used by Home, Report, Course, History — anything
// with the cream→lavender background.
interface LightShellProps {
  children: ReactNode;
}
export const LightShell = ({ children }: LightShellProps) => (
  <View className="flex-1 bg-[#f6f3ff]">
    <LinearGradient
      colors={['#f6f3ff', '#eef0ff', '#e8eeff', '#f4f0ff']}
      locations={[0, 0.38, 0.7, 1]}
      start={{ x: 0.9, y: 0 }}
      end={{ x: 0.1, y: 1 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
    <View
      pointerEvents="none"
      className="absolute -top-[60px] -right-[60px] w-[220px] h-[220px] rounded-full opacity-60"
      style={{ backgroundColor: 'rgba(167,139,250,0.18)' }}
    />
    <View
      pointerEvents="none"
      className="absolute top-[220px] -left-[60px] w-[180px] h-[180px] rounded-full opacity-60"
      style={{ backgroundColor: 'rgba(96,165,250,0.18)' }}
    />
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      {children}
    </SafeAreaView>
  </View>
);
