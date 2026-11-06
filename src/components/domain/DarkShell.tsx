import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import type { ReactNode } from 'react';

// Shared dark shell used by run-flow, dashboard, lthr, report, history,
// devices, settings — anything that uses the deep purple gradient theme.
interface DarkShellProps {
  children: ReactNode;
  recording?: boolean;
}
export const DarkShell = ({ children, recording }: DarkShellProps) => (
  <View className="flex-1 bg-rs-bg">
    <LinearGradient
      colors={['#0a0716', '#1a0f3d', '#0f1942', '#0a0716']}
      locations={[0, 0.35, 0.7, 1]}
      start={{ x: 0.85, y: 0 }}
      end={{ x: 0.15, y: 1 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      {recording && <RecordingBadge />}
      {children}
    </SafeAreaView>
  </View>
);

const RecordingBadge = () => (
  <View className="flex-row items-center gap-1 self-start ml-[22px] mt-2 mb-1">
    <View className="w-[6px] h-[6px] rounded-full bg-purple-300" />
    <Text className="text-purple-300 text-[11px] font-semibold">REC</Text>
  </View>
);

interface DarkNavHeaderProps {
  title: string;
  sub?: string;
  right?: ReactNode;
  onBack?: () => void;
}
export const DarkNavHeader = ({ title, sub, right, onBack }: DarkNavHeaderProps) => (
  <View className="flex-row justify-between items-center pt-1 pb-[14px]">
    <View className="flex-row items-center gap-[10px]">
      <Pressable
        onPress={onBack}
        className="w-8 h-8 rounded-[10px] bg-rs-card items-center justify-center"
        style={{ borderWidth: 0.5, borderColor: 'rgba(167,139,250,0.18)' }}
      >
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path d="M15 18l-6-6 6-6" stroke="#c4b5fd" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <View>
        {sub && (
          <Text className="text-[10px] text-purple-300 font-bold tracking-[0.8px] uppercase">
            {sub}
          </Text>
        )}
        <Text
          className="text-[20px] font-bold text-white tracking-[-0.6px]"
          style={{ marginTop: sub ? 2 : 0 }}
        >
          {title}
        </Text>
      </View>
    </View>
    {right}
  </View>
);
