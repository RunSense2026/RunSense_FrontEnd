import { View, Text, TextInput, type TextInputProps } from 'react-native';
import type { ReactNode } from 'react';

// Auth-style labeled input. Mirrors AEField in auth-extra-screens.jsx /
// FieldShell in aux-screens.jsx.
interface AEFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  focused?: boolean;
  right?: ReactNode;
  hint?: string;
}

export const AEField = ({ label, focused, right, hint, ...inputProps }: AEFieldProps) => {
  return (
    <View>
      <View
        className="rounded-[14px] px-[14px] py-[10px] flex-row items-center gap-[10px]"
        style={{
          backgroundColor: focused ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.04)',
          borderWidth: focused ? 1 : 0.5,
          borderColor: focused ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)',
        }}
      >
        <View className="flex-1">
          <Text
            className="text-[10px] tracking-[0.8px] uppercase font-bold mb-[3px]"
            style={{ color: focused ? '#a78bfa' : 'rgba(167,139,250,0.5)' }}
          >
            {label}
          </Text>
          <TextInput
            placeholderTextColor="rgba(255,255,255,0.3)"
            className="text-white text-[15px] p-0 font-medium"
            {...inputProps}
          />
        </View>
        {right}
      </View>
      {hint && (
        <Text className="text-[10px] font-medium mt-[6px] ml-1" style={{ color: 'rgba(167,139,250,0.65)' }}>
          {hint}
        </Text>
      )}
    </View>
  );
};
