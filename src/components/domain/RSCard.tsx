import { View, type ViewProps } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';
import { gradients } from '@/theme/tokens';

interface RSCardProps extends ViewProps {
  children: ReactNode;
  glow?: boolean;
  accent?: boolean;
  className?: string;
}

export const RSCard = ({ children, glow, accent, className, style, ...rest }: RSCardProps) => {
  const border = accent ? 'border-rs-card-border-strong' : 'border-rs-card-border';

  if (glow) {
    return (
      <LinearGradient
        colors={gradients.coach}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[{ borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(167,139,250,0.28)', padding: 14 }, style]}
        {...rest}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View
      className={cn('rounded-rs-md p-[14px] border bg-rs-card', border, className)}
      style={style}
      {...rest}
    >
      {children}
    </View>
  );
};
