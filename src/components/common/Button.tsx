import { Pressable, Text } from 'react-native';

import { cn } from '@/utils/cn';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
}

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  className,
}: ButtonProps) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        'px-6 py-3 rounded-lg items-center justify-center',
        variant === 'primary' && 'bg-primary active:bg-primary-dark',
        variant === 'secondary' && 'bg-gray-200 active:bg-gray-300',
        disabled && 'opacity-50',
        className,
      )}
    >
      <Text
        className={cn(
          'text-base font-semibold',
          variant === 'primary' ? 'text-white' : 'text-gray-800',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
};
