import { View } from 'react-native';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

// Phone frame used in the design canvas. On real devices this is just a
// pass-through, but in dev preview (e.g. tablet/web) it adds the iPhone-ish
// chrome from the original design canvas.
interface PhoneFrameProps {
  children: ReactNode;
  preview?: boolean;
  className?: string;
}

export const PhoneFrame = ({ children, preview = false, className }: PhoneFrameProps) => {
  if (!preview) {
    return <View className={cn('flex-1 bg-rs-bg', className)}>{children}</View>;
  }
  return (
    <View className="self-center bg-black p-2 rounded-[48px]" style={{ width: 390, height: 844 }}>
      <View className="absolute top-[18px] left-1/2 -translate-x-1/2 w-[118px] h-8 rounded-[18px] bg-black z-50" />
      <View className="absolute bottom-[18px] left-1/2 -translate-x-1/2 w-[134px] h-[5px] rounded-full bg-white/40 z-50" />
      <View className="flex-1 rounded-[40px] overflow-hidden bg-rs-bg">{children}</View>
    </View>
  );
};
