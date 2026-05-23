import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop, G, Line, Polygon } from 'react-native-svg';

import { DarkShell, DarkNavHeader } from '@/components/domain';
import { gradients } from '@/theme/tokens';

import type { ScreenProps } from '@/types/navigation';

type Mode = 'dist' | 'time' | 'free';

export const RunSetupScreen = ({ navigation }: ScreenProps<'RunSetup'>) => {
  const [mode, setMode] = useState<Mode>('dist');
  const [distKm, setDistKm] = useState(5.0);
  const [timeMin, setTimeMin] = useState(28);

  const pace = useMemo(() => {
    if (mode === 'free') return null;
    return (timeMin * 60) / distKm;
  }, [distKm, timeMin, mode]);

  const paceStr = pace
    ? `${Math.floor(pace / 60)}'${String(Math.round(pace - Math.floor(pace / 60) * 60)).padStart(2, '0')}"`
    : '—';

  const zone = !pace
    ? null
    : pace > 360
      ? { label: '유산소 (Z2)', c: '#6ee7b7' }
      : pace > 320
        ? { label: '템포 (Z3)', c: '#a78bfa' }
        : pace > 290
          ? { label: '역치 (Z4)', c: '#fbbf24' }
          : { label: '무산소 (Z5)', c: '#f87171' };

  return (
    <DarkShell>
      <View
        className="absolute top-0 -right-[80px] w-[260px] h-[260px] rounded-full opacity-40"
        style={{ backgroundColor: 'rgba(124,58,237,0.32)' }}
        pointerEvents="none"
      />
      <View
        className="absolute bottom-[120px] -left-[80px] w-[220px] h-[220px] rounded-full opacity-40"
        style={{ backgroundColor: 'rgba(59,130,246,0.28)' }}
        pointerEvents="none"
      />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 14 }}>
        <DarkNavHeader title="러닝 시작" sub="오늘의 세션" onBack={() => navigation.goBack()} />

        {/* Mode tabs */}
        <View
          className="flex-row gap-1 rounded-[12px] p-1 mb-[14px]"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.14)',
          }}
        >
          {(
            [
              { id: 'dist', label: '목표 거리' },
              { id: 'time', label: '목표 시간' },
              { id: 'free', label: '자유 러닝' },
            ] as { id: Mode; label: string }[]
          ).map((t) => {
            const active = mode === t.id;
            if (active) {
              return (
                <Pressable key={t.id} onPress={() => setMode(t.id)} className="flex-1">
                  <LinearGradient
                    colors={gradients.action}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingVertical: 9, borderRadius: 9, alignItems: 'center' }}
                  >
                    <Text className="text-white text-[12px] font-bold">{t.label}</Text>
                  </LinearGradient>
                </Pressable>
              );
            }
            return (
              <Pressable key={t.id} onPress={() => setMode(t.id)} className="flex-1 py-[9px] items-center">
                <Text className="text-[12px] font-bold" style={{ color: 'rgba(221,214,254,0.65)' }}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Target inputs */}
        {mode !== 'free' && (
          <View
            className="rounded-[18px] p-4 mb-3"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderWidth: 0.5,
              borderColor: 'rgba(167,139,250,0.18)',
            }}
          >
            <Text className="text-[10px] text-purple-300 font-bold tracking-[0.8px] uppercase">
              {mode === 'dist' ? '목표 거리' : '목표 시간'}
            </Text>

            <View className="flex-row items-center justify-between mt-[10px]">
              <StepBtn
                label="−"
                onPress={() => {
                  if (mode === 'dist') setDistKm(Math.max(0.5, +(distKm - 0.5).toFixed(1)));
                  else setTimeMin(Math.max(5, timeMin - 1));
                }}
              />
              <View className="items-center">
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  className="text-[56px] font-bold text-white tracking-[-2.8px] leading-[58px]"
                >
                  {mode === 'dist' ? distKm.toFixed(2) : timeMin}
                </Text>
                <Text className="text-[11px] text-purple-300 font-bold tracking-[0.88px] mt-1">
                  {mode === 'dist' ? 'KILOMETERS' : 'MINUTES'}
                </Text>
              </View>
              <StepBtn
                label="+"
                onPress={() => {
                  if (mode === 'dist') setDistKm(+(distKm + 0.5).toFixed(1));
                  else setTimeMin(timeMin + 1);
                }}
              />
            </View>

            {/* Quick chips */}
            <View className="flex-row gap-[6px] mt-[14px] justify-center flex-wrap">
              {(mode === 'dist' ? [3, 5, 7, 10, 21.1] : [20, 30, 45, 60, 90]).map((v) => {
                const active = (mode === 'dist' ? distKm : timeMin) === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => (mode === 'dist' ? setDistKm(v) : setTimeMin(v))}
                    className="px-[10px] py-[5px] rounded-full"
                    style={{
                      backgroundColor: active ? 'rgba(167,139,250,0.28)' : 'rgba(255,255,255,0.04)',
                      borderWidth: 0.5,
                      borderColor: active ? 'rgba(167,139,250,0.55)' : 'rgba(167,139,250,0.14)',
                    }}
                  >
                    <Text
                      className="text-[11px] font-bold"
                      style={{ color: active ? '#ddd6fe' : 'rgba(221,214,254,0.55)' }}
                    >
                      {v}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Pair input */}
            <View
              className="mt-3 px-3 py-[10px] rounded-[12px] flex-row justify-between items-center"
              style={{
                backgroundColor: 'rgba(167,139,250,0.08)',
                borderWidth: 0.5,
                borderColor: 'rgba(167,139,250,0.14)',
              }}
            >
              <Text className="text-[11px] font-semibold" style={{ color: 'rgba(221,214,254,0.7)' }}>
                {mode === 'dist' ? '목표 완주 시간' : '목표 거리'}
              </Text>
              <View className="flex-row items-center gap-2">
                {mode === 'dist' ? (
                  <>
                    <BumpBtn label="−" onPress={() => setTimeMin(Math.max(5, timeMin - 1))} />
                    <Text className="text-[16px] font-bold text-white text-center min-w-[50px]">
                      {timeMin}분
                    </Text>
                    <BumpBtn label="+" onPress={() => setTimeMin(timeMin + 1)} />
                  </>
                ) : (
                  <>
                    <BumpBtn label="−" onPress={() => setDistKm(Math.max(0.5, +(distKm - 0.5).toFixed(1)))} />
                    <Text className="text-[16px] font-bold text-white text-center min-w-[64px]">
                      {distKm.toFixed(1)} km
                    </Text>
                    <BumpBtn label="+" onPress={() => setDistKm(+(distKm + 0.5).toFixed(1))} />
                  </>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Auto pace hero */}
        <LinearGradient
          colors={['rgba(124,58,237,0.34)', 'rgba(59,130,246,0.22)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 18,
            padding: 16,
            marginBottom: 12,
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.4)',
          }}
        >
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-[10px] font-bold tracking-[0.8px] uppercase" style={{ color: '#ddd6fe' }}>
                ✦ 자동 계산된 목표 페이스
              </Text>
              <View className="flex-row items-baseline gap-1 mt-[6px]">
                <Text numberOfLines={1} className="text-[38px] font-bold text-white tracking-[-1.52px] leading-[40px]">{paceStr}</Text>
                <Text className="text-[12px] font-semibold" style={{ color: 'rgba(221,214,254,0.7)' }}>/km</Text>
              </View>
              {zone && (
                <View
                  className="flex-row items-center self-start gap-[6px] mt-2 px-[9px] py-[3px] rounded-full"
                  style={{
                    backgroundColor: `${zone.c}22`,
                    borderWidth: 0.5,
                    borderColor: `${zone.c}55`,
                  }}
                >
                  <View className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: zone.c }} />
                  <Text className="text-[10px] font-bold tracking-[0.4px]" style={{ color: zone.c }}>{zone.label}</Text>
                </View>
              )}
            </View>
            <PaceGauge pace={pace} />
          </View>

          {/* Pace lane bar */}
          <View className="mt-[14px]">
            <View className="relative h-[22px] rounded-full opacity-80">
              <LinearGradient
                colors={['#6ee7b7', '#a78bfa', '#fbbf24', '#f87171']}
                locations={[0, 0.35, 0.65, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ height: 22, borderRadius: 999 }}
              />
              {pace && (
                <View
                  className="absolute w-[6px] rounded bg-white"
                  style={{
                    top: -3,
                    bottom: -3,
                    left: `${Math.max(0, Math.min(100, ((420 - pace) / 240) * 100))}%`,
                    marginLeft: -3,
                  }}
                />
              )}
            </View>
            <View className="flex-row justify-between mt-[6px]">
              {["7'00\"", "6'00\"", "5'00\"", "4'00\"", "3'00\""].map((v) => (
                <Text key={v} className="text-[9px] font-semibold" style={{ color: 'rgba(221,214,254,0.55)' }}>
                  {v}
                </Text>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* Devices + LTHR */}
        <View className="flex-row gap-2 mb-3">
          <MiniInfo label="연결 기기" value="3" sub="모두 정상" tone="ok" />
          <MiniInfo label="내 LTHR" value="162" sub="bpm" tone="hot" />
        </View>

        {/* Settings rows */}
        <View
          className="rounded-[16px] px-[14px] mb-[14px]"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.14)',
          }}
        >
          <SetupRow icon="🎙" label="음성 코칭" value="1km마다" />
          <View className="h-[0.5px]" style={{ backgroundColor: 'rgba(167,139,250,0.1)' }} />
          <SetupRow icon="📍" label="코스" value="자유 GPS" />
          <View className="h-[0.5px]" style={{ backgroundColor: 'rgba(167,139,250,0.1)' }} />
          <SetupRow icon="🎵" label="음악" value="러닝 플레이리스트" />
        </View>

        <Pressable onPress={() => navigation.navigate('DashboardA')}>
          <LinearGradient
            colors={gradients.action}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Polygon points="7,5 19,12 7,19" fill="#fff" />
            </Svg>
            <Text className="text-white text-base font-bold">러닝 시작</Text>
          </LinearGradient>
        </Pressable>

        <Text className="text-[10px] text-center mt-2 font-medium" style={{ color: 'rgba(167,139,250,0.55)' }}>
          3초 후 GPS 신호 잠금 → 자동 시작
        </Text>
      </ScrollView>
    </DarkShell>
  );
};

