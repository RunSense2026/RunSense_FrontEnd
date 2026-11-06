import { View, Text, type TextStyle } from 'react-native';

interface RSStatProps {
  value: string | number;
  label: string;
  accent?: boolean;
  valueStyle?: TextStyle;
  labelStyle?: TextStyle;
}

export const RSStat = ({ value, label, accent, valueStyle, labelStyle }: RSStatProps) => {
  return (
    <View className="items-center">
      <Text
        className={`text-[22px] font-semibold tracking-[-0.44px] leading-[28px] ${accent ? 'text-purple-200' : 'text-white'}`}
        style={[{ fontVariant: ['tabular-nums'] }, valueStyle]}
      >
        {value}
      </Text>
      <Text
        className="text-[11px] text-t3 mt-[5px] font-medium tracking-[0.44px] uppercase"
        style={labelStyle}
      >
        {label}
      </Text>
    </View>
  );
};
