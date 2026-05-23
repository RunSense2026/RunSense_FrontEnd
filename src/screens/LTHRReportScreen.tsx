import { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Polyline, Defs, LinearGradient as SvgGradient, Stop, Line, Rect, Circle } from 'react-native-svg';

import { DarkShell, DarkNavHeader, RSButton } from '@/components/domain';

import type { ScreenProps } from '@/types/navigation';

const LTHR = 162;

const ZONES = [
  { id: 1, label: 'Z1 회복', range: `< ${Math.round(LTHR * 0.81)}`, c: '#93c5fd', pct: 8 },
  { id: 2, label: 'Z2 유산소', range: `${Math.round(LTHR * 0.81)}–${Math.round(LTHR * 0.89) - 1}`, c: '#6ee7b7', pct: 22 },
  { id: 3, label: 'Z3 템포', range: `${Math.round(LTHR * 0.89)}–${Math.round(LTHR * 0.94) - 1}`, c: '#a78bfa', pct: 26 },
  { id: 4, label: 'Z4 역치', range: `${Math.round(LTHR * 0.94)}–${LTHR - 1}`, c: '#fbbf24', pct: 32 },
  { id: 5, label: 'Z5 무산소', range: `≥ ${LTHR}`, c: '#f87171', pct: 12 },
];

export const LTHRReportScreen = ({ navigation }: ScreenProps<'LTHRReport'>) => {
  const samples = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 60; i++) {
      const t = i / 59;
      let v;
      if (t < 0.33) v = 132 + t * 3 * 28;
      else if (t < 0.66) v = 158 + (t - 0.33) * 3 * 6;
      else v = 162 + (t - 0.66) * 3 * 6;
      v += (Math.sin(i * 1.6) + Math.cos(i * 0.9)) * 1.6;
      arr.push(Math.round(v));
    }
    return arr;
  }, []);

  return (
    <DarkShell>
      <View
        className="absolute top-0 -right-[100px] w-[280px] h-[280px] rounded-full opacity-40"
        style={{ backgroundColor: 'rgba(251,191,36,0.22)' }}
        pointerEvents="none"
      />
      <View
        className="absolute top-[280px] -left-[100px] w-[240px] h-[240px] rounded-full opacity-40"
        style={{ backgroundColor: 'rgba(124,58,237,0.3)' }}
        pointerEvents="none"
      />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 14 }}>
        <DarkNavHeader title="LTHR 테스트 결과" sub="2026.05.17 · 30:00" onBack={() => navigation.goBack()} />

        {/* HERO RESULT */}
        <LinearGradient
          colors={['rgba(251,191,36,0.22)', 'rgba(124,58,237,0.18)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 22,
            paddingHorizontal: 16,
            paddingTop: 18,
            paddingBottom: 16,
            marginBottom: 12,
            alignItems: 'center',
            borderWidth: 0.5,
            borderColor: 'rgba(251,191,36,0.42)',
          }}
        >
          <View
            className="flex-row items-center gap-[5px] px-[10px] py-[3px] rounded-full"
            style={{
              backgroundColor: 'rgba(251,191,36,0.18)',
              borderWidth: 0.5,
              borderColor: 'rgba(251,191,36,0.4)',
            }}
          >
            <Svg width={11} height={11} viewBox="0 0 24 24">
              <Path d="M12 2 L15 9 L22 10 L17 15 L18 22 L12 18 L6 22 L7 15 L2 10 L9 9 Z" fill="#fbbf24" />
            </Svg>
            <Text className="text-[10px] font-bold tracking-[0.6px] uppercase" style={{ color: '#fde68a' }}>
              새 LTHR 측정 완료
            </Text>
          </View>
          <View className="flex-row items-baseline gap-2 mt-3">
            <Text numberOfLines={1} className="text-[72px] font-bold text-white tracking-[-3.6px] leading-[74px]">{LTHR}</Text>
            <Text className="text-[14px] font-bold" style={{ color: '#fde68a' }}>bpm</Text>
          </View>
          <Text className="text-[11px] font-semibold mt-2" style={{ color: 'rgba(253,230,138,0.7)' }}>후반 20분 평균 심박수</Text>

          {/* Delta */}
          <View
            className="mt-3 flex-row items-center gap-[6px] px-[11px] py-1 rounded-full"
            style={{
              backgroundColor: 'rgba(110,231,183,0.16)',
              borderWidth: 0.5,
              borderColor: 'rgba(110,231,183,0.34)',
            }}
          >
            <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
              <Polyline points="6 15 12 9 18 15" stroke="#6ee7b7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text className="text-[11px] text-good font-bold">+ 4 bpm</Text>
            <Text className="text-[10px] font-semibold" style={{ color: 'rgba(110,231,183,0.65)' }}>vs 지난 측정 (158)</Text>
          </View>
        </LinearGradient>

        {/* HR chart */}
        <View
          className="rounded-[18px] p-[14px] mb-3"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.16)',
          }}
        >
          <Text className="text-[10px] text-purple-300 font-bold tracking-[0.8px] uppercase">
            심박 추이
          </Text>
          <Text className="text-[11px] mt-[2px] font-medium" style={{ color: 'rgba(221,214,254,0.6)' }}>30분간 (1샘플/30초)</Text>
          <View className="mt-[10px]">
            <HRLineChart samples={samples} />
          </View>
        </View>

        {/* Stats grid */}
        <View className="flex-row gap-2 mb-3">
          <ReportStat label="최고 심박" value="174" unit="bpm" color="#f87171" />
          <ReportStat label="평균 심박" value="158" unit="bpm" color="#a78bfa" />
          <ReportStat label="회복 1분" value="-22" unit="bpm" color="#6ee7b7" />
        </View>

        {/* Training zones */}
        <View
          className="rounded-[18px] p-[14px] mb-3"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.16)',
          }}
        >
          <View className="flex-row justify-between items-center mb-[10px]">
            <Text className="text-[10px] text-purple-300 font-bold tracking-[0.8px] uppercase">
              새 트레이닝 존
            </Text>
            <Text className="text-[10px] text-good font-bold">✓ 자동 적용됨</Text>
          </View>

          <View className="flex-row h-[10px] rounded-full overflow-hidden mb-3">
            {ZONES.map((z) => (
              <View key={z.id} style={{ flex: z.pct, backgroundColor: z.c, opacity: 0.85 }} />
            ))}
          </View>

          {ZONES.map((z, i) => (
            <View
              key={z.id}
              className="flex-row items-center justify-between py-2 px-1"
              style={{
                borderTopWidth: i === 0 ? 0 : 0.5,
                borderTopColor: 'rgba(167,139,250,0.08)',
              }}
            >
              <View className="flex-row items-center gap-[9px]">
                <View className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: z.c }} />
                <Text className="text-[12px] font-bold text-white">{z.label}</Text>
              </View>
              <View className="flex-row items-center gap-[10px]">
                <Text className="text-[11px] font-semibold" style={{ color: 'rgba(221,214,254,0.6)' }}>{z.range} bpm</Text>
                <Text className="text-[12px] font-bold text-right min-w-[32px]" style={{ color: z.c }}>{z.pct}%</Text>
              </View>
            </View>
          ))}
        </View>

        {/* AI insight */}
        <LinearGradient
          colors={['rgba(124,58,237,0.28)', 'rgba(59,130,246,0.18)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 18,
            padding: 14,
            marginBottom: 14,
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.34)',
            flexDirection: 'row',
            gap: 10,
          }}
        >
          <LinearGradient
            colors={['#7c3aed', '#3b82f6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Circle cx={12} cy={12} r={6} fill="#fff" />
              <Circle cx={10} cy={11} r={1.4} fill="#7c3aed" />
              <Circle cx={14} cy={11} r={1.4} fill="#7c3aed" />
            </Svg>
          </LinearGradient>
          <View className="flex-1">
            <Text className="text-[11px] text-purple-200 font-bold tracking-[0.4px]">AI 코치 분석</Text>
            <Text className="text-[13px] text-white leading-5 mt-[6px] font-medium">
              지난 측정 대비 <Text className="text-good font-bold">유산소 능력이 향상</Text>됐어요. 다음 주는 Z3 템포
              러닝을 주 2회로 늘려보세요.
            </Text>
          </View>
        </LinearGradient>

        {/* Actions */}
        <View className="flex-row gap-2">
          <View className="flex-1">
            <RSButton variant="ghost" label="다시 측정" onPress={() => navigation.goBack()} />
          </View>
          <View className="flex-1">
            <RSButton variant="primary" label="완료" onPress={() => navigation.navigate('Home')} />
          </View>
        </View>
      </ScrollView>
    </DarkShell>
  );
};