const StepBtn = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    className="w-11 h-11 rounded-[14px] items-center justify-center"
    style={{
      backgroundColor: 'rgba(167,139,250,0.14)',
      borderWidth: 0.5,
      borderColor: 'rgba(167,139,250,0.32)',
    }}
  >
    <Text className="text-[22px] font-bold" style={{ color: '#ddd6fe' }}>{label}</Text>
  </Pressable>
);

const BumpBtn = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    className="w-[26px] h-[26px] rounded-lg items-center justify-center"
    style={{
      backgroundColor: 'rgba(167,139,250,0.18)',
      borderWidth: 0.5,
      borderColor: 'rgba(167,139,250,0.3)',
    }}
  >
    <Text className="text-[14px] font-bold" style={{ color: '#ddd6fe' }}>{label}</Text>
  </Pressable>
);

const MiniInfo = ({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'ok' | 'hot' }) => {
  const c = tone === 'hot' ? '#fbbf24' : '#6ee7b7';
  return (
    <View
      className="flex-1 rounded-[14px] px-3 py-[10px]"
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 0.5,
        borderColor: 'rgba(167,139,250,0.14)',
      }}
    >
      <Text className="text-[9px] font-bold tracking-[0.54px] uppercase" style={{ color: 'rgba(167,139,250,0.7)' }}>
        {label}
      </Text>
      <View className="flex-row items-baseline gap-1 mt-[5px]">
        <Text className="text-[20px] font-bold tracking-[-0.6px] leading-6" style={{ color: c }}>{value}</Text>
        <Text className="text-[10px] font-semibold" style={{ color: 'rgba(167,139,250,0.6)' }}>{sub}</Text>
      </View>
    </View>
  );
};

const SetupRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View className="flex-row items-center justify-between py-3">
    <View className="flex-row items-center gap-[10px]">
      <Text className="text-[15px]">{icon}</Text>
      <Text className="text-[13px] text-white font-semibold">{label}</Text>
    </View>
    <View className="flex-row items-center gap-[6px]">
      <Text className="text-[12px] font-semibold" style={{ color: 'rgba(221,214,254,0.7)' }}>{value}</Text>
      <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
        <Path d="M9 6l6 6-6 6" stroke="rgba(167,139,250,0.5)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  </View>
);

const PaceGauge = ({ pace }: { pace: number | null }) => {
  const v = !pace ? 0.5 : Math.max(0, Math.min(1, (420 - pace) / 240));
  const angle = v * 180;
  return (
    <Svg width={90} height={56} viewBox="0 0 90 56">
      <Defs>
        <SvgGradient id="rs-gauge-g" x1="0" x2="1">
          <Stop offset="0%" stopColor="#6ee7b7" />
          <Stop offset="50%" stopColor="#a78bfa" />
          <Stop offset="100%" stopColor="#f87171" />
        </SvgGradient>
      </Defs>
      <Path d="M8 48 A37 37 0 0 1 82 48" fill="none" stroke="rgba(167,139,250,0.18)" strokeWidth={6} strokeLinecap="round" />
      <Path
        d="M8 48 A37 37 0 0 1 82 48"
        fill="none"
        stroke="url(#rs-gauge-g)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={`${v * 116} 999`}
      />
      <G transform={`rotate(${angle - 90} 45 48)`}>
        <Line x1={45} y1={48} x2={45} y2={20} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
        <Circle cx={45} cy={48} r={3.5} fill="#fff" />
      </G>
    </Svg>
  );
};
