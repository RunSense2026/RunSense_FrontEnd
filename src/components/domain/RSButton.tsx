import { Pressable, Text, type PressableProps } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { cn } from '@/utils/cn';
import { gradients } from '@/theme/tokens';

type Variant = 'primary' | 'ghost' | 'danger' | 'quiet';

interface RSButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  className?: string;
}

export const RSButton = ({ label, variant = 'primary', className, ...rest }: RSButtonProps) => {
  if (variant === 'primary') {
    return (
      <Pressable {...rest} className={cn('w-full', className)}>
        <LinearGradient
          colors={gradients.action}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
        >
          <Text className="text-white text-[15px] font-semibold">{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }
  if (variant === 'danger') {
    return (
      <Pressable {...rest} className={cn('w-full', className)}>
        <LinearGradient
          colors={gradients.danger}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
        >
          <Text className="text-white text-[15px] font-semibold">{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }
  if (variant === 'ghost') {
    return (
      <Pressable
        {...rest}
        className={cn(
          'w-full py-[14px] rounded-[14px] items-center border-[0.5px] border-purple-300/30',
          className,
        )}
        style={{ backgroundColor: 'rgba(167,139,250,0.14)' }}
      >
        <Text className="text-[15px] font-semibold" style={{ color: '#c4b5fd' }}>
          {label}
        </Text>
      </Pressable>
    );
  }
  return (
    <Pressable {...rest} className={cn('w-full py-[14px] rounded-[14px] items-center', className)}>
      <Text className="text-[15px] font-semibold text-t2">{label}</Text>
    </Pressable>
  );
};