const HRLineChart = ({ samples }: { samples: number[] }) => {
  const W = 320,
    H = 120,
    P = 6;
  const minHR = 120,
    maxHR = 180;
  const xStep = (W - P * 2) / (samples.length - 1);
  const y = (v: number) => H - P - ((v - minHR) / (maxHR - minHR)) * (H - P * 2);
  const pts = samples.map((v, i) => [P + i * xStep, y(v)] as const);
  const path = pts.map(([x, yy], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${yy.toFixed(1)}`).join(' ');
  const area = `${path} L${W - P} ${H - P} L${P} ${H - P} Z`;
  const lthrY = y(LTHR);

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
      <Defs>
        <SvgGradient id="lthr-rep-fill" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0%" stopColor="#a78bfa" stopOpacity={0.42} />
          <Stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
        </SvgGradient>
      </Defs>
      {[140, 160].map((g) => (
        <Line key={g} x1={P} y1={y(g)} x2={W - P} y2={y(g)} stroke="rgba(167,139,250,0.1)" strokeWidth={0.5} />
      ))}
      <Rect x={P + (W - P * 2) / 3} y={P} width={((W - P * 2) * 2) / 3} height={H - P * 2} fill="rgba(167,139,250,0.06)" />
      <Line x1={P} y1={lthrY} x2={W - P} y2={lthrY} stroke="#fbbf24" strokeWidth={1} strokeDasharray="3 3" />
      <Path d={area} fill="url(#lthr-rep-fill)" />
      <Path d={path} fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={4} fill="#fff" stroke="#a78bfa" strokeWidth={2} />
    </Svg>
  );
};

const ReportStat = ({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) => (
  <View
    className="flex-1 rounded-[12px] px-2 py-[10px] items-center"
    style={{
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderWidth: 0.5,
      borderColor: 'rgba(167,139,250,0.14)',
    }}
  >
    <Text className="text-[9px] font-bold tracking-[0.54px] uppercase" style={{ color: 'rgba(167,139,250,0.7)' }}>
      {label}
    </Text>
    <View className="flex-row items-baseline gap-[3px] mt-1">
      <Text className="text-[19px] font-bold tracking-[-0.57px] leading-[24px]" style={{ color }}>{value}</Text>
      <Text className="text-[9px] font-semibold" style={{ color: 'rgba(167,139,250,0.6)' }}>{unit}</Text>
    </View>
  </View>
);
