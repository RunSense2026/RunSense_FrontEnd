import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import { DarkShell, RSTabBar, type TabId } from '@/components/domain';

import type { ScreenProps } from '@/types/navigation';

export const LTHRTestScreen = ({ navigation }: ScreenProps<'LTHRTest'>) => {
  const [elapsed] = useState(754);
  const TOTAL = 1800;
  const pct = Math.min(100, (elapsed / TOTAL) * 100);

  const samples = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 56; i++) {
      const t = i / 55;
      const base = 132 + t * 36;
      const noise = (Math.sin(i * 1.3) + Math.cos(i * 0.7)) * 4;
      arr.push(Math.round(base + noise));
    }
    return arr;
  }, []);
  const currentHR = 168;
  const minHR = 120;
  const maxHR = 180;

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const remaining = TOTAL - elapsed;
  const rmm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const rss = String(remaining % 60).padStart(2, '0');

  const zoneGradient = (hr: number): [string, string] => {
    if (hr < 150) return ['#a78bfa', '#8b5cf6'];
    if (hr < 165) return ['#fbbf24', '#f59e0b'];
    return ['#ef4444', '#dc2626'];
  };

  const handleTabPress = (id: TabId) => {
    if (id === 'home') navigation.navigate('Home');
    else if (id === 'course') navigation.navigate('Course');
    else if (id === 'log') navigation.navigate('History');
    else if (id === 'settings') navigation.navigate('Settings');
  };

  return (
    <DarkShell>
      <View
        className="absolute top-0 -right-[80px] w-[280px] h-[280px] rounded-full opacity-40"
        style={{ backgroundColor: 'rgba(124,58,237,0.32)' }}
        pointerEvents="none"
      />
      <View
        className="absolute top-[320px] -left-[80px] w-[240px] h-[240px] rounded-full opacity-40"
        style={{ backgroundColor: 'rgba(59,130,246,0.28)' }}
        pointerEvents="none"
      />
      <View
        className="absolute bottom-[120px] -right-[60px] w-[200px] h-[200px] rounded-full opacity-30"
        style={{ backgroundColor: 'rgba(239,68,68,0.32)' }}
        pointerEvents="none"
      />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 14 }}>
        {/* Inline header (no back; stop button used instead) */}
        <View className="flex-row justify-between items-center pt-1 pb-[14px]">
          <View>
            <Text className="text-[11px] text-purple-300 font-semibold tracking-[0.88px] uppercase">
              체력 테스트
            </Text>
            <Text className="text-[22px] font-bold text-white tracking-[-0.66px] leading-[26px] mt-1">
              LTHR 측정 중
            </Text>
          </View>
          <View
            className="rounded-full px-[10px] py-1 flex-row items-center gap-[5px]"
            style={{
              backgroundColor: 'rgba(239,68,68,0.18)',
              borderWidth: 0.5,
              borderColor: 'rgba(239,68,68,0.4)',
            }}
          >
            <View className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: '#ef4444' }} />
            <Text className="text-[10px] font-bold tracking-[0.4px]" style={{ color: '#fca5a5' }}>
              REC
            </Text>
          </View>
        </View>

        {/* Info banner */}
        <View
          className="rounded-[14px] px-[14px] py-3 mb-[14px] flex-row gap-[10px]"
          style={{
            backgroundColor: 'rgba(124,58,237,0.18)',
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.32)',
          }}
        >
          <LinearGradient
            colors={['#a78bfa', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
          >
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Circle cx={12} cy={12} r={10} stroke="#fff" strokeWidth={2.4} />
              <Path d="M12 16v-4M12 8h.01" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />
            </Svg>
          </LinearGradient>
          <View className="flex-1">
            <Text className="text-[12px] font-bold mb-[2px]" style={{ color: '#ddd6fe' }}>테스트 안내</Text>
            <Text className="text-[11.5px] leading-[17px] font-medium" style={{ color: 'rgba(221,214,254,0.8)' }}>
              30분간 전력 질주하세요. 후반 20분의 평균 심박수를 자동으로 계산해 LTHR을 추정합니다.
            </Text>
          </View>
        </View>

        {/* Timer card */}
        <View
          className="rounded-[18px] px-4 pt-5 pb-[18px] mb-3 items-center"
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.18)',
          }}
        >
          <View className="flex-row gap-[6px] mb-3">
            <PhaseDot label="워밍업" done />
            <PhaseDot label="전반 10분" done />
            <PhaseDot label="후반 20분 (측정)" active />
          </View>

          <View className="flex-row items-baseline gap-[6px]">
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="text-[56px] font-bold text-white tracking-[-2.8px] leading-[58px]"
            >
              {mm}:{ss}
            </Text>
            <Text className="text-[18px] font-semibold tracking-[-0.36px]" style={{ color: 'rgba(167,139,250,0.6)' }}>
              / 30:00
            </Text>
          </View>
          <Text className="text-[10px] text-purple-300 font-semibold tracking-[0.8px] uppercase mt-[6px]">
            남은 시간 {rmm}:{rss}
          </Text>

          {/* Progress + phase marker */}
          <View className="w-full mt-[14px] pb-[18px]">
            <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(167,139,250,0.14)' }}>
              <LinearGradient
                colors={['#7c3aed', '#6366f1', '#3b82f6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: `${pct}%`, height: '100%', borderRadius: 999 }}
              />
            </View>
            <View
              className="absolute w-px"
              style={{ left: '33.3%', top: -2, height: 12, backgroundColor: 'rgba(255,255,255,0.3)' }}
            />
            <Text
              className="absolute text-[9px] font-semibold"
              style={{ left: '33.3%', top: 12, marginLeft: -22, color: 'rgba(167,139,250,0.6)' }}
            >
              측정 시작
            </Text>
          </View>
        </View>

        {/* HR live card */}
        <View
          className="rounded-[18px] p-[14px] mb-3"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.16)',
          }}
        >
          <View className="flex-row justify-between items-start mb-[10px]">
            <View>
              <Text className="text-[10px] text-purple-300 font-bold tracking-[0.8px] uppercase">
                실시간 심박수
              </Text>
              <Text className="text-[11px] mt-[2px] font-medium" style={{ color: 'rgba(221,214,254,0.6)' }}>
                최근 60초
              </Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-baseline gap-1">
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path
                    d="M12 21s-7-4.5-9.5-9.5C0.5 7 4 3 8 3c2 0 3.5 1 4 2 0.5-1 2-2 4-2 4 0 7.5 4 5.5 8.5C19 16.5 12 21 12 21z"
                    fill="#ef4444"
                  />
                </Svg>
                <Text className="text-[36px] font-bold text-bad-2 tracking-[-1.44px] leading-[40px]">{currentHR}</Text>
              </View>
              <Text className="text-[10px] font-bold tracking-[0.6px]" style={{ color: '#fca5a5' }}>
                BPM · 무산소 영역
              </Text>
            </View>
          </View>

          {/* Bar chart — each bar uses top→bottom gradient by zone */}
          <View className="flex-row items-end gap-[2px] h-20">
            {samples.map((hr, i) => {
              const h = Math.max(4, ((hr - minHR) / (maxHR - minHR)) * 80);
              const [c1, c2] = zoneGradient(hr);
              const isLast = i === samples.length - 1;
              return (
                <LinearGradient
                  key={i}
                  colors={[c1, c2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    flex: 1,
                    height: h,
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                    opacity: isLast ? 1 : 0.85,
                  }}
                />
              );
            })}
          </View>

          <View
            className="flex-row gap-[10px] mt-3 pt-[10px]"
            style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(167,139,250,0.12)' }}
          >
            <ZoneLegend color="#a78bfa" label="유산소" range="< 150" />
            <ZoneLegend color="#fbbf24" label="역치" range="150-165" />
            <ZoneLegend color="#ef4444" label="무산소" range="≥ 165" />
          </View>
        </View>

        {/* LTHR pair cards */}
        <View className="flex-row gap-2 mb-[14px]">
          <LTHRStatCard label="현재 LTHR" value="—" sub="미설정" tone="muted" />
          <LTHRStatCard label="Karvonen 추정값" value="~162" sub="bpm" tone="hot" highlight />
        </View>

        {/* Stop button */}
        <Pressable onPress={() => navigation.navigate('LTHRReport')}>
          <LinearGradient
            colors={['#ef4444', '#dc2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingVertical: 14,
              borderRadius: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Rect x={6} y={6} width={12} height={12} rx={1.5} fill="#fff" />
            </Svg>
            <Text className="text-white text-[14px] font-bold">테스트 중지</Text>
          </LinearGradient>
        </Pressable>

        <Text className="text-[10px] text-center mt-2 font-medium" style={{ color: 'rgba(167,139,250,0.5)' }}>
          중지하면 측정값이 저장되지 않습니다
        </Text>
      </ScrollView>

      <RSTabBar active="run" onChange={handleTabPress} />
    </DarkShell>
  );
};

