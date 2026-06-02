import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { AuthShell } from '@/components/domain';
import { gradients } from '@/theme/tokens';

import type { ScreenProps } from '@/types/navigation';

interface Step {
  title: string;
  body: string;
  Visual: () => JSX.Element;
}

const STEPS: Step[] = [
  {
    title: '스마트 인솔이\n당신의 폼을 분석합니다',
    body: 'FSR 센서 5개 + IMU가 발 압력, 케이던스, 좌·우 균형을 0.01초 단위로 측정해요.',
    Visual: InsoleVisual,
  },
  {
    title: 'AI 코치가\n실시간 가이드를 줍니다',
    body: '페이스, 심박존, 폼 점수를 종합해 음성으로 코칭. 1km마다, 또는 폼이 흐트러질 때.',
    Visual: CoachVisual,
  },
  {
    title: '오늘의 목표를\n알려주세요',
    body: '당신의 페이스로 매주 합리적인 거리를 추천해드릴게요.',
    Visual: GoalVisual,
  },
];

export const OnboardingScreen = ({ navigation }: ScreenProps<'Onboarding'>) => {
  const [step, setStep] = useState(0);
  const cur = STEPS[step];

  const handleDone = () => navigation.navigate('Main');

  return (
    <AuthShell>
      <View className="px-6 flex-row justify-between items-center pt-2">
        <View className="flex-row gap-[6px]">
          {STEPS.map((_, i) => {
            if (i <= step) {
              return (
                <LinearGradient
                  key={i}
                  colors={gradients.action}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: 3, width: i === step ? 28 : 18, borderRadius: 2 }}
                />
              );
            }
            return (
              <View
                key={i}
                className="h-[3px] w-[18px] rounded-[2px]"
                style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
              />
            );
          })}
        </View>
        {step < STEPS.length - 1 && (
          <Pressable onPress={handleDone}>
            <Text className="text-[13px] text-t3 font-medium">건너뛰기</Text>
          </Pressable>
        )}
      </View>

      <View className="flex-1 px-6 py-5">
        <View className="flex-1 items-center justify-center">
          <cur.Visual />
        </View>
        <View className="mb-7">
          <Text className="text-[26px] font-bold text-white tracking-[-0.78px] leading-[31px]">
            {cur.title}
          </Text>
          <Text className="text-[14px] text-t2 leading-[22px] mt-3 font-medium">
            {cur.body}
          </Text>
        </View>

        <Pressable onPress={() => (step < STEPS.length - 1 ? setStep(step + 1) : handleDone())}>
          <LinearGradient
            colors={gradients.action}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
          >
            <Text className="text-white text-[15px] font-semibold">
              {step < STEPS.length - 1 ? '다음' : '시작하기'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </AuthShell>
  );
};

// ─── Visuals ─────────────────────────────────────────────────────
function InsoleVisual() {
  const points: { x: number; y: number; r: number; color: string; strong?: boolean }[] = [
    { x: 80, y: 50, r: 9, color: '#a78bfa' },
    { x: 120, y: 56, r: 11, color: '#ef4444', strong: true },
    { x: 76, y: 122, r: 8, color: '#a78bfa' },
    { x: 124, y: 118, r: 9, color: '#fbbf24' },
    { x: 100, y: 196, r: 13, color: '#fbbf24', strong: true },
  ];
  return (
    <Svg width={200} height={240} viewBox="0 0 200 240">
      <Defs>
        <SvgGradient id="onb-foot-g" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0%" stopColor="rgba(167,139,250,0.4)" />
          <Stop offset="100%" stopColor="rgba(59,130,246,0.2)" />
        </SvgGradient>
      </Defs>
      <Path
        d="M100 16 C140 16 156 50 156 92 C156 122 146 142 142 168 C142 192 146 218 138 230 C130 240 110 232 100 230 C90 232 70 240 62 230 C54 218 58 192 58 168 C54 142 44 122 44 92 C44 50 60 16 100 16 Z"
        fill="url(#onb-foot-g)"
        stroke="rgba(167,139,250,0.55)"
        strokeWidth={1.4}
      />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.color} opacity={p.strong ? 0.95 : 0.7} />
      ))}
      <Path d="M80 50 L120 56" stroke="rgba(167,139,250,0.4)" strokeWidth={0.5} strokeDasharray="2 3" />
      <Path d="M76 122 L124 118" stroke="rgba(167,139,250,0.4)" strokeWidth={0.5} strokeDasharray="2 3" />
    </Svg>
  );
}

function CoachVisual() {
  return (
    <View className="w-[220px]">
      <LinearGradient
        colors={gradients.coach}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 14, borderRadius: 18, borderWidth: 0.5, borderColor: 'rgba(167,139,250,0.4)' }}
      >
        <View className="flex-row items-center gap-2 mb-2">
          <LinearGradient
            colors={gradients.action}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Circle cx={12} cy={12} r={6} fill="#fff" />
              <Circle cx={10} cy={11} r={1.2} fill="#7c3aed" />
              <Circle cx={14} cy={11} r={1.2} fill="#7c3aed" />
            </Svg>
          </LinearGradient>
          <View>
            <Text className="text-[11px] text-purple-200 font-semibold">AI 코치</Text>
            <Text className="text-[10px] text-t3">실시간 분석 중</Text>
          </View>
        </View>
        <Text className="text-[14px] text-white leading-[21px] font-medium">
          "케이던스가 살짝 떨어졌어요.{'\n'}호흡을 4박자로 맞춰볼까요?"
        </Text>
      </LinearGradient>
      <View className="mt-[14px] flex-row gap-[6px]">
        {[
          { l: '페이스', v: "5'28\"" },
          { l: '심박', v: '156' },
          { l: '폼', v: '84' },
        ].map((m) => (
          <View
            key={m.l}
            className="flex-1 rounded-[10px] py-2 px-[6px] items-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          >
            <Text className="text-[14px] font-semibold text-purple-300">{m.v}</Text>
            <Text className="text-[9px] text-t3 mt-[2px] tracking-[0.54px] uppercase font-semibold">
              {m.l}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function GoalVisual() {
  const goals = [
    { d: '주 3회', k: '12 km', active: false },
    { d: '주 4회', k: '20 km', active: true, badge: '추천' },
    { d: '주 5회', k: '30 km', active: false },
  ];
  return (
    <View className="w-[220px] gap-[10px]">
      {goals.map((g, i) => {
        const inner = (
          <View className="p-[14px] flex-row justify-between items-center">
            <View>
              <Text className="text-[13px] text-white font-semibold">{g.d}</Text>
              <Text
                className={`text-[18px] font-semibold mt-[2px] ${g.active ? 'text-purple-200' : 'text-white'}`}
              >
                {g.k}
              </Text>
            </View>
            {g.badge && (
              <LinearGradient
                colors={gradients.action}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}
              >
                <Text className="text-[10px] text-white font-semibold">{g.badge}</Text>
              </LinearGradient>
            )}
          </View>
        );
        if (g.active) {
          return (
            <LinearGradient
              key={i}
              colors={['rgba(124,58,237,0.25)', 'rgba(59,130,246,0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 14, borderWidth: 1, borderColor: 'rgba(167,139,250,0.55)' }}
            >
              {inner}
            </LinearGradient>
          );
        }
        return (
          <View
            key={i}
            className="rounded-[14px]"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 0.5,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            {inner}
          </View>
        );
      })}
    </View>
  );
}
