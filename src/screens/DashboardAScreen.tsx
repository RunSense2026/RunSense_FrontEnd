import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { DarkShell, RSCard, RSCoach, RSSparkline, RSButton, EndRunModal, FootPressure, RSVoicePlayer } from '@/components/domain';
import { resolveVoiceUrl } from '@/api';
import { fmtPace, fmtTime, hrZone, spkToMinutes } from '@/utils/format';
import { useTicker } from '@/hooks/useTicker';
import { useRunSession } from '@/hooks/useRunSession';
import { useLiveCoaching } from '@/hooks/useLiveCoaching';
import { useFootPressure } from '@/hooks/useFootPressure';

import type { ScreenProps } from '@/types/navigation';

// ═════════════════════════════════════════════════════════════
// VARIATION A — "Pace Hero" — pace dominates as a glowing ring
// ═════════════════════════════════════════════════════════════
export const DashboardAScreen = ({ navigation, route }: ScreenProps<'DashboardA'>) => {
  const [paused, setPaused] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  // 가로 스와이프 페이저 — 0: 페이스, 1: 평균 페이스·발 압력.
  const { width } = useWindowDimensions();
  const [pagerH, setPagerH] = useState(0);
  const [page, setPage] = useState(0);
  const onPageScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  // 거리 모드에서 정한 목표 페이스(초/km). 없으면 기본 330("5'30")을 쓴다.
  const target = route.params?.targetPaceSpk ?? 330;

  // 시작 시점(0초·0km)부터 실시간 누적되는 경과 시간·거리.
  const { tick, sec, distKm, paceSpk } = useRunSession(paused);
  const hr = 156 + Math.round(Math.sin(tick / 4) * 3);
  const animatedPace = useTicker(paceSpk, 0.08);
  const cad = 178 + Math.round(Math.sin(tick / 3) * 2);
  const zone = hrZone(hr, 164);

  // 실시간 발 압력 분포(2페이지) — 인솔 연결 시 실데이터·미연결 시 시뮬레이션.
  const foot = useFootPressure(tick);

  // 러닝 중 1분 간격으로 AI 코칭 생성 → 최신 코칭을 코치 카드에 표시.
  const liveCoaching = useLiveCoaching(paused, () => ({
    pace: spkToMinutes(paceSpk),
    heartRate: hr,
    cadence: cad,
  }));

  // 코칭 음성 파일 경로 → 재생 가능한 절대 URL (없으면 null).
  const coachVoiceUrl = resolveVoiceUrl(liveCoaching?.voiceFile);

  const deviation = Math.max(-30, Math.min(30, paceSpk - target));
  const ringPct = 0.5 + -deviation / 60;

  return (
    <DarkShell>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onPageScrollEnd}
        onLayout={(e) => setPagerH(e.nativeEvent.layout.height)}
        style={{ flex: 1, marginTop: 28 }}
      >
        {/* ── 페이지 1 — 페이스 ── */}
        <View style={{ width, height: pagerH || undefined }}>
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
            <RSCoach
              subtitle={liveCoaching?.focusPoint ?? '실시간 분석'}
              message={liveCoaching?.feedbackText ?? '페이스가 안정적이에요. 이 리듬으로 1km만 더 가볼까요?'}
            />
            {/* 코칭 생성 시마다 음성을 자동 재생 (uri 변경 → autoPlay) */}
            {coachVoiceUrl && <RSVoicePlayer uri={coachVoiceUrl} autoPlay />}
          </View>

          {/* Micro row */}
          <View className="px-4 pt-[10px] flex-row gap-[6px]">
            <MicroStat label="케이던스" value={String(cad)} unit="spm" />
            <MicroStat label="좌·우 균형" value={foot.balance} />
            <MicroStat label="보폭" value="1.12" unit="m" />
          </View>

          <View className="flex-1" />
        </View>

        {/* ── 페이지 2 — 평균 페이스 · 발 압력 ── */}
        <View style={{ width, height: pagerH || undefined }}>
          <View className="px-[18px] pt-1 flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-purple-300" />
            <Text className="text-[12px] text-t2 font-medium">러닝 요약 · 실시간</Text>
          </View>

          {/* 평균 페이스 링 */}
          <View className="items-center mt-[14px]">
            <PaceRing pct={ringPct} pace={animatedPace} label="평균 페이스" />
          </View>

          {/* 거리 · 시간 · 심박수 */}
          <View className="px-4 pt-4 flex-row gap-2">
            <MetricCard value={distKm.toFixed(2)} unit="km" label="거리" />
            <MetricCard value={fmtTime(sec)} label="시간" />
            <MetricCard value={String(hr)} unit="bpm" label="심박수" accent={zone.color} />
          </View>

          {/* 발 압력 분포 */}
          <View className="px-4 pt-3">
            <RSCard style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
              <View className="flex-row justify-between items-center mb-[10px]">
                <Text className="text-[11px] text-t3 tracking-[0.66px] uppercase font-semibold">
                  발 압력 · 실시간
                </Text>
                <Text className="text-[11px] text-purple-200">
                  {foot.connected ? `균형 ${foot.balance}` : '시뮬레이션'}
                </Text>
              </View>
              <View className="flex-row justify-center gap-[36px]">
                <FootPressure side="L" fsr={foot.lFsr} />
                <FootPressure side="R" fsr={foot.rFsr} />
              </View>
            </RSCard>
          </View>

          <View className="flex-1" />
        </View>
      </ScrollView>

      {/* 페이지 인디케이터 */}
      <PageDots count={2} active={page} />

      {/* Actions (두 페이지 공유) */}
      <View className="px-4 pb-[14px] flex-row gap-[10px]">
        <View className="flex-1">
          <RSButton variant="danger" label="종료" onPress={() => setEndOpen(true)} />
        </View>
        <View style={{ flex: 1.4 }}>
          <RSButton variant="ghost" label={paused ? '재개' : '일시정지'} onPress={() => setPaused((p) => !p)} />
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
            run: { distanceKm: distKm, durationSec: sec, paceSpk, avgHeartRate: hr, cadence: cad },
          });
        }}
      />
    </DarkShell>
  );
};

const PaceRing = ({ pct, pace, label = '현재 페이스' }: { pct: number; pace: number; label?: string }) => {
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
          {label}
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

// 가로 페이저 위치 표시 점 — 활성 점은 길쭉하게 강조.
const PageDots = ({ count, active }: { count: number; active: number }) => (
  <View className="flex-row justify-center items-center gap-[6px] pt-[4px] pb-[14px]">
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={{
          width: i === active ? 18 : 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: i === active ? '#a78bfa' : 'rgba(255,255,255,0.22)',
        }}
      />
    ))}
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
