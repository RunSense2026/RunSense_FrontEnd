import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Polyline, Rect, Stop } from 'react-native-svg';

import { createLthrRecord } from '@/api';
import { createLthrCoaching } from '@/api/ai';
import { DarkNavHeader, DarkShell, RSButton } from '@/components/domain';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { MEASURE_START_SECONDS, TEST_SECONDS, fmtClock } from '@/utils/lthr';
import { numberToField } from '@/utils/profile';

import type { LthrRecordResponseDto } from '@/types/api';
import type { ScreenProps } from '@/types/navigation';

const ZONE_COLORS: Record<string, string> = {
  Z1: '#93c5fd',
  Z2: '#6ee7b7',
  Z3: '#a78bfa',
  Z4: '#fbbf24',
  Z5: '#f87171',
};

type SaveStatus = 'saving' | 'saved' | 'failed' | 'guest';

const SAVE_LABELS: Record<SaveStatus, string> = {
  saving: '저장 중…',
  saved: '✓ 자동 적용됨',
  failed: '저장 실패 · 다시 시도',
  guest: '로그인하면 저장돼요',
};

/** ISO → 'YYYY.MM.DD' */
const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

export const LTHRReportScreen = ({ route, navigation }: ScreenProps<'LTHRReport'>) => {
  const {
    result,
    coachingAnalysis: initialCoaching,
    samples,
    restingHeartRate,
    testSeconds,
    finishedAt,
    simulated,
  } = route.params;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setProfile = useProfileStore((s) => s.setProfile);
  const [coaching, setCoaching] = useState<string | undefined>(initialCoaching);
  const [isLoadingCoaching, setIsLoadingCoaching] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(isAuthenticated ? 'saving' : 'guest');
  const [record, setRecord] = useState<LthrRecordResponseDto | null>(null);

  useEffect(() => {
    if (!coaching) {
      let isMounted = true;
      setIsLoadingCoaching(true);
      createLthrCoaching(result)
        .then((res) => {
          if (isMounted && res.analysis) {
            setCoaching(res.analysis);
          }
        })
        .catch(() => {
          // 코칭 문장이 없으면 안내 문구만 보여준다.
        })
        .finally(() => {
          if (isMounted) setIsLoadingCoaching(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [coaching, result]);

  // 결과 화면에 들어오면 바로 기록을 저장한다 — POST /api/lthr.
  // 서버가 기록을 쌓으면서 프로필의 LTHR·안정시 심박수도 갱신하므로, 성공하면 기기 캐시(→ 심박존·워치)도 맞춘다.
  const save = useCallback(() => {
    setSaveStatus('saving');
    createLthrRecord({
      lthr: Math.round(result.lthr),
      restingHeartRate,
      maxHeartRate: Math.round(result.maxHeartRate),
      averageHeartRate: result.averageHeartRate,
    })
      .then((saved) => {
        setRecord(saved);
        setSaveStatus('saved');
        setProfile({
          lthr: String(saved.lthr),
          restingHr: numberToField(saved.restingHeartRate),
        });
      })
      .catch(() => setSaveStatus('failed'));
  }, [result, restingHeartRate, setProfile]);

  const savedOnceRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || savedOnceRef.current) return;
    savedOnceRef.current = true;
    save();
  }, [isAuthenticated, save]);

  const lthr = Math.round(result.lthr);
  // 직전 측정 대비 증감은 서버 기록(마지막 테스트 기준)을 따르고, 저장 전에는 분석 결과(프로필 LTHR 기준)를 보여준다.
  const prevLthr = record ? record.previousLthr : result.previousLthr;
  const lthrDiff = record ? record.lthrDifference : result.lthrDifference;
  const maxHr = Math.round(result.maxHeartRate);
  const avgHr = Math.round(result.averageHeartRate);

  const zones = useMemo(
    () =>
      result.zones.map((z, idx) => {
        let rangeText = '';
        if (z.minBpm != null && z.maxBpm != null) {
          rangeText = `${z.minBpm}–${z.maxBpm}`;
        } else if (z.minBpm != null) {
          rangeText = `≥ ${z.minBpm}`;
        } else if (z.maxBpm != null) {
          rangeText = `≤ ${z.maxBpm}`;
        }
        return {
          id: idx + 1,
          label: `${z.zone} ${z.name}`,
          range: rangeText,
          c: ZONE_COLORS[z.zone] ?? '#a78bfa',
          pct: Math.round(z.percentage),
        };
      }),
    [result],
  );

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
        <DarkNavHeader
          title="LTHR 테스트 결과"
          sub={`${fmtDate(finishedAt)} · ${fmtClock(testSeconds)}`}
          onBack={() => navigation.goBack()}
        />

        {simulated && (
          <View
            className="rounded-[12px] px-3 py-[9px] mb-3"
            style={{
              backgroundColor: 'rgba(251,191,36,0.1)',
              borderWidth: 0.5,
              borderColor: 'rgba(251,191,36,0.3)',
            }}
          >
            <Text className="text-[11px] font-semibold leading-4" style={{ color: '#fde68a' }}>
              워치 심박이 들어오지 않은 구간은 시뮬레이션 값으로 측정했어요. 정확한 LTHR을 위해 워치를 연결하고 다시 측정하세요.
            </Text>
          </View>
        )}

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
            <Text numberOfLines={1} className="text-[72px] font-bold text-white tracking-[-3.6px] leading-[74px]">{lthr}</Text>
            <Text className="text-[14px] font-bold" style={{ color: '#fde68a' }}>bpm</Text>
          </View>
          <Text className="text-[11px] font-semibold mt-2" style={{ color: 'rgba(253,230,138,0.7)' }}>후반 20분 평균 심박수</Text>

          {/* Delta */}
          {lthrDiff != null && prevLthr != null ? (
            <View
              className="mt-3 flex-row items-center gap-[6px] px-[11px] py-1 rounded-full"
              style={{
                backgroundColor: lthrDiff >= 0 ? 'rgba(110,231,183,0.16)' : 'rgba(239,68,68,0.16)',
                borderWidth: 0.5,
                borderColor: lthrDiff >= 0 ? 'rgba(110,231,183,0.34)' : 'rgba(239,68,68,0.34)',
              }}
            >
              <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                <Polyline
                  points={lthrDiff >= 0 ? '6 15 12 9 18 15' : '6 9 12 15 18 9'}
                  stroke={lthrDiff >= 0 ? '#6ee7b7' : '#ef4444'}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text className={`text-[11px] font-bold ${lthrDiff >= 0 ? 'text-good' : 'text-bad-2'}`}>
                {lthrDiff > 0 ? `+ ${lthrDiff} bpm` : lthrDiff < 0 ? `- ${Math.abs(lthrDiff)} bpm` : '변화 없음'}
              </Text>
              <Text className="text-[10px] font-semibold" style={{ color: lthrDiff >= 0 ? 'rgba(110,231,183,0.65)' : 'rgba(239,68,68,0.65)' }}>
                vs 지난 측정 ({prevLthr})
              </Text>
            </View>
          ) : (
            <View
              className="mt-3 flex-row items-center gap-[6px] px-[11px] py-1 rounded-full"
              style={{
                backgroundColor: 'rgba(167,139,250,0.16)',
                borderWidth: 0.5,
                borderColor: 'rgba(167,139,250,0.34)',
              }}
            >
              <Text className="text-[11px] text-purple-200 font-bold">첫 측정 완료</Text>
              <Text className="text-[10px] font-semibold" style={{ color: 'rgba(221,214,254,0.7)' }}>
                기준 LTHR 설정됨
              </Text>
            </View>
          )}
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
          <Text className="text-[11px] mt-[2px] font-medium" style={{ color: 'rgba(221,214,254,0.6)' }}>
            {fmtClock(testSeconds)} · 30초 평균 · 음영은 측정 구간
          </Text>
          <View className="mt-[10px]">
            <HRLineChart samples={samples} lthr={lthr} />
          </View>
        </View>

        {/* Stats grid */}
        <View className="flex-row gap-2 mb-3">
          <ReportStat label="안정 심박" value={numberToField(restingHeartRate) || '--'} unit="bpm" color="#93c5fd" />
          <ReportStat label="최고 심박" value={String(maxHr)} unit="bpm" color="#f87171" />
          <ReportStat label="평균 심박" value={String(avgHr)} unit="bpm" color="#a78bfa" />
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
            <Pressable onPress={save} disabled={saveStatus !== 'failed'} hitSlop={8}>
              <Text
                className="text-[10px] font-bold"
                style={{
                  color:
                    saveStatus === 'saved'
                      ? '#6ee7b7'
                      : saveStatus === 'failed'
                        ? '#fca5a5'
                        : 'rgba(221,214,254,0.6)',
                }}
              >
                {SAVE_LABELS[saveStatus]}
              </Text>
            </Pressable>
          </View>

          {zones.some((z) => z.pct > 0) && (
            <View className="flex-row h-[10px] rounded-full overflow-hidden mb-3">
              {zones.map((z) => (
                <View key={z.id} style={{ flex: z.pct, backgroundColor: z.c, opacity: 0.85 }} />
              ))}
            </View>
          )}

          {zones.map((z, i) => (
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
              {coaching ??
                (isLoadingCoaching
                  ? 'AI 코치가 LTHR 테스트 결과를 분석하고 있습니다...'
                  : 'AI 코치 분석을 불러오지 못했어요. 새 트레이닝 존은 그대로 적용됩니다.')}
            </Text>
          </View>
        </LinearGradient>

        {/* Actions */}
        <View className="flex-row gap-2">
          <View className="flex-1">
            <RSButton variant="ghost" label="다시 측정" onPress={() => navigation.replace('LTHRTest')} />
          </View>
          <View className="flex-1">
            <RSButton variant="primary" label="완료" onPress={() => navigation.navigate('Main')} />
          </View>
        </View>
      </ScrollView>
    </DarkShell>
  );
};

interface HRLineChartProps {
  samples: number[];
  lthr: number;
}

const HRLineChart = ({ samples, lthr }: HRLineChartProps) => {
  const W = 320,
    H = 120,
    P = 6;
  if (samples.length < 2) {
    return (
      <View style={{ height: H }} className="items-center justify-center">
        <Text className="text-[11px] font-medium" style={{ color: 'rgba(221,214,254,0.5)' }}>
          심박 샘플이 부족해요
        </Text>
      </View>
    );
  }
  // 세로 범위는 실제 샘플과 LTHR 이 모두 들어오도록 잡는다.
  const minHR = Math.floor(Math.min(...samples, lthr) / 10) * 10 - 5;
  const maxHR = Math.ceil(Math.max(...samples, lthr) / 10) * 10 + 5;
  const xStep = (W - P * 2) / (samples.length - 1);
  const y = (v: number) => H - P - ((v - minHR) / (maxHR - minHR)) * (H - P * 2);
  const pts = samples.map((v, i) => [P + i * xStep, y(v)] as const);
  const path = pts.map(([x, yy], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${yy.toFixed(1)}`).join(' ');
  const area = `${path} L${W - P} ${H - P} L${P} ${H - P} Z`;
  const lthrY = y(lthr);
  // 측정 구간(후반 20분) 음영 — 30분 테스트 기준 위치
  const measureX = P + (W - P * 2) * (MEASURE_START_SECONDS / TEST_SECONDS);
  const grid = [120, 140, 160, 180].filter((g) => g > minHR && g < maxHR);

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
      <Defs>
        <SvgGradient id="lthr-rep-fill" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0%" stopColor="#a78bfa" stopOpacity={0.42} />
          <Stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
        </SvgGradient>
      </Defs>
      {grid.map((g) => (
        <Line key={g} x1={P} y1={y(g)} x2={W - P} y2={y(g)} stroke="rgba(167,139,250,0.1)" strokeWidth={0.5} />
      ))}
      <Rect x={measureX} y={P} width={W - P - measureX} height={H - P * 2} fill="rgba(167,139,250,0.06)" />
      <Line x1={P} y1={lthrY} x2={W - P} y2={lthrY} stroke="#fbbf24" strokeWidth={1} strokeDasharray="3 3" />
      <Path d={area} fill="url(#lthr-rep-fill)" />
      <Path d={path} fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={4} fill="#fff" stroke="#a78bfa" strokeWidth={2} />
    </Svg>
  );
};

interface ReportStatProps {
  label: string;
  value: string;
  unit: string;
  color: string;
}

const ReportStat = ({ label, value, unit, color }: ReportStatProps) => (
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