const PhaseDot = ({ label, active, done }: { label: string; active?: boolean; done?: boolean }) => {
  const color = done ? '#10b981' : active ? '#a78bfa' : 'rgba(167,139,250,0.3)';
  return (
    <View
      className="flex-row items-center gap-1 px-2 py-[3px] rounded-full"
      style={{
        backgroundColor: active ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.04)',
        borderWidth: 0.5,
        borderColor: active ? 'rgba(167,139,250,0.4)' : 'rgba(167,139,250,0.12)',
      }}
    >
      <View className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: color }} />
      <Text
        className="text-[9px] font-bold tracking-[0.36px]"
        style={{ color: active ? '#ddd6fe' : done ? '#6ee7b7' : 'rgba(167,139,250,0.5)' }}
      >
        {label}
      </Text>
    </View>
  );
};

const ZoneLegend = ({ color, label, range }: { color: string; label: string; range: string }) => (
  <View className="flex-1 gap-[2px]">
    <View className="flex-row items-center gap-[5px]">
      <View className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: color }} />
      <Text className="text-[10px] font-bold" style={{ color: '#ddd6fe' }}>{label}</Text>
    </View>
    <Text className="text-[9px] font-semibold ml-[13px]" style={{ color: 'rgba(167,139,250,0.6)' }}>{range}</Text>
  </View>
);

