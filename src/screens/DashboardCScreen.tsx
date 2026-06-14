import { useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { DarkShell, RSCard, RSCoach, RSButton, EndRunModal } from '@/components/domain';
import { fmtPace, hrZone } from '@/utils/format';
import { useRunSession } from '@/hooks/useRunSession';
import { useInsoleStore } from '@/stores/insoleStore';
import { cadenceFromSteps, heatLevels, HEAT_COLORS, type HeatLevel } from '@/utils/insoleMetrics';

import type { ScreenProps } from '@/types/navigation';

// ═════════════════════════════════════════════════════════════
// VARIATION C — "Form Focus" — gait sensors emphasized
// ═════════════════════════════════════════════════════════════
export const DashboardCScreen = ({ navigation }: ScreenProps<'DashboardC'>) => {
  const [paused, setPaused] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  // 시작 시점(0초·0km)부터 실시간 누적되는 경과 시간·거리.
  const { tick, sec, distKm, paceSpk } = useRunSession(paused);
  const hr = 156 + Math.round(Math.sin(tick / 4) * 3);
  const form = 84 + Math.round(Math.sin(tick / 5) * 2);
  const zone = hrZone(hr, 164);

  // 실제 인솔이 연결돼 있으면 케이던스·발 압력을 실데이터로, 아니면 시뮬레이션으로.
  const insoleL = useInsoleStore((s) => s.L);
  const insoleR = useInsoleStore((s) => s.R);
  const stepTimes = useInsoleStore((s) => s.stepTimes);

  const liveCad = cadenceFromSteps(stepTimes, Date.now());
  const cad =
    (insoleL.connected || insoleR.connected) && liveCad > 0
      ? liveCad
      : 178 + Math.round(Math.sin(tick / 3) * 2);

  const lFsr = insoleL.packet
    ? toFsr(insoleL.packet.avg)
    : [0.4, 0.55, 0.3, 0.7, 0.85].map((v, i) => Math.min(1, v + Math.sin((tick + i) / 2) * 0.15));
  const rFsr = insoleR.packet
    ? toFsr(insoleR.packet.avg)
    : [0.45, 0.5, 0.32, 0.65, 0.82].map((v, i) => Math.min(1, v + Math.cos((tick + i) / 2) * 0.15));
  // 착지 히트맵 색상 — 실제 인솔일 때만 평균 압력 랭킹(빨강/주황/초록)으로 표시.
  const lLevels = insoleL.packet ? heatLevels(insoleL.packet.avg) : undefined;
  const rLevels = insoleR.packet ? heatLevels(insoleR.packet.avg) : undefined;

  return (
    <DarkShell recording>
      <View className="px-[18px] pt-[2px] flex-row justify-between items-center">
        <View>
          <Text className="text-[10px] text-t3 tracking-[0.8px] uppercase font-semibold">
            폼 점수
          </Text>
          <Text className="text-[14px] font-semibold text-white">평균 82 · 최고 89</Text>
        </View>
        <View
          className="px-[10px] py-1 rounded-full"
          style={{
            backgroundColor: 'rgba(110,231,183,0.18)',
            borderWidth: 0.5,
            borderColor: 'rgba(110,231,183,0.4)',
          }}
        >
          <Text className="text-[11px] font-semibold text-good">안정적</Text>
        </View>
      </View>

      <View className="items-center mt-[10px]">
        <FormGauge score={form} />
      </View>

      {/* Top trio */}
      <View className="px-4 pt-[10px] flex-row gap-2">
        <MetricCard value={fmtPace(paceSpk)} label="페이스" />
        <MetricCard value={distKm.toFixed(2)} unit="km" label="거리" />
        <MetricCard value={String(hr)} unit="bpm" label="심박" accent={zone.color} />
      </View>

      {/* Foot pressure */}
      <View className="px-4 pt-3">
        <RSCard style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
          <View className="flex-row justify-between items-center mb-[10px]">
            <Text className="text-[11px] text-t3 tracking-[0.66px] uppercase font-semibold">
              발 압력 · 실시간
            </Text>
            <Text className="text-[11px] text-purple-200">균형 49 / 51</Text>
          </View>
          <View className="flex-row justify-center gap-[36px]">
            <FootPressure side="L" fsr={lFsr} levels={lLevels} />
            <FootPressure side="R" fsr={rFsr} levels={rLevels} />
          </View>
        </RSCard>
      </View>

      {/* Cadence + stride */}
      <View className="px-4 pt-[10px] flex-row gap-2">
        <RSCard style={{ flex: 1, padding: 12 }}>
          <Text className="text-[10px] text-t3 tracking-[0.66px] uppercase font-semibold">
            케이던스
          </Text>
          <View className="flex-row items-baseline mt-1">
            <Text className="text-[22px] font-semibold text-purple-300">{cad}</Text>
            <Text className="text-[11px] text-t3 ml-[3px]">spm</Text>
          </View>
          <Text className="text-[10px] text-good mt-[2px]">▲ 적정 범위</Text>
        </RSCard>
        <RSCard style={{ flex: 1, padding: 12 }}>
          <Text className="text-[10px] text-t3 tracking-[0.66px] uppercase font-semibold">
            착지 패턴
          </Text>
          <Text className="text-[18px] font-semibold text-white mt-1">중족부</Text>
          <Text className="text-[10px] text-t3 mt-[2px]">72% 미드풋 · 안정</Text>
        </RSCard>
      </View>

      <View className="flex-1" />

      <View className="px-4 pt-[10px]">
        <RSCoach subtitle="폼 분석" message="좌우 균형이 좋아요. 어깨를 살짝 내려보세요." />
      </View>

      <View className="px-4 pt-3 pb-[14px] flex-row gap-[10px]">
        <View className="flex-1">
          <RSButton variant="danger" label="종료" onPress={() => setEndOpen(true)} />
        </View>
        <View style={{ flex: 1.4 }}>
          <RSButton variant="ghost" label={paused ? '▶  재개' : '⏸  일시정지'} onPress={() => setPaused((p) => !p)} />
        </View>
      </View>

      <EndRunModal
        visible={endOpen}
        distKm={distKm}
        sec={sec}
        pace={fmtPace(paceSpk)}
        onCancel={() => setEndOpen(false)}
        onConfirm={() => {
          setEndOpen(false);
          navigation.navigate('Report', {
            run: { distanceKm: distKm, durationSec: sec, paceSpk, avgHeartRate: hr, cadence: cad, formScore: form },
          });
        }}
      />
    </DarkShell>
  );
};

const MetricCard = ({ value, unit, label, accent = '#a78bfa' }: { value: string; unit?: string; label: string; accent?: string }) => (
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

const FormGauge = ({ score }: { score: number }) => {
  const size = 184,
    stroke = 10;
  const r = (size - stroke) / 2;
  const c = Math.PI * r;
  const dash = c * (score / 100);
  return (
    <View style={{ width: size, height: size / 2 + 18, position: 'relative' }}>
      <Svg width={size} height={size / 2 + 18}>
        <Defs>
          <SvgGradient id="formGrad" x1="0" x2="1">
            <Stop offset="0%" stopColor="#3b82f6" />
            <Stop offset="55%" stopColor="#7c3aed" />
            <Stop offset="100%" stopColor="#a78bfa" />
          </SvgGradient>
        </Defs>
        <Path
          d={`M ${stroke / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${size / 2}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <Path
          d={`M ${stroke / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${size / 2}`}
          fill="none"
          stroke="url(#formGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
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
          justifyContent: 'flex-end',
          paddingBottom: 4,
        }}
      >
        <Text numberOfLines={1} className="text-[56px] font-bold text-white leading-[58px] tracking-[-2.24px]">{score}</Text>
        <Text className="text-[10px] text-t3 tracking-[1.6px] uppercase font-semibold mt-[2px]">
          form score
        </Text>
      </View>
    </View>
  );
};

const FOOT_POSITIONS = [
  { x: 30, y: 18 },
  { x: 50, y: 22 },
  { x: 32, y: 60 },
  { x: 50, y: 60 },
  { x: 40, y: 100 },
];

// 아날로그 10bit 기준으로 FSR 평균 압력을 0~1 로 정규화.
const FSR_MAX = 1023;
const toFsr = (avg: number[]): number[] => avg.map((v) => Math.max(0, Math.min(1, v / FSR_MAX)));

// levels(실제 인솔 착지 히트맵 색상)가 있으면 그 색을, 없으면 기존 크기 기반 색을 쓴다.
const FootPressure = ({ side, fsr, levels }: { side: 'L' | 'R'; fsr: number[]; levels?: HeatLevel[] }) => (
  <View className="items-center">
    <Text className="text-[10px] text-t3 mb-[6px] tracking-[0.8px] font-semibold">
      {side === 'L' ? '왼발' : '오른발'}
    </Text>
    <Svg width={80} height={130} viewBox="0 0 80 130">
      <Path
        d="M40 8 C56 8 64 22 64 40 C64 52 60 60 58 70 C58 80 60 92 58 104 C56 116 50 122 40 122 C30 122 24 116 22 104 C20 92 22 80 22 70 C20 60 16 52 16 40 C16 22 24 8 40 8 Z"
        fill="rgba(167,139,250,0.06)"
        stroke="rgba(167,139,250,0.25)"
        strokeWidth={0.8}
      />
      {fsr.map((v, i) => {
        const p = FOOT_POSITIONS[i];
        const radius = 6 + v * 7;
        const color = levels
          ? HEAT_COLORS[levels[i]]
          : v > 0.7
            ? '#ef4444'
            : v > 0.45
              ? '#fbbf24'
              : '#a78bfa';
        return (
          <G key={i}>
            <Circle cx={p.x} cy={p.y} r={radius + 4} fill={color} opacity={0.18} />
            <Circle cx={p.x} cy={p.y} r={radius} fill={color} opacity={0.85} />
          </G>
        );
      })}
    </Svg>
  </View>
);
