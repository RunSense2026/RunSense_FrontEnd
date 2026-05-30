import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, RadialGradient, Stop } from 'react-native-svg';

import { DarkShell, RSCard, RSCoach, RSSparkline, RSButton } from '@/components/domain';
import { fmtPace, fmtTime, hrZone } from '@/utils/format';
import { useTicker } from '@/hooks/useTicker';

import type { ScreenProps } from '@/types/navigation';

// ═════════════════════════════════════════════════════════════
// VARIATION A — "Pace Hero" — pace dominates as a glowing ring
// ═════════════════════════════════════════════════════════════
export const DashboardAScreen = ({ navigation }: ScreenProps<'DashboardA'>) => {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [paused]);

  const sec = 1068 + tick;
  const distKm = 3.24 + tick * 0.0028;
  const hr = 156 + Math.round(Math.sin(tick / 4) * 3);
  const paceSpk = 328 + Math.round(Math.cos(tick / 6) * 4);
  const animatedPace = useTicker(paceSpk, 0.08);
  const cad = 178 + Math.round(Math.sin(tick / 3) * 2);
  const zone = hrZone(hr, 164);

  const target = 330;
  const deviation = Math.max(-30, Math.min(30, paceSpk - target));
  const ringPct = 0.5 + -deviation / 60;

  return (
    <DarkShell recording>
      {/* Header */}
      <View className="px-[18px] pt-1 flex-row justify-between items-center">
        <View className="flex-row items-center gap-2">
          <View className="w-2 h-2 rounded bg-bad" />
          <Text className="text-[12px] text-t2 font-medium">한강공원 · 3.2km 지점</Text>
        </View>
        <View
          className="px-[10px] py-1 rounded-full"
          style={{
            backgroundColor: `${zone.color}24`,
            borderWidth: 0.5,
            borderColor: `${zone.color}40`,
          }}
        >
          <Text className="text-[11px] font-semibold" style={{ color: zone.color }}>{zone.label}</Text>
        </View>
      </View>

      {/* Pace ring */}
      <View className="items-center mt-[18px]">
        <PaceRing pct={ringPct} pace={animatedPace} />
      </View>

      <View className="items-center mt-2">
        <Text className="text-[11px] text-t3 tracking-[0.66px] uppercase font-semibold">
          목표 {fmtPace(target)} · 평균 {fmtPace(331)}
        </Text>
        <Text
          className="text-[12px] mt-1 font-semibold"
          style={{ color: deviation < -3 ? '#6ee7b7' : deviation > 3 ? '#fbbf24' : '#c4b5fd' }}
        >
          {deviation < -3
            ? `목표보다 ${Math.abs(deviation)}초 빠름`
            : deviation > 3
              ? `목표보다 ${deviation}초 느림`
              : '목표 페이스 유지 중'}
        </Text>
      </View>

      {/* Primary metrics */}
      <View className="px-4 pt-4 flex-row gap-2">
        <MetricCard value={distKm.toFixed(2)} unit="km" label="거리" />
        <MetricCard value={fmtTime(sec)} label="시간" />
        <MetricCard value={String(hr)} unit="bpm" label="심박수" accent={zone.color} />
      </View>

      {/* HR sparkline */}
      <View className="px-4 pt-[10px]">
        <RSCard style={{ padding: 12 }}>
          <View className="flex-row justify-between items-center mb-[6px]">
            <Text className="text-[11px] text-t3 uppercase tracking-[0.66px] font-semibold">
              최근 5분 심박
            </Text>
            <Text className="text-[11px] text-t3">평균 154 · 최대 162</Text>
          </View>
          <RSSparkline data={genHrTrace(tick)} width={284} height={36} stroke={zone.color} />
        </RSCard>
      </View>

      {/* AI coach */}
      <View className="px-4 pt-[10px]">
        <RSCoach subtitle="3km 분석" message="페이스가 안정적이에요. 이 리듬으로 1km만 더 가볼까요?" />
      </View>

      {/* Micro row */}
      <View className="px-4 pt-[10px] flex-row gap-[6px]">
        <MicroStat label="케이던스" value={String(cad)} unit="spm" />
        <MicroStat label="좌·우 균형" value="49 / 51" />
        <MicroStat label="보폭" value="1.12" unit="m" />
      </View>

      <View className="flex-1" />

      {/* Actions */}
      <View className="px-4 pb-[14px] flex-row gap-[10px]">
        <View className="flex-1">
          <RSButton variant="danger" label="종료" onPress={() => navigation.navigate('Report')} />
        </View>
        <View style={{ flex: 1.4 }}>
          <RSButton variant="ghost" label={paused ? '▶  재개' : '⏸  일시정지'} onPress={() => setPaused((p) => !p)} />
        </View>
      </View>
    </DarkShell>
  );
};

const PaceRing = ({ pct, pace }: { pct: number; pace: number }) => {
  const size = 240,
    stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(1, Math.max(0, pct));
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="paceGrad" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0%" stopColor="#a78bfa" />
            <Stop offset="55%" stopColor="#7c3aed" />
            <Stop offset="100%" stopColor="#3b82f6" />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="url(#paceGrad)" strokeWidth={stroke} fill="none" opacity={0.15} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#paceGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeDashoffset={c * 0.25}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text className="text-[10px] text-t3 tracking-[1.6px] uppercase font-semibold mb-1">
          현재 페이스
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          className="text-[64px] font-bold text-white tracking-[-2.56px]"
          style={{ lineHeight: 70 }}
        >
          {fmtPace(pace)}
        </Text>
        <Text className="text-[11px] text-t3 mt-[6px] font-medium">/km</Text>
      </View>
    </View>
  );
};

interface MetricCardProps {
  value: string;
  unit?: string;
  label: string;
  accent?: string;
}
const MetricCard = ({ value, unit, label, accent = '#a78bfa' }: MetricCardProps) => (
  <View
    className="flex-1 rounded-[14px] px-2 py-[10px] items-center"
    style={{
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.07)',
    }}
  >
    <View className="flex-row items-baseline">
      <Text className="text-[26px] font-semibold tracking-[-0.78px] leading-[28px]" style={{ color: accent }}>{value}</Text>
      {unit && <Text className="text-[12px] text-t3 ml-[3px] font-medium">{unit}</Text>}
    </View>
    <Text className="text-[10px] text-t3 mt-[6px] tracking-[0.8px] uppercase font-semibold">
      {label}
    </Text>
  </View>
);

const MicroStat = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
  <View
    className="flex-1 rounded-[10px] px-[6px] py-2 items-center"
    style={{
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.05)',
    }}
  >
    <Text className="text-[9px] text-t3 tracking-[0.54px] uppercase font-semibold">
      {label}
    </Text>
    <View className="flex-row items-baseline mt-[3px]">
      <Text className="text-[14px] font-semibold text-purple-200">{value}</Text>
      {unit && <Text className="text-[10px] text-t3 ml-[2px] font-medium">{unit}</Text>}
    </View>
  </View>
);

const genHrTrace = (seed: number): number[] => {
  const arr: number[] = [];
  for (let i = 0; i < 60; i++) {
    arr.push(150 + Math.sin((i + seed) / 5) * 4 + Math.cos(i / 3) * 2 + Math.sin(i / 2.3) * 1.5);
  }
  return arr;
};