const LTHR_TONES = {
  muted: { color: 'rgba(167,139,250,0.5)', border: 'rgba(167,139,250,0.12)', bg: 'rgba(255,255,255,0.03)' },
  hot: { color: '#fbbf24', border: 'rgba(251,191,36,0.3)', bg: 'rgba(251,191,36,0.08)' },
};

const LTHRStatCard = ({
  label,
  value,
  sub,
  tone,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  tone: 'muted' | 'hot';
  highlight?: boolean;
}) => {
  const c = LTHR_TONES[tone];
  return (
    <View
      className="flex-1 rounded-[14px] p-3 overflow-hidden"
      style={{
        backgroundColor: c.bg,
        borderWidth: 0.5,
        borderColor: c.border,
      }}
    >
      {highlight && (
        <LinearGradient
          colors={['#fbbf24', '#f59e0b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2 }}
        />
      )}
      <Text className="text-[9px] font-bold tracking-[0.54px] uppercase" style={{ color: 'rgba(167,139,250,0.7)' }}>
        {label}
      </Text>
      <View className="flex-row items-baseline gap-1 mt-[6px]">
        <Text className="text-[24px] font-bold tracking-[-0.72px] leading-[30px]" style={{ color: c.color }}>{value}</Text>
        <Text className="text-[10px] font-semibold" style={{ color: 'rgba(167,139,250,0.6)' }}>{sub}</Text>
      </View>
    </View>
  );
};
