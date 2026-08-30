import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { DarkShell, RSCard, RSCoach, RSSparkline, RSButton, EndRunModal, FootPressure, RSVoiceAutoPlay } from '@/components/domain';
import { fmtPace, fmtTime, hrZone, spkToMinutes } from '@/utils/format';
import { useRunSession } from '@/hooks/useRunSession';
import { useLiveCoaching } from '@/hooks/useLiveCoaching';
import { useFootPressure } from '@/hooks/useFootPressure';
import { useResolvedLocation } from '@/hooks/useResolvedLocation';
import { useInsoleStore } from '@/stores/insoleStore';
import { useMyLthr } from '@/stores/profileStore';
import { footCoachingPayload } from '@/utils/insoleMetrics';

import type { ScreenProps } from '@/types/navigation';

// 우측 상단 심박 존(역치) 배지 표시 여부 — 코드는 남겨두고 숨김 처리(필요 시 true 로).
const SHOW_HR_ZONE = false;

// ═════════════════════════════════════════════════════════════
// VARIATION A — "Pace Hero" — pace dominates as a glowing ring
// ═════════════════════════════════════════════════════════════
export const DashboardAScreen = ({ navigation, route }: ScreenProps<'DashboardA'>) => {
  const [paused, setPaused] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  // 카드 영역만 가로 스와이프 — 0: 심박·코치·마이크로, 1: 발 압력 분포.
  // (상단 헤더·페이스 링·핵심 지표는 고정, 카드만 좌우로 넘어간다)
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const onPageScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  // 거리 모드에서 정한 목표 페이스(초/km). 없으면 기본 330("5'30")을 쓴다.
  const target = route.params?.targetPaceSpk ?? 330;

  // 시작 시점(0초·0km)부터 실시간 누적되는 경과 시간·거리.
  const { tick, sec, distKm, paceSpk, splits } = useRunSession(paused);
  const hr = 156 + Math.round(Math.sin(tick / 4) * 3);
  const cad = 178 + Math.round(Math.sin(tick / 3) * 2);
  // 심박 존은 마이페이지에 저장된 LTHR 기준(미설정 시 기본값).
  const lthr = useMyLthr();
  const zone = hrZone(hr, lthr);

  // 실시간 발 압력 분포(2페이지) — 인솔 연결 시 실데이터·미연결 시 시뮬레이션.
  const foot = useFootPressure(tick);

  // 현재 위치 지역명(홈·코스 화면과 동일한 GPS→역지오코딩 방식).
  const { name: locationName } = useResolvedLocation();

  // HR 스파크라인 데이터는 tick(1초) 단위로만 바뀌면 충분하다. useMemo 로 참조를
  // 고정해, 페이스 이징 등으로 화면이 자주 리렌더돼도 스파크라인은 다시 안 그린다.
  const hrTrace = useMemo(() => genHrTrace(tick), [tick]);

  // 러닝 중 1분 간격으로 AI 코칭 생성 → 최신 코칭을 코치 카드에 표시.
  // 직전 60초 구간의 양발 압력 평균(0~100 정규화)을 왼발·오른발 모두 실어 보낸다.
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

  const deviation = Math.max(-30, Math.min(30, paceSpk - target));
  const ringPct = 0.5 + -deviation / 60;

  return (
    <DarkShell>
      <View style={{ flex: 1, marginTop: 28 }}>
        {/* ── 고정 상단 — 헤더·페이스 링·핵심 지표 ── */}
        {/* Header */}
        <View className="px-[18px] pt-1 flex-row justify-between items-center">
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded bg-bad" />
            <Text className="text-[12px] text-t2 font-medium">{locationName}</Text>
          </View>
          {/* 심박 존(역치) 배지 — 삭제하지 않고 숨김(SHOW_HR_ZONE 로 토글) */}
          {SHOW_HR_ZONE && (
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
          )}
        </View>

        {/* Pace ring */}
        <View className="items-center mt-[18px]">
          <PaceRing pct={ringPct} pace={paceSpk} />
        </View>

        {/* Primary metrics */}
        <View className="px-4 pt-4 flex-row gap-2">
          <MetricCard value={distKm.toFixed(2)} unit="km" label="거리" />
          <MetricCard value={fmtTime(sec)} label="시간" />
          <MetricCard value={String(hr)} unit="bpm" label="심박수" accent={zone.color} />
        </View>

        {/* ── 카드 슬라이드 영역(카드만 좌우로 넘어감) ── */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onPageScrollEnd}
          style={{ flexGrow: 0, marginTop: 10 }}
        >
          {/* 슬라이드 1 — 최근 5분 심박 · AI 코치 · 케이던스/좌우균형/보폭 */}
          <View style={{ width }}>
            {/* HR sparkline */}
            <View className="px-4">
              <RSCard style={{ padding: 12 }}>
                <View className="flex-row justify-between items-center mb-[6px]">
                  <Text className="text-[11px] text-t3 uppercase tracking-[0.66px] font-semibold">
                    최근 5분 심박
                  </Text>
                  <Text className="text-[11px] text-t3">평균 154 · 최대 162</Text>
                </View>
                <RSSparkline data={hrTrace} width={284} height={36} stroke={zone.color} />
              </RSCard>
            </View>

            {/* AI coach — 코칭 생성 전엔 시작 안내 문구, 생성되면 실제 코칭으로 교체 */}
            <View className="px-4 pt-[10px]">
              <RSCoach
                subtitle={liveCoaching?.focusPoint || undefined}
                message={liveCoaching?.feedbackText ?? '지금부터 러닝을 시작해 봅시다.'}
              />
              {/* 음성은 재생바 없이 자동 재생만 — 새 음성마다 key 로 처음부터 재생 */}
              {coachVoiceUrl && <RSVoiceAutoPlay key={coachVoiceUrl} uri={coachVoiceUrl} />}
            </View>

            {/* Micro row */}
            <View className="px-4 pt-[10px] flex-row gap-[6px]">
              <MicroStat label="케이던스" value={String(cad)} unit="spm" />
              <MicroStat label="좌·우 균형" value={foot.balance} />
              <MicroStat label="보폭" value="1.12" unit="m" />
            </View>
          </View>

          {/* 슬라이드 2 — 발 압력 분포 */}
          <View style={{ width }}>
            <View className="px-4">
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
          </View>
        </ScrollView>

        {/* 페이지 인디케이터 */}
        <PageDots count={2} active={page} />
      </View>

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
            run: { distanceKm: distKm, durationSec: sec, paceSpk, avgHeartRate: hr, cadence: cad, splits, coachings: collectedCoachings },
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
