import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { isAxiosError } from 'axios';
import Svg, { Path, Circle, Ellipse, Line, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { LightShell, RSTabBar, type TabId } from '@/components/domain';
import { saveRun, readRun } from '@/api';
import { useAuthStore } from '@/stores/authStore';
import type {
  RunningActivityCreateRequestDto,
  RunningActivityDetailResponseDto,
  FootSensorDataResponseDto,
  AiCoachingResponseDto,
} from '@/types/api';

import { handleRootTabPress } from '@/navigation/tabRoutes';
import type { ScreenProps } from '@/types/navigation';

type SaveState = 'idle' | 'saving' | 'saved';

// "5'29" / "5'29\"" → 초 단위 (페이스 막대 높이 계산용)
const paceToSeconds = (pace: string): number => {
  const m = pace.match(/(\d+)'\s*(\d+)/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
};

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// "2026-05-23T19:12:37" → "5월 23일 (목) · 오전 7:14"
const formatHeaderDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const h = d.getHours();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${KO_WEEKDAYS[d.getDay()]}) · ${ampm} ${h12}:${mm}`;
};

export const ReportScreen = ({ navigation, route }: ScreenProps<'Report'>) => {
  const handleTabPress = (id: TabId) => handleRootTabPress(navigation, id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // History 등에서 activityId 로 들어오면 해당 기록을 상세 조회한다.
  const activityId = route.params?.activityId;
  const [detail, setDetail] = useState<RunningActivityDetailResponseDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (activityId == null) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    readRun(activityId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (cancelled) return;
        setDetailError(
          isAxiosError(e)
            ? e.response?.data?.message ?? '러닝 기록을 불러오지 못했어요.'
            : '러닝 기록을 불러오는 중 오류가 발생했어요.',
        );
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  // 상세 데이터가 있으면 그 값으로, 없으면(갓 뛴 리포트) 목업으로 표시한다.
  const summary = detail
    ? { distance: detail.distance.toFixed(2), time: detail.time.replace(/^00:/, ''), pace: detail.pace }
    : { distance: '5.24', time: '28:42', pace: `5'29"` };

  const splits = detail
    ? detail.lapSplits
        .slice()
        .sort((a, b) => a.lapNumber - b.lapNumber)
        .map((s) => ({ km: Number(s.lapNumber), pace: paceToSeconds(s.lapPace), label: s.lapPace }))
    : SPLITS;

  const isViewingSaved = activityId != null;

  const handleSave = async () => {
    if (saveState !== 'idle') return;
    if (!isAuthenticated) {
      Alert.alert('로그인이 필요해요', '러닝 기록을 저장하려면 먼저 로그인해주세요.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    setSaveState('saving');
    try {
      const result = await saveRun(buildRunPayload());
      setSaveState('saved');
      Alert.alert('저장 완료', `러닝 기록이 저장되었어요. (#${result.activityId})`);
    } catch (e) {
      setSaveState('idle');
      const message = isAxiosError(e)
        ? e.response?.data?.message ?? '러닝 기록 저장에 실패했어요.'
        : '저장 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.';
      Alert.alert('저장 실패', message);
    }
  };

  return (
    <LightShell>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 16 }}>
        {/* Header */}
        <View className="flex-row justify-between items-center py-2">
          <View>
            <Text className="text-[11px] font-semibold tracking-[0.66px] uppercase" style={{ color: '#7c6bb5' }}>
              {detail ? formatHeaderDate(detail.activityDate) : '5월 3일 (일) · 오전 7:14'}
            </Text>
            <Text className="text-[22px] font-bold mt-1 tracking-[-0.66px]" style={{ color: '#1e1b4b' }}>
              러닝 리포트
            </Text>
          </View>
          <View className="flex-row gap-2">
            {/* 저장(생성) 버튼은 갓 뛴 리포트(activityId 없음)에서만 노출 */}
            {!isViewingSaved && (
              <IconBtn onPress={handleSave} disabled={saveState !== 'idle'}>
                {saveState === 'saving' ? (
                  <ActivityIndicator size="small" color="#7c3aed" />
                ) : saveState === 'saved' ? (
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                ) : (
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 2v13M5 9l7-7 7 7M19 16v3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
              </IconBtn>
            )}
            <IconBtn>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Circle cx={12} cy={12} r={3} stroke="#7c3aed" strokeWidth={2} />
                <Circle cx={6} cy={6} r={2} stroke="#7c3aed" strokeWidth={2} />
                <Circle cx={18} cy={18} r={2} stroke="#7c3aed" strokeWidth={2} />
                <Path d="M9 12l9-5M9 13l9 4" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </IconBtn>
          </View>
        </View>

        {/* 상세 조회 로딩/에러 */}
        {detailLoading && (
          <View className="py-3 flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#7c3aed" />
            <Text className="text-[12px] font-medium" style={{ color: '#7c6bb5' }}>기록을 불러오는 중…</Text>
          </View>
        )}
        {detailError && (
          <Text className="text-[12px] font-medium py-3" style={{ color: '#b45309' }}>{detailError}</Text>
        )}

        {/* Achievement banner — 갓 뛴 리포트에서만 */}
        {!isViewingSaved && (
          <LinearGradient
            colors={['#7c3aed', '#6d28d9', '#3b82f6']}
            locations={[0, 0.4, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: 12,
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View
              className="w-10 h-10 rounded-[12px] items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
            >
              <Text className="text-[22px]">🏆</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold tracking-[0.6px] uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>
                새 기록
              </Text>
              <Text className="text-[14px] text-white font-bold mt-[1px]">5km 최고 페이스 갱신!</Text>
            </View>
          </LinearGradient>
        )}

        {/* Summary cards */}
        <View className="flex-row gap-2 mb-3">
          <SummaryCard label="거리" value={summary.distance} unit="km" tint="#7c3aed" />
          <SummaryCard label="시간" value={summary.time} tint="#6366f1" />
          <SummaryCard label="평균 페이스" value={summary.pace} tint="#3b82f6" />
        </View>

        <ReportCard title="스플릿 페이스" subtitle="km별 구간 페이스">
          <SplitsChart splits={splits} />
        </ReportCard>

        <ReportCard title="착지 히트맵" subtitle="발바닥 압력 분포">
          <FootHeatmap />
        </ReportCard>

        <ReportCard title="프로네이션 분석" subtitle="발의 회내·회외 정도">
          <Pronation footSensorData={detail?.footSensorData} />
        </ReportCard>

        <CoachSummaryCard coachings={detail?.aiCoachings} />

        <View className="flex-row gap-2 mt-3 flex-wrap">
          <ReportMini label="평균 심박" value="154" unit="bpm" trend="Z2 유산소" trendColor="#6ee7b7" />
          <ReportMini label="케이던스" value="178" unit="spm" trend="▲ 적정 범위" trendColor="#10b981" />
          <ReportMini label="고도 변화" value="+24" unit="m" trend="평지 코스" trendColor="#7c3aed" />
          <ReportMini label="칼로리" value="312" unit="kcal" trend="목표 87%" trendColor="#7c3aed" />
        </View>
      </ScrollView>
      <RSTabBar active="log" onChange={handleTabPress} />
    </LightShell>
  );
};

const IconBtn = ({
  children,
  onPress,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    className="w-9 h-9 rounded-[12px] items-center justify-center"
    style={{
      backgroundColor: 'rgba(255,255,255,0.7)',
      borderWidth: 0.5,
      borderColor: 'rgba(124,58,237,0.14)',
    }}
  >
    {children}
  </Pressable>
);

// 리포트 화면에 표시된 값으로 러닝 저장 요청 본문을 구성한다.
// (현재 화면 데이터는 목업이라 표시값과 동일하게 매핑한다 — 실데이터 연동 시 이 함수만 교체)
const buildRunPayload = (): RunningActivityCreateRequestDto => {
  const minPace = Math.min(...SPLITS.map((s) => s.pace));
  const maxPace = Math.max(...SPLITS.map((s) => s.pace));
  const range = maxPace - minPace || 1;
  const paceStatue = (pace: number): string => {
    const t = (pace - minPace) / range;
    if (t < 0.33) return 'Green';
    if (t < 0.66) return 'Yellow';
    return 'Red';
  };

  return {
    distance: 5.24,
    time: '00:28:42',
    pace: "5'29",
    formScore: 84,
    lapSplits: SPLITS.map((s) => ({
      lapNumber: s.km,
      lapPace: s.label.replace(/"/g, ''),
      avgHeartRate: 150 + s.km,
      paceStatue: paceStatue(s.pace),
    })),
    footSensorData: [
      {
        footSide: 'Left',
        pronationType: '약간 과내전',
        heelStrikeRate: 62,
        hitmapJson: JSON.stringify({ heel: 40, midfoot: 35, forefoot: 25 }),
      },
      {
        footSide: 'Right',
        pronationType: '중립',
        heelStrikeRate: 58,
        hitmapJson: JSON.stringify({ heel: 38, midfoot: 36, forefoot: 26 }),
      },
    ],
    aiCoachings: [
      {
        feedbackText: '3km까지 평균 페이스를 일관되게 유지했어요. 호흡 리듬이 좋았어요.',
        focusPoint: '안정적인 페이스 유지',
        recExercise: '현재 페이스 유지 훈련',
      },
      {
        feedbackText: '4km 이후 페이스가 26초 느려졌고 뒤꿈치 착지가 증가했어요.',
        focusPoint: '후반 피로 누적',
        recExercise: '지구력 인터벌 훈련',
      },
      {
        feedbackText: '왼발 약간 과내전. 발목 강화 운동을 추천드려요.',
        focusPoint: '왼발 프로네이션 주의',
        recExercise: '카프 레이즈',
      },
    ],
  };
};

const SummaryCard = ({ label, value, unit, tint }: { label: string; value: string; unit?: string; tint: string }) => (
  <View
    className="flex-1 rounded-[16px] px-2 py-3 overflow-hidden"
    style={{
      backgroundColor: 'rgba(255,255,255,0.78)',
      borderWidth: 0.5,
      borderColor: 'rgba(124,58,237,0.14)',
    }}
  >
    <View className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: tint }} />
    <Text
      className="text-[9px] font-bold tracking-[0.72px] uppercase text-center"
      style={{ color: '#9b8cc5' }}
    >
      {label}
    </Text>
    <View className="flex-row items-baseline justify-center mt-[6px]">
      <Text className="text-[22px] font-bold tracking-[-0.66px] leading-[28px]" style={{ color: tint }}>{value}</Text>
      {unit && <Text className="text-[11px] font-medium ml-[2px]" style={{ color: '#9b8cc5' }}>{unit}</Text>}
    </View>
  </View>
);

const ReportCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <View
    className="rounded-[18px] p-[14px] mb-[10px]"
    style={{
      backgroundColor: 'rgba(255,255,255,0.78)',
      borderWidth: 0.5,
      borderColor: 'rgba(124,58,237,0.12)',
    }}
  >
    <View className="mb-3">
      <Text className="text-[14px] font-bold" style={{ color: '#1e1b4b' }}>{title}</Text>
      {subtitle && <Text className="text-[10px] font-medium mt-[2px]" style={{ color: '#9b8cc5' }}>{subtitle}</Text>}
    </View>
    {children}
  </View>
);

interface Split {
  km: number;
  pace: number; // 초 단위 (막대 높이용)
  label: string;
}

const SPLITS: Split[] = [
  { km: 1, pace: 322, label: "5'22\"" },
  { km: 2, pace: 318, label: "5'18\"" },
  { km: 3, pace: 326, label: "5'26\"" },
  { km: 4, pace: 348, label: "5'48\"" },
  { km: 5, pace: 364, label: "6'04\"" },
];

const SplitsChart = ({ splits }: { splits: Split[] }) => {
  if (splits.length === 0) {
    return (
      <View className="py-6 items-center">
        <Text className="text-[12px] font-medium" style={{ color: '#9b8cc5' }}>구간 기록이 없어요.</Text>
      </View>
    );
  }
  const minPace = Math.min(...splits.map((s) => s.pace));
  const maxPace = Math.max(...splits.map((s) => s.pace));
  const range = maxPace - minPace || 1;
  const maxBar = 100;

  const colorFor = (pace: number): [string, string] => {
    const t = (pace - minPace) / range;
    if (t < 0.33) return ['#10b981', '#34d399'];
    if (t < 0.66) return ['#f59e0b', '#fbbf24'];
    return ['#dc2626', '#ef4444'];
  };

  return (
    <View>
      <View className="flex-row items-end gap-[6px]" style={{ height: maxBar + 24 }}>
        {splits.map((s) => {
          const h = 12 + ((s.pace - minPace) / range) * (maxBar - 12);
          const [c1, c2] = colorFor(s.pace);
          return (
            <View key={s.km} className="flex-1 items-center gap-1">
              <Text className="text-[10px] font-bold" style={{ color: c1 }}>{s.label}</Text>
              <LinearGradient
                colors={[c2, c1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ width: '100%', height: h, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}
              />
              <Text className="text-[10px] font-semibold" style={{ color: '#6b5ca5' }}>{s.km}km</Text>
            </View>
          );
        })}
      </View>
      <View
        className="flex-row justify-center gap-3 mt-[10px] pt-[10px]"
        style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(124,58,237,0.08)' }}
      >
        <LegendDot color="#10b981" label="빠름" />
        <LegendDot color="#fbbf24" label="평균" />
        <LegendDot color="#ef4444" label="느림" />
      </View>
    </View>
  );
};

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <View className="flex-row items-center gap-[5px]">
    <View className="w-2 h-2 rounded" style={{ backgroundColor: color }} />
    <Text className="text-[10px] font-semibold" style={{ color: '#6b5ca5' }}>{label}</Text>
  </View>
);

const FootHeatmap = () => {
  const left = [
    { x: 48, y: 18, r: 8, level: 'mid' as const },
    { x: 30, y: 40, r: 9, level: 'mid' as const },
    { x: 50, y: 40, r: 11, level: 'high' as const },
    { x: 40, y: 74, r: 9, level: 'low' as const },
    { x: 40, y: 108, r: 12, level: 'mid' as const },
  ];
  const right = [
    { x: 32, y: 18, r: 8, level: 'mid' as const },
    { x: 30, y: 40, r: 11, level: 'high' as const },
    { x: 50, y: 40, r: 9, level: 'mid' as const },
    { x: 40, y: 74, r: 9, level: 'low' as const },
    { x: 40, y: 108, r: 12, level: 'mid' as const },
  ];
  return (
    <View>
      <View className="flex-row justify-center gap-7">
        <FootSvg side="L" dots={left} />
        <FootSvg side="R" dots={right} />
      </View>
      <View
        className="flex-row justify-center gap-[14px] mt-3 pt-[10px]"
        style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(124,58,237,0.08)' }}
      >
        <LegendDot color="#ef4444" label="높음" />
        <LegendDot color="#f59e0b" label="보통" />
          <LegendDot color="#10b981" label="낮음" />
      </View>
    </View>
  );
};

const FOOT_COLORS = { high: '#ef4444', mid: '#f59e0b', low: '#10b981' };

const FootSvg = ({ side, dots }: { side: 'L' | 'R'; dots: { x: number; y: number; r: number; level: 'high' | 'mid' | 'low' }[] }) => (
  <View className="items-center">
    <Text
      className="text-[10px] mb-[6px] tracking-[0.8px] font-bold uppercase"
      style={{ color: '#7c6bb5' }}
    >
      {side === 'L' ? '왼발' : '오른발'}
    </Text>
    <Svg width={80} height={125} viewBox="0 0 80 125">
      <Defs>
        <SvgGradient id={`foot-bg-${side}`} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0%" stopColor="rgba(229, 222, 250, 0.04)" />
          <Stop offset="100%" stopColor="rgba(208, 186, 247, 0.01)" />
        </SvgGradient>
      </Defs>
      <Path
        d="M40 6 C56 6 64 20 64 38 C64 50 60 58 58 68 C58 78 60 90 58 102 C56 114 50 120 40 120 C30 120 24 114 22 102 C20 90 22 78 22 68 C20 58 16 50 16 38 C16 20 24 6 40 6 Z"
        fill={`url(#foot-bg-${side})`}
        stroke="rgba(124,58,237,0.12)"
        strokeWidth={1}
        transform={side === 'R' ? 'translate(80, 0) scale(-1, 1)' : undefined}
      />
      {dots.map((d, i) => (
        <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={FOOT_COLORS[d.level]} opacity={0.9} />
      ))}
    </Svg>
  </View>
);

const isNeutralPronation = (type: string): boolean =>
  /정상|중립|normal|neutral/i.test(type);

const Pronation = ({ footSensorData }: { footSensorData?: FootSensorDataResponseDto[] }) => {
  // 상세 데이터가 있으면 좌/우 센서로, 없으면 목업으로 표시
  if (footSensorData && footSensorData.length > 0) {
    return (
      <View className="flex-row gap-[10px]">
        {footSensorData.map((f) => {
          const good = isNeutralPronation(f.pronationType);
          const isLeft = /left|왼/i.test(f.footSide);
          return (
            <PronationCard
              key={f.sensorDataId}
              side={isLeft ? '왼발' : '오른발'}
              status={f.pronationType}
              tone={good ? 'good' : 'warn'}
              tilt={good ? 0 : isLeft ? -12 : 12}
            />
          );
        })}
      </View>
    );
  }
  return (
    <View className="flex-row gap-[10px]">
      <PronationCard side="왼발" status="약간 과내전" tone="warn" tilt={-12} />
      <PronationCard side="오른발" status="중립" tone="good" tilt={0} />
    </View>
  );
};

const PRONATION_COLORS = {
  good: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.32)', text: '#047857', chip: 'rgba(16,185,129,0.18)' },
  warn: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.32)', text: '#b45309', chip: 'rgba(245,158,11,0.2)' },
};

const PronationCard = ({ side, status, tone, tilt }: { side: string; status: string; tone: 'good' | 'warn'; tilt: number }) => {
  const c = PRONATION_COLORS[tone];
  return (
    <View
      className="flex-1 rounded-[14px] px-[10px] py-3"
      style={{
        backgroundColor: c.bg,
        borderWidth: 0.5,
        borderColor: c.border,
      }}
    >
      <Text
        className="text-[10px] font-bold tracking-[0.6px] uppercase text-center"
        style={{ color: '#9b8cc5' }}
      >
        {side}
      </Text>
      <View className="items-center my-2 h-14">
        <Svg width={52} height={56} viewBox="0 0 52 56" style={{ transform: [{ rotate: `${tilt}deg` }] }}>
          <Path
            d="M20 4h12a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z"
            fill="rgba(124,58,237,0.18)"
          />
          <Circle cx={26} cy={32} r={4} fill={c.text} opacity={0.6} />
          <Ellipse cx={30} cy={46} rx={14} ry={6} fill={c.text} opacity={0.85} />
          <Line x1={0} y1={55} x2={52} y2={55} stroke="rgba(124,58,237,0.2)" strokeWidth={1} strokeDasharray="2 2" />
        </Svg>
      </View>
      <View className="rounded-full px-[10px] py-[5px]" style={{ backgroundColor: c.chip }}>
        <Text className="text-[12px] font-bold text-center" style={{ color: c.text }}>{status}</Text>
      </View>
    </View>
  );
};

const CoachSummaryCard = ({ coachings }: { coachings?: AiCoachingResponseDto[] }) => (
  <LinearGradient
    colors={['#7c3aed', '#6d28d9', '#3b82f6']}
    locations={[0, 0.5, 1]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={{ borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, marginTop: 4 }}
  >
    <View className="flex-row items-center gap-[10px] mb-[10px]">
      <View
        className="w-9 h-9 rounded-[12px] items-center justify-center"
        style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={6} fill="#fff" />
          <Circle cx={10} cy={11} r={1.2} fill="#7c3aed" />
          <Circle cx={14} cy={11} r={1.2} fill="#7c3aed" />
        </Svg>
      </View>
      <View>
        <Text className="text-[10px] font-bold tracking-[0.8px] uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>
          AI 코치 요약
        </Text>
        <Text className="text-[14px] text-white font-bold mt-[1px]">오늘의 분석</Text>
      </View>
    </View>

    <View className="gap-2">
      {coachings && coachings.length > 0 ? (
        coachings.map((c, i) => (
          <CoachBullet
            key={c.coachingId}
            tone={COACH_TONES[i % COACH_TONES.length]}
            title={c.focusPoint}
            body={c.recExercise ? `${c.feedbackText} (추천: ${c.recExercise})` : c.feedbackText}
          />
        ))
      ) : (
        <>
          <CoachBullet tone="good" title="안정적인 페이스 유지" body={`3km까지 평균 페이스 5'22"을 일관되게 유지했어요. 호흡 리듬이 좋았어요.`} />
          <CoachBullet tone="warn" title="후반 피로 누적" body="4km 이후 페이스가 26초 느려졌고 뒤꿈치 착지가 증가했어요." />
          <CoachBullet tone="info" title="왼발 프로네이션 주의" body="왼발 약간 과내전. 발목 강화 운동(카프 레이즈)을 추천드려요." />
        </>
      )}
    </View>
  </LinearGradient>
);

const COACH_TONES = ['good', 'warn', 'info'] as const;

const COACH_DOTS = { good: '#6ee7b7', warn: '#fbbf24', info: '#c4b5fd' };

const CoachBullet = ({ tone, title, body }: { tone: 'good' | 'warn' | 'info'; title: string; body: string }) => (
  <View className="flex-row gap-[10px] items-start">
    <View
      className="w-[18px] h-[18px] rounded-md mt-[1px] items-center justify-center"
      style={{
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderWidth: 0.5,
        borderColor: `${COACH_DOTS[tone]}66`,
      }}
    >
      <View className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: COACH_DOTS[tone] }} />
    </View>
    <View className="flex-1">
      <Text className="text-[12px] text-white font-bold">{title}</Text>
      <Text className="text-[11.5px] mt-[2px] leading-[17px] font-medium" style={{ color: 'rgba(255,255,255,0.78)' }}>{body}</Text>
    </View>
  </View>
);

const ReportMini = ({
  label,
  value,
  unit,
  trend,
  trendColor,
}: {
  label: string;
  value: string;
  unit: string;
  trend: string;
  trendColor: string;
}) => (
  <View
    className="rounded-[14px] px-3 py-[10px]"
    style={{
      width: '48.5%',
      backgroundColor: 'rgba(255,255,255,0.72)',
      borderWidth: 0.5,
      borderColor: 'rgba(124,58,237,0.12)',
    }}
  >
    <Text className="text-[9px] font-bold tracking-[0.72px] uppercase" style={{ color: '#9b8cc5' }}>{label}</Text>
    <View className="flex-row items-baseline mt-1">
      <Text className="text-[18px] font-bold tracking-[-0.36px] leading-[24px]" style={{ color: '#1e1b4b' }}>{value}</Text>
      <Text className="text-[10px] ml-[2px] font-medium" style={{ color: '#9b8cc5' }}>{unit}</Text>
    </View>
    <Text className="text-[10px] mt-1 font-semibold" style={{ color: trendColor }}>{trend}</Text>
  </View>
);
