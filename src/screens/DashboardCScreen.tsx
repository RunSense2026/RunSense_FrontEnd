import { useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { DarkShell, RSCard, RSCoach, RSButton, EndRunModal, FootPressure, RSVoiceAutoPlay } from '@/components/domain';
import { fmtPace, hrZone, spkToMinutes } from '@/utils/format';
import { useRunSession } from '@/hooks/useRunSession';
import { useLiveCoaching } from '@/hooks/useLiveCoaching';
import { useFootPressure } from '@/hooks/useFootPressure';
import { useInsoleStore } from '@/stores/insoleStore';
import { cadenceFromSteps, footCoachingPayload } from '@/utils/insoleMetrics';

import type { ScreenProps } from '@/types/navigation';

// ═════════════════════════════════════════════════════════════
// VARIATION C — "Form Focus" — gait sensors emphasized
// ═════════════════════════════════════════════════════════════
export const DashboardCScreen = ({ navigation }: ScreenProps<'DashboardC'>) => {
  const [paused, setPaused] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  // 시작 시점(0초·0km)부터 실시간 누적되는 경과 시간·거리.
  const { tick, sec, distKm, paceSpk, splits } = useRunSession(paused);
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

  // 실시간 발 압력 분포(연결 시 실데이터·미연결 시 시뮬레이션) + 좌우 균형.
  const { lFsr, rFsr, balance } = useFootPressure(tick);

  // 러닝 중 1분 간격으로 AI 코칭 생성(양발 인솔 데이터 포함) → 코치 카드에 표시.
  // 발 압력은 직전 60초 구간 평균을 footCoachingPayload 가 0~100 정규화해 좌·우 모두 채운다.
  const {
    latest: liveCoaching,
    voiceUrl: coachVoiceUrl,
    all: collectedCoachings,
  } = useLiveCoaching(paused, () => {
    const { L, R } = useInsoleStore.getState().drainFootAverages();
    return {
      pace: spkToMinutes(paceSpk),
      heartRate: hr,
      cadence: cad,
      ...footCoachingPayload(L, R),
    };
  });

  // 착지 패턴 — 인솔 압력 분포에서 앞꿈치/중족/뒤꿈치 중 우세 영역(연결 시), 아니면 목업.
  const landing = (() => {
    const packet = insoleL.packet ?? insoleR.packet;
    if (!packet) return { title: '중족부', sub: '72% 미드풋 · 안정' };
    const a = packet.avg;
    const fore = a[0] ?? 0;
    const mid = (a[1] ?? 0) + (a[2] ?? 0) + (a[3] ?? 0);
    const heel = a[4] ?? 0;
    const total = fore + mid + heel;
    if (total <= 0) return { title: '중족부', sub: '측정 중…' };
    const regions = [
      { title: '뒤꿈치', label: '힐 스트라이크', v: heel },
      { title: '중족부', label: '미드풋', v: mid },
      { title: '앞꿈치', label: '포어풋', v: fore },
    ];
    const top = regions.reduce((m, r) => (r.v > m.v ? r : m));
    return { title: top.title, sub: `${Math.round((top.v / total) * 100)}% ${top.label} · 안정` };
  })();

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
            <Text className="text-[11px] text-purple-200">균형 {balance}</Text>
          </View>
          <View className="flex-row justify-center gap-[36px]">
            <FootPressure side="L" fsr={lFsr} />
            <FootPressure side="R" fsr={rFsr} />
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
          <Text className="text-[18px] font-semibold text-white mt-1">{landing.title}</Text>
          <Text className="text-[10px] text-t3 mt-[2px]">{landing.sub}</Text>
        </RSCard>
      </View>

      <View className="flex-1" />

      <View className="px-4 pt-[10px]">
        <RSCoach
          subtitle={liveCoaching?.focusPoint ?? '폼 분석'}
          message={liveCoaching?.feedbackText ?? '좌우 균형이 좋아요. 어깨를 살짝 내려보세요.'}
        />
        {/* AI 서버가 합성한 TTS 음성 — 재생바 없이 자동 재생만 (새 음성마다 key 로 처음부터) */}
        {coachVoiceUrl && <RSVoiceAutoPlay key={coachVoiceUrl} uri={coachVoiceUrl} />}
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
            run: { distanceKm: distKm, durationSec: sec, paceSpk, avgHeartRate: hr, cadence: cad, formScore: form, splits, coachings: collectedCoachings },
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

