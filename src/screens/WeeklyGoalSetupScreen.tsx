import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { LightShell } from '@/components/domain';
import { useWeeklyGoalStore } from '@/stores/weeklyGoalStore';
import { gradients } from '@/theme/tokens';

import type { ScreenProps } from '@/types/navigation';

type Preset = 'light' | 'balanced' | 'ambitious';

export const WeeklyGoalSetupScreen = ({ navigation }: ScreenProps<'WeeklyGoalSetup'>) => {
  const { targetKm, daysPerWeek, preferredDays, setGoal } = useWeeklyGoalStore();
  const [preset, setPreset] = useState<Preset>('balanced');
  const [days, setDays] = useState(daysPerWeek);
  const [km, setKm] = useState(targetKm);
  const [prefDays, setPrefDays] = useState<boolean[]>(preferredDays);

  const togglePrefDay = (i: number) =>
    setPrefDays((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  const handleComplete = () => {
    setGoal({ targetKm: km, daysPerWeek: days, preferredDays: prefDays });
    navigation.goBack();
  };

  const handlePresetSelect = (p: Preset) => {
    setPreset(p);
    if (p === 'light') {
      setDays(3);
      setKm(12);
    } else if (p === 'balanced') {
      setDays(4);
      setKm(20);
    } else {
      setDays(5);
      setKm(30);
    }
  };

  const perRun = (km / days).toFixed(1);

  return (
    <LightShell>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 14 }}>
        <NavHeader title="이번 주 목표 설정" onBack={() => navigation.goBack()} />

        {/* Preset cards */}
        <View className="flex-row gap-2 mb-3 mt-2">
          {(
            [
              { id: 'light', emoji: '🌱', title: '가볍게', line1: '주 3회', line2: '12 km' },
              { id: 'balanced', emoji: '⚡', title: '꾸준히', line1: '주 4회', line2: '20 km', badge: '추천' },
              { id: 'ambitious', emoji: '🔥', title: '도전적', line1: '주 5회', line2: '30 km' },
            ] as { id: Preset; emoji: string; title: string; line1: string; line2: string; badge?: string }[]
          ).map((p) => {
            const active = preset === p.id;
            const inner = (
              <View className="items-center pt-3 pb-[14px]">
                <Text className="text-[22px]">{p.emoji}</Text>
                <Text
                  className="text-[12px] font-bold mt-1"
                  style={{ color: active ? '#7c3aed' : '#1e1b4b' }}
                >
                  {p.title}
                </Text>
                <Text
                  className="text-[10px] font-semibold mt-[6px]"
                  style={{ color: active ? '#7c3aed' : '#7c6bb5' }}
                >
                  {p.line1}
                </Text>
                <Text
                  className="text-[13px] font-bold mt-[2px]"
                  style={{ color: active ? '#7c3aed' : '#1e1b4b' }}
                >
                  {p.line2}
                </Text>
              </View>
            );
            return (
              <Pressable
                key={p.id}
                onPress={() => handlePresetSelect(p.id)}
                className="flex-1 rounded-[16px] overflow-hidden relative"
                style={{
                  borderWidth: active ? 1.5 : 0.5,
                  borderColor: active ? '#7c3aed' : 'rgba(124,58,237,0.14)',
                }}
              >
                {p.badge && (
                  <LinearGradient
                    colors={gradients.action}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      marginLeft: -22,
                      zIndex: 1,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderBottomLeftRadius: 8,
                      borderBottomRightRadius: 8,
                    }}
                  >
                    <Text className="text-white text-[9px] font-bold">{p.badge}</Text>
                  </LinearGradient>
                )}
                {active ? (
                  <LinearGradient
                    colors={['rgba(124,58,237,0.16)', 'rgba(59,130,246,0.1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {inner}
                  </LinearGradient>
                ) : (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.78)' }}>{inner}</View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Days per week */}
        <CardWhite>
          <View className="flex-row justify-between items-center mb-[10px]">
            <View>
              <Text className="text-[10px] font-bold tracking-[0.6px] uppercase" style={{ color: '#7c6bb5' }}>
                러닝 횟수
              </Text>
              <View className="flex-row items-baseline gap-1 mt-1">
                <Text className="text-[24px] font-bold tracking-[-0.72px]" style={{ color: '#1e1b4b' }}>{days}</Text>
                <Text className="text-[12px] font-semibold" style={{ color: '#9b8cc5' }}>회 / 주</Text>
              </View>
            </View>
            <Text className="text-[11px] text-purple-500 font-bold">1회 ~ {perRun} km</Text>
          </View>
          <View className="flex-row gap-[6px]">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => {
              const active = days === n;
              if (active) {
                return (
                  <Pressable key={n} onPress={() => setDays(n)} className="flex-1">
                    <LinearGradient
                      colors={gradients.action}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                    >
                      <Text className="text-white text-[13px] font-bold">{n}</Text>
                    </LinearGradient>
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={n}
                  onPress={() => setDays(n)}
                  className="flex-1 py-[10px] rounded-[10px] items-center"
                  style={{
                    backgroundColor: 'rgba(124,58,237,0.06)',
                    borderWidth: 0.5,
                    borderColor: 'rgba(124,58,237,0.1)',
                  }}
                >
                  <Text className="text-purple-500 text-[13px] font-bold">{n}</Text>
                </Pressable>
              );
            })}
          </View>
        </CardWhite>

        {/* Distance slider */}
        <CardWhite>
          <View className="flex-row justify-between items-center mb-[10px]">
            <View>
              <Text className="text-[10px] font-bold tracking-[0.6px] uppercase" style={{ color: '#7c6bb5' }}>
                주간 총 거리
              </Text>
              <View className="flex-row items-baseline gap-1 mt-1">
                <Text className="text-[30px] font-bold text-purple-500 tracking-[-1.2px] leading-[38px]">{km}</Text>
                <Text className="text-[13px] font-semibold" style={{ color: '#9b8cc5' }}>km</Text>
              </View>
            </View>
            <View className="flex-row gap-[6px]">
              <CircleStep label="−" onPress={() => setKm(Math.max(2, km - 1))} />
              <CircleStep label="+" onPress={() => setKm(km + 1)} />
            </View>
          </View>

          {/* Slider bar */}
          <View className="h-6 mt-1 relative">
            <View className="absolute left-0 right-0 h-[6px] rounded-full" style={{ top: 9, backgroundColor: 'rgba(124,58,237,0.12)' }} />
            <LinearGradient
              colors={gradients.action}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                position: 'absolute',
                left: 0,
                top: 9,
                height: 6,
                borderRadius: 999,
                width: `${Math.min(100, (km / 50) * 100)}%`,
              }}
            />
            <View
              className="absolute top-0 w-6 h-6 rounded-full bg-white"
              style={{
                left: `${Math.min(100, (km / 50) * 100)}%`,
                marginLeft: -12,
                borderWidth: 3,
                borderColor: '#7c3aed',
              }}
            />
          </View>
          <View className="flex-row justify-between mt-2">
            {['0', '10', '20', '30', '40', '50 km'].map((v) => (
              <Text key={v} className="text-[10px] font-semibold" style={{ color: '#9b8cc5' }}>
                {v}
              </Text>
            ))}
          </View>
        </CardWhite>

        {/* Projection */}
        <LinearGradient
          colors={['rgba(124,58,237,0.1)', 'rgba(59,130,246,0.06)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: 'rgba(124,58,237,0.2)' }}
        >
          <Text className="text-[10px] text-purple-500 font-bold tracking-[0.8px] uppercase">
            ✦ 예상 결과
          </Text>
          <View className="flex-row gap-2 mt-[10px]">
            <ProjStat value={`${Math.round(km * 65)}`} label="kcal/주" />
            <ProjStat value={`${((km * 4.2) / 60).toFixed(1)}h`} label="총 시간" />
          </View>
          <View className="mt-[10px] px-[10px] py-2 rounded-[10px]" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
            <Text className="text-[11px] leading-[17px] font-medium" style={{ color: '#4a3e7a' }}>
              현재 페이스(<Text className="text-purple-500 font-bold">5'30"/km</Text>) 기준으로 약{' '}
              <Text className="text-purple-500 font-bold">{Math.round((km / 5) * 28)}분</Text>씩 {days}회 뛰면 달성돼요.
            </Text>
          </View>
        </LinearGradient>

        {/* Days picker */}
        <CardWhite>
          <Text className="text-[10px] font-bold tracking-[0.6px] uppercase mb-[10px]" style={{ color: '#7c6bb5' }}>
            선호 요일 (선택)
          </Text>
          <View className="flex-row justify-between">
            {['월', '화', '수', '목', '금', '토', '일'].map((d, i) => {
              const sel = prefDays[i];
              if (sel) {
                return (
                  <Pressable key={d} onPress={() => togglePrefDay(i)}>
                    <LinearGradient
                      colors={gradients.action}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text className="text-white text-[12px] font-bold">{d}</Text>
                    </LinearGradient>
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={d}
                  onPress={() => togglePrefDay(i)}
                  className="w-8 h-8 rounded-[10px] items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(124,58,237,0.06)',
                    borderWidth: 0.5,
                    borderColor: 'rgba(124,58,237,0.14)',
                  }}
                >
                  <Text className="text-[12px] font-bold" style={{ color: '#9b8cc5' }}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
        </CardWhite>

        <Pressable onPress={handleComplete} className="mt-1">
          <LinearGradient
            colors={gradients.action}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 15, borderRadius: 16, alignItems: 'center' }}
          >
            <Text className="text-white text-[15px] font-bold">목표 설정 완료</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </LightShell>
  );
};

const NavHeader = ({ title, sub, onBack }: { title: string; sub?: string; onBack: () => void }) => (
  <View className="flex-row items-center gap-[10px] pt-1 pb-[14px]">
    <Pressable
      onPress={onBack}
      className="w-[34px] h-[34px] rounded-[11px] items-center justify-center"
      style={{
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderWidth: 0.5,
        borderColor: 'rgba(124,58,237,0.18)',
      }}
    >
      <Text className="text-purple-500 text-[14px] font-bold">←</Text>
    </Pressable>
    <View>
      {sub && (
        <Text className="text-[10px] font-bold tracking-[0.8px] uppercase" style={{ color: '#7c6bb5' }}>{sub}</Text>
      )}
      <Text
        className="text-[20px] font-bold tracking-[-0.6px]"
        style={{ color: '#1e1b4b', marginTop: sub ? 2 : 0 }}
      >
        {title}
      </Text>
    </View>
  </View>
);

const CardWhite = ({ children }: { children: React.ReactNode }) => (
  <View
    className="rounded-[18px] p-[14px] mb-[10px]"
    style={{
      backgroundColor: 'rgba(255,255,255,0.78)',
      borderWidth: 0.5,
      borderColor: 'rgba(124,58,237,0.14)',
    }}
  >
    {children}
  </View>
);

const CircleStep = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    className="w-8 h-8 rounded-[10px] items-center justify-center"
    style={{
      backgroundColor: 'rgba(124,58,237,0.08)',
      borderWidth: 0.5,
      borderColor: 'rgba(124,58,237,0.18)',
    }}
  >
    <Text className="text-purple-500 text-base font-bold">{label}</Text>
  </Pressable>
);

const ProjStat = ({ value, label, tone }: { value: string; label: string; tone?: 'good' }) => (
  <View className="flex-1 items-center">
    <Text
      className="text-[18px] font-bold tracking-[-0.36px] leading-[24px]"
      style={{ color: tone === 'good' ? '#059669' : '#1e1b4b' }}
    >
      {value}
    </Text>
    <Text className="text-[10px] font-semibold mt-[3px] tracking-[0.4px] uppercase" style={{ color: '#7c6bb5' }}>
      {label}
    </Text>
  </View>
);
