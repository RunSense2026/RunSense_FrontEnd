import { View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import type { ReactNode } from 'react';

import { gradients } from '@/theme/tokens';

// Shared chrome for all auth-flow screens. Provides:
//   - 165° purple→blue dark gradient background
//   - Three "ambient orbs" (no blur in RN — we use opacity to approximate)
//   - Back button helper
interface AuthShellProps {
  children: ReactNode;
}
export const AuthShell = ({ children }: AuthShellProps) => (
  <View className="flex-1 bg-rs-bg">
    <LinearGradient
      colors={gradients.bg}
      locations={[0, 0.38, 1]}
      start={{ x: 0.9, y: 0 }}
      end={{ x: 0.1, y: 1 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
    <Orb color="rgba(124,58,237,0.32)" size={260} top={-80} left={-80} />
    <Orb color="rgba(59,130,246,0.28)" size={220} top={200} right={-100} />
    <Orb color="rgba(167,139,250,0.30)" size={180} bottom={80} left={-60} />
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      {children}
    </SafeAreaView>
  </View>
);

const Orb = ({
  color,
  size,
  top,
  left,
  right,
  bottom,
}: {
  color: string;
  size: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}) => (
  <View
    style={{
      position: 'absolute',
      top,
      left,
      right,
      bottom,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      opacity: 0.4,
    }}
    pointerEvents="none"
  />
);

interface BackButtonProps {
  onPress: () => void;
}
export const AEBackButton = ({ onPress }: BackButtonProps) => (
  <Pressable
    onPress={onPress}
    className="w-9 h-9 rounded-[12px] bg-rs-card items-center justify-center"
    style={{ borderWidth: 0.5, borderColor: 'rgba(167,139,250,0.2)' }}
  >
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke="#c4b5fd" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  </Pressable>
);
