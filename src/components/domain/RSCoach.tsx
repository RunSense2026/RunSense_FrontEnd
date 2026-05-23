import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';

import { gradients } from '@/theme/tokens';

interface RSCoachProps {
  message: string;
  name?: string;
  subtitle?: string;
  onTap?: () => void;
}

// AI 코치 카드 — 메시지가 한 글자씩 타이핑되는 효과.
export const RSCoach = ({ message, name = 'AI 코치', subtitle, onTap }: RSCoachProps) => {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(message.slice(0, i));
      if (i >= message.length) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, [message]);

  return (
    <Pressable onPress={onTap} disabled={!onTap}>
      <LinearGradient
        colors={gradients.coach}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 14,
          flexDirection: 'row',
          gap: 10,
          alignItems: 'flex-start',
          borderWidth: 0.5,
          borderColor: 'rgba(167,139,250,0.34)',
        }}
      >
        <LinearGradient
          colors={gradients.action}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
        >
          <CoachGlyph />
        </LinearGradient>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-[6px]">
            <Text className="text-[11px] text-purple-200 font-semibold">{name}</Text>
            {subtitle && <Text className="text-[10px] text-t3">· {subtitle}</Text>}
            <View className="ml-auto flex-row gap-[2px]">
              {[0, 1, 2].map((i) => (
                <Wave key={i} delay={i * 120} />
              ))}
            </View>
          </View>
          <Text className="text-[13.5px] text-white leading-[19px] mt-1 font-medium">
            {displayed}
            {displayed.length < message.length && <Text className="text-purple-200">▍</Text>}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const Wave = ({ delay }: { delay: number }) => {
  const scale = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true, delay }),
        Animated.timing(scale, { toValue: 0.4, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, delay]);
  return <Animated.View style={{ width: 2, height: 10, borderRadius: 1, backgroundColor: '#a78bfa', transform: [{ scaleY: scale }] }} />;
};

const CoachGlyph = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2"
      stroke="#fff"
      strokeWidth={1.6}
      strokeLinecap="round"
      opacity={0.6}
    />
    <Circle cx={12} cy={12} r={4.5} fill="#fff" />
    <Circle cx={10.5} cy={11} r={0.9} fill="#7c3aed" />
    <Circle cx={13.5} cy={11} r={0.9} fill="#7c3aed" />
    <Path d="M10 13.6c0.6 0.7 1.4 1 2 1s1.4-0.3 2-1" stroke="#7c3aed" strokeWidth={1.1} strokeLinecap="round" fill="none" />
  </Svg>
);
