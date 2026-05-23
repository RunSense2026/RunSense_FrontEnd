import LinearGradient from 'react-native-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { gradients } from '@/theme/tokens';

interface RSBackgroundProps {
  children?: ReactNode;
  soft?: boolean;
}

// Standard RunSense gradient background (165deg purple→blue).
// `soft` swaps in the lighter 4-stop variant used on auth/onboarding screens.
export const RSBackground = ({ children, soft = false }: RSBackgroundProps) => {
  const colors = soft ? gradients.bgSoft : gradients.bg;
  // 165deg ≈ start at top-right, end at bottom-left
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0.95, y: 0 }}
      end={{ x: 0.05, y: 1 }}
      style={StyleSheet.absoluteFill}
    >
      {children}
    </LinearGradient>
  );
};
