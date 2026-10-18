import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { isAxiosError } from 'axios';
import Svg, { Path, Circle, Ellipse, Line, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { LightShell, RSTabBar, type TabId } from '@/components/domain';
import { FOOT_PATH, footPositions } from '@/components/domain/FootPressure';
import { saveRun, readRun, deleteRun, createCoachingReport } from '@/api';
import { useAuthStore } from '@/stores/authStore';
import type {
  RunningActivityCreateRequestDto,
  RunningActivityDetailResponseDto,
  FootSensorDataResponseDto,
} from '@/types/api';
import type { AiCoachingReportDto } from '@/types/aiApi';

import { fmtPace, fmtTime, secToHms, spkToPace } from '@/utils/format';
import { handleRootTabPress } from '@/navigation/tabRoutes';
import type { ScreenProps, RunSummaryParam } from '@/types/navigation';

type SaveState = 'idle' | 'saving' | 'saved';

// "5'29" / "5'29\"" → 초 단위 (페이스 막대 높이 계산용)
const paceToSeconds = (pace: string): number => {
  const m = pace.match(/(\d+)'\s*(\d+)/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
};

// 갓 뛴 리포트인데 세션 값이 없을 때 쓰는 목업 기본값. (실데이터 연동 시 이 한 곳만 교체)
const MOCK_RUN = {
  distanceKm: 5.24,
  durationSec: 1722, // 28:42
  paceSpk: 329, // ~5'29"
  avgHeartRate: 154,
  cadence: 178,
  formScore: 84,
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
  const [deleting, setDeleting] = useState(false);

  // History 등에서 activityId 로 들어오면 해당 기록을 상세 조회한다.
  const activityId = route.params?.activityId;
  // 러닝 종료 후 진입 시 전달된 실제 세션 값 (저장·코칭 입력에 사용)
  const runSummary = route.params?.run;
  const [detail, setDetail] = useState<RunningActivityDetailResponseDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // AI 코칭 요약 리포트(AI 서버). 실패해도 리포트 본문은 표시된다.
  const [report, setReport] = useState<AiCoachingReportDto | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);

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

  // 저장된 기록을 기록 탭에서 연 직후, 상세가 도착하기 전(렌더링 전) 구간.
  // 이때만 하드코딩 목업 대신 '--' 를 표시하고, 로딩이 끝나면 평소처럼(목업 폴백 포함) 렌더한다.
  const loadingSaved = activityId != null && !detail;

  // 우선순위: 로딩 중 '--' → 저장된 상세 → 갓 뛴 세션 값 → 목업(MOCK_RUN)
  const summary = loadingSaved
    ? { distance: '--', time: '--', pace: '--' }
    : detail
    ? { distance: detail.distance.toFixed(2), time: detail.time.replace(/^00:/, ''), pace: detail.pace }
    : {
        distance: (runSummary?.distanceKm ?? MOCK_RUN.distanceKm).toFixed(2),
        time: fmtTime(runSummary?.durationSec ?? MOCK_RUN.durationSec),
        pace: fmtPace(runSummary?.paceSpk ?? MOCK_RUN.paceSpk),
      };

  // 총 거리(숫자). 1km 이하 러닝은 스플릿 페이스를 제공하지 않는다.
  const distanceKm = detail?.distance ?? runSummary?.distanceKm ?? null;
  const showSplits = distanceKm != null && distanceKm > 1;

  // 스플릿 막대 색상의 기준이 되는 평균 페이스(초/km).
  const avgPaceSec = detail ? paceToSeconds(detail.pace) : runSummary?.paceSpk ?? null;

  // 구간 페이스는 실데이터에서만 가져온다: 저장된 기록은 lapSplits, 갓 뛴 러닝은 세션이 수집한 splits.
  const splits: Split[] = detail
    ? detail.lapSplits
        .slice()
        .sort((a, b) => a.lapNumber - b.lapNumber)
        .map((s) => ({ km: Number(s.lapNumber), pace: paceToSeconds(s.lapPace), label: s.lapPace }))
    : (runSummary?.splits ?? []).map((s) => ({ km: s.km, pace: s.paceSec, label: fmtPace(s.paceSec) }));

  // AI 요약 항목: 갓 뛴 러닝은 AI 서버가 만든 리포트, 저장된 기록은 백엔드가 저장 시 정리해 둔
  // 요약 항목(detail.aiCoachings — focusPoint=제목, feedbackText=설명)을 쓴다.
  // 둘 다 없으면 CoachSummaryCard 내부 목업이 표시된다.
  const coachTitle = report?.summaryTitle;
  const coachItems = report
    ? report.items?.map((it) => ({
        title: it.title,
        body: it.recExercise ? `${it.description} (추천: ${it.recExercise})` : it.description,
      }))
    : detail?.aiCoachings?.map((c) => ({
        title: c.focusPoint,
        body: c.recExercise ? `${c.feedbackText} (추천: ${c.recExercise})` : c.feedbackText,
      }));

  const isViewingSaved = activityId != null;

  // 러닝 종료 후 진입한 리포트(activityId 없음)에서 하드웨어 뒤로가기 → 러닝 중 화면 대신
  // '러닝' 탭(RunSetup)으로 이동한다. (기록 탭에서 본 저장된 리포트는 기본 뒤로가기 유지)
  useFocusEffect(
    useCallback(() => {
      if (isViewingSaved) return;
      const onBack = () => {
        navigation.navigate('RunSetup');
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [isViewingSaved, navigation]),
  );

  // 갓 뛴 리포트: 러닝 중 수집한 코칭들을 그대로 AI 서버에 넘겨 요약을 만든다.
  // 리포트 생성은 백엔드 저장(activityId)과 무관하므로 비로그인 상태에서도 동작한다.
  useEffect(() => {
    if (isViewingSaved) return;
    const logs = runSummary?.coachings ?? [];
    if (logs.length === 0) return;
    let cancelled = false;
    setReportGenerating(true);
    createCoachingReport(logs)
      .then((r) => {
        if (!cancelled) setReport(r);
      })
      .catch(() => {
        // 리포트 생성 실패는 조용히 무시 — 본문은 백엔드 코칭/목업으로 폴백된다.
      })
      .finally(() => {
        if (!cancelled) setReportGenerating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isViewingSaved, runSummary]);

  // 러닝 기록을 백엔드에 저장한다.
  // silent=true 면 (러닝 종료 후 자동 진입 시) 성공 알림 없이 조용히 처리한다.
  const saveRunToServer = async ({ silent }: { silent: boolean }) => {
    if (saveState !== 'idle') return;
    setSaveState('saving');
    try {
      const payload = buildRunPayload(runSummary);
      const result = await saveRun(payload);
      setSaveState('saved');
      // AI 서버 리포트 생성이 실패했으면 백엔드가 저장하며 만든 요약으로 대신한다.
      const savedSummary = result.aiCoachingSummary;
      if (savedSummary) setReport((prev) => prev ?? savedSummary);
      if (!silent) Alert.alert('저장 완료', `러닝 기록이 저장되었어요. (#${result.activityId})`);
    } catch (e) {
      setSaveState('idle');
      autoSavedRef.current = false; // 자동 저장 실패 시 수동 버튼으로 재시도 가능하게
      const message = isAxiosError(e)
        ? e.response?.data?.message ?? '러닝 기록 저장에 실패했어요.'
        : '저장 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.';
      if (!silent) Alert.alert('저장 실패', message);
    }
  };

  // 업로드 아이콘(수동 저장) — 비로그인 시 로그인 유도 후 기록 저장.
  const handleSave = () => {
    if (saveState !== 'idle') return;
    if (!isAuthenticated) {
      Alert.alert('로그인이 필요해요', '러닝 기록을 저장하려면 먼저 로그인해주세요.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    void saveRunToServer({ silent: false });
  };

  // 휴지통 아이콘(저장된 기록 삭제) — 확인 후 백엔드에서 삭제하고 이전 화면(기록 탭)으로 돌아간다.
  const handleDelete = () => {
    if (activityId == null || deleting) return;
    Alert.alert('러닝 기록 삭제', '이 러닝 기록을 삭제할까요? 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteRun(activityId);
            navigation.goBack();
          } catch (e) {
            setDeleting(false);
            const message = isAxiosError(e)
              ? e.response?.data?.message ?? '러닝 기록 삭제에 실패했어요.'
              : '삭제 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.';
            Alert.alert('삭제 실패', message);
          }
        },
      },
    ]);
  };

  // 갓 뛴 리포트(activityId 없음)로 진입하면 — 러닝 종료 직후 — 기록을 자동 저장한다.
  // 로그인 상태에서 한 번만 실행한다. (비로그인 시 수동 버튼으로 유도)
  const autoSavedRef = useRef(false);
  useEffect(() => {
    if (isViewingSaved) return;
    if (autoSavedRef.current) return;
    if (!isAuthenticated) return;
    autoSavedRef.current = true;
    void saveRunToServer({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isViewingSaved, isAuthenticated]);

  return (
    <LightShell>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16 }}>
        {/* Header */}
        <View className="flex-row justify-between items-center py-2">
          <View>
            <Text className="text-[11px] font-semibold tracking-[0.66px] uppercase" style={{ color: '#7c6bb5' }}>
              {/* 저장된 기록은 API 날짜, 갓 뛴 리포트는 로컬 현재 날짜, 저장 기록 로딩 중에는 '--' */}
              {detail
                ? formatHeaderDate(detail.activityDate)
                : isViewingSaved
                ? '--'
                : formatHeaderDate(new Date().toISOString())}
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
            {/* 삭제 버튼은 저장된 기록(기록 탭에서 진입)에서만 노출 */}
            {isViewingSaved && (
              <IconBtn onPress={handleDelete} disabled={deleting}>
                {deleting ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M10 11v6M14 11v6" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
              </IconBtn>
            )}
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

        {/* Achievement banner — 갓 뛴 리포트이면서 5km 이상 달렸을 때만 */}
        {!isViewingSaved && distanceKm != null && distanceKm >= 5 && (
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

        {showSplits && (
          <ReportCard title="스플릿 페이스" subtitle="km별 구간 페이스">
            <SplitsChart splits={splits} avgPaceSec={avgPaceSec} />
          </ReportCard>
        )}

        <ReportCard title="착지 히트맵" subtitle="발바닥 압력 분포">
          <FootHeatmap footSensorData={detail?.footSensorData} loading={loadingSaved} />
        </ReportCard>

        <ReportCard title="프로네이션 분석" subtitle="발의 회내·회외 정도">
          <Pronation footSensorData={detail?.footSensorData} loading={loadingSaved} />
        </ReportCard>

        <CoachSummaryCard title={coachTitle} items={coachItems} generating={reportGenerating} loading={loadingSaved} />

        <View className="flex-row gap-2 mt-3 flex-wrap">
          <ReportMini label="평균 심박" value={loadingSaved ? '--' : String(runSummary?.avgHeartRate ?? MOCK_RUN.avgHeartRate)} unit="bpm" trend="Z2 유산소" trendColor="#6ee7b7" />
          <ReportMini label="케이던스" value={loadingSaved ? '--' : String(runSummary?.cadence ?? MOCK_RUN.cadence)} unit="spm" trend="▲ 적정 범위" trendColor="#10b981" />
          <ReportMini label="고도 변화" value={loadingSaved ? '--' : '+24'} unit="m" trend="평지 코스" trendColor="#7c3aed" />
          <ReportMini label="칼로리" value={loadingSaved ? '--' : '312'} unit="kcal" trend="목표 87%" trendColor="#7c3aed" />
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

// 백엔드는 AI 코칭을 최대 3개만 받는다(4개 이상이면 400).
const MAX_SAVED_COACHINGS = 3;

// 러닝 전체를 대표하도록 처음·중간·마지막처럼 고르게 max 개를 고른다.
const pickSpread = <T,>(items: T[], max: number): T[] =>
  items.length <= max
    ? items
    : Array.from({ length: max }, (_, i) => items[Math.round((i * (items.length - 1)) / (max - 1))]);

// 러닝 저장 요청 본문을 구성한다. 실제 세션 값(run)이 있으면 상위 지표(거리·시간·페이스·폼)는
// 그 값으로 채우고, 구간/발센서 등 세부 항목은 (아직 실데이터가 없어) 목업으로 둔다.
const buildRunPayload = (run?: RunSummaryParam): RunningActivityCreateRequestDto => {
  // 평균 페이스(초/km) 대비 편차로 구간 상태를 정한다: ±30초 Green, ±1분 Yellow, 1분 초과 Red.
  const avgPaceSec = run?.paceSpk ?? 0;
  const paceStatue = (paceSec: number): string => {
    const dev = Math.abs(paceSec - avgPaceSec);
    if (dev <= 30) return 'Green';
    if (dev <= 60) return 'Yellow';
    return 'Red';
  };

  // 러닝 중 수집한 실제 km별 구간. 백엔드는 최대 5개만 받으므로 앞쪽 5개까지 전송한다.
  const liveSplits = (run?.splits ?? []).slice(0, 5);

  return {
    distance: run?.distanceKm ?? MOCK_RUN.distanceKm,
    time: secToHms(run?.durationSec ?? MOCK_RUN.durationSec),
    pace: spkToPace(run?.paceSpk ?? MOCK_RUN.paceSpk),
    formScore: run?.formScore ?? MOCK_RUN.formScore,
    lapSplits: liveSplits.map((s) => ({
      lapNumber: s.km,
      lapPace: spkToPace(s.paceSec),
      avgHeartRate: run?.avgHeartRate ?? 0,
      paceStatue: paceStatue(s.paceSec),
    })),
    footSensorData: [
      {
        footSide: 'Left',
        pronationType: '약간 과내전',
        heelStrikeRate: 62,
        hitmapJson: JSON.stringify({ forefoot_left: 20, forefoot_right: 25, midfoot_left: 18, midfoot_right: 17, heel: 46 }),
      },
      {
        footSide: 'Right',
        pronationType: '중립',
        heelStrikeRate: 58,
        hitmapJson: JSON.stringify({ forefoot_left: 23, forefoot_right: 22, midfoot_left: 19, midfoot_right: 18, heel: 44 }),
      },
    ],
    aiCoachings: pickSpread(run?.coachings ?? [], MAX_SAVED_COACHINGS).map((c) => ({
      feedbackText: c.feedbackText,
      focusPoint: c.focusPoint ?? '',
      recExercise: c.recExercise ?? '',
    })),
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

const SplitsChart = ({ splits, avgPaceSec }: { splits: Split[]; avgPaceSec: number | null }) => {
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

  // 평균 페이스 대비 편차로 색을 정한다: ±30초 초록, ±1분 노랑, 1분 초과 빨강.
  const colorFor = (pace: number): [string, string] => {
    if (avgPaceSec == null) return ['#94a3b8', '#cbd5e1'];
    const dev = Math.abs(pace - avgPaceSec);
    if (dev <= 30) return ['#10b981', '#34d399'];
    if (dev <= 60) return ['#f59e0b', '#fbbf24'];
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
        <LegendDot color="#10b981" label="±30초" />
        <LegendDot color="#fbbf24" label="±1분" />
        <LegendDot color="#ef4444" label="1분 초과" />
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

// 저장 기록 로딩 중(렌더링 전)에 하드코딩 목업 대신 '--' 를 표시한다.
const NoDataHint = ({ dark }: { dark?: boolean }) => (
  <View className="py-5 items-center">
    <Text className="text-[14px] font-bold" style={{ color: dark ? 'rgba(255,255,255,0.75)' : '#9b8cc5' }}>
      --
    </Text>
  </View>
);

type FootLevel = 'high' | 'mid' | 'low';
// hitmapJson 의 실제 5개 구간: 앞발 좌/우, 중족 좌/우, 뒤꿈치.
type FootZone = 'forefoot_left' | 'forefoot_right' | 'midfoot_left' | 'midfoot_right' | 'heel';
type FootDot = { x: number; y: number; r: number; level: FootLevel };

const FOOT_ZONES: FootZone[] = ['forefoot_left', 'forefoot_right', 'midfoot_left', 'midfoot_right', 'heel'];

// 실시간 화면(FootPressure)의 footPositions(엄지·엄지밑·새끼밑·중간·뒤꿈치)와 동일한 점 위치를 쓴다.
// 각 점에 매칭되는 hitmapJson 구간(색 결정용)과 점 반지름.
const DOT_ZONES: FootZone[] = ['forefoot_left', 'forefoot_left', 'forefoot_right', 'midfoot_left', 'heel'];
const DOT_RADII = [10, 9, 9, 9, 12];

// 데이터가 없을 때(갓 뛴 리포트 등) 쓰는 목업 압력 분포(%).
const MOCK_HITMAP: Record<FootZone, number> = {
  forefoot_left: 20,
  forefoot_right: 25,
  midfoot_left: 18,
  midfoot_right: 17,
  heel: 46,
};

// 압력 분포 → 구간별 색 레벨. 각 구간의 점유율(=값/전체합)로 판정한다.
// 5구간 평균 점유율이 20% 이므로 30%↑ 높음(빨강), 15~30% 보통(노랑), 15%↓ 낮음(초록).
const zoneLevels = (vals: Record<FootZone, number>): Record<FootZone, FootLevel> => {
  const total = FOOT_ZONES.reduce((sum, z) => sum + (vals[z] || 0), 0) || 1;
  const levelFor = (v: number): FootLevel => {
    const share = v / total;
    if (share >= 0.3) return 'high';
    if (share >= 0.15) return 'mid';
    return 'low';
  };
  return {
    forefoot_left: levelFor(vals.forefoot_left),
    forefoot_right: levelFor(vals.forefoot_right),
    midfoot_left: levelFor(vals.midfoot_left),
    midfoot_right: levelFor(vals.midfoot_right),
    heel: levelFor(vals.heel),
  };
};

// hitmapJson(5키) 파싱. 키가 빠지거나 형식이 어긋나면 null.
const parseHitmap = (json: string): Record<FootZone, number> | null => {
  try {
    const o = JSON.parse(json);
    const out = {} as Record<FootZone, number>;
    for (const z of FOOT_ZONES) {
      const n = Number(o[z]);
      if (Number.isNaN(n)) return null;
      out[z] = n;
    }
    return out;
  } catch {
    return null;
  }
};

const FootHeatmap = ({ footSensorData, loading }: { footSensorData?: FootSensorDataResponseDto[]; loading?: boolean }) => {
  if (loading) return <NoDataHint />;

  // 좌/우 센서의 hitmapJson(5구간)으로 실제 압력 색을 칠한다. 데이터가 없으면 목업으로 폴백.
  // 점 위치는 실시간 화면과 동일한 footPositions 를 쓰고, 각 점에 해당 구간 색을 입힌다.
  const dotsFor = (side: 'L' | 'R', re: RegExp): FootDot[] => {
    const data = footSensorData?.find((f) => re.test(f.footSide));
    const levels = zoneLevels((data && parseHitmap(data.hitmapJson)) || MOCK_HITMAP);
    return footPositions(side).map((p, i) => ({ x: p.x, y: p.y, r: DOT_RADII[i], level: levels[DOT_ZONES[i]] }));
  };

  return (
    <View>
      <View className="flex-row justify-center gap-7">
        <FootSvg side="L" dots={dotsFor('L', /left|왼/i)} />
        <FootSvg side="R" dots={dotsFor('R', /right|오른/i)} />
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

const FootSvg = ({ side, dots }: { side: 'L' | 'R'; dots: FootDot[] }) => (
  <View className="items-center">
    <Text
      className="text-[10px] mb-[6px] tracking-[0.8px] font-bold uppercase"
      style={{ color: '#7c6bb5' }}
    >
      {side === 'L' ? '왼발' : '오른발'}
    </Text>
    <Svg width={80} height={130} viewBox="0 0 80 130">
      <Defs>
        <SvgGradient id={`foot-bg-${side}`} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0%" stopColor="rgba(229, 222, 250, 0.04)" />
          <Stop offset="100%" stopColor="rgba(208, 186, 247, 0.01)" />
        </SvgGradient>
      </Defs>
      {/* 실시간 화면과 동일한 발 외곽선(FOOT_PATH). 외곽선은 좌우 대칭이라 미러링 불필요 */}
      <Path
        d={FOOT_PATH}
        fill={`url(#foot-bg-${side})`}
        stroke="rgba(124,58,237,0.12)"
        strokeWidth={1}
      />
      {dots.map((d, i) => (
        <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={FOOT_COLORS[d.level]} opacity={0.9} />
      ))}
    </Svg>
  </View>
);

const isNeutralPronation = (type: string): boolean =>
  /정상|중립|normal|neutral/i.test(type);

const Pronation = ({ footSensorData, loading }: { footSensorData?: FootSensorDataResponseDto[]; loading?: boolean }) => {
  // 저장 기록 로딩 중에는 '--'. 로딩 후엔 상세 데이터가 있으면 좌/우 센서로, 없으면 목업으로 표시.
  if (loading) return <NoDataHint />;
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

// 카드에 표시할 코칭 항목 (제목 + 본문)
interface CoachItem {
  title: string;
  body: string;
}

const CoachSummaryCard = ({
  title,
  items,
  generating,
  loading,
}: {
  title?: string;
  items?: CoachItem[];
  generating?: boolean;
  loading?: boolean;
}) => (
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
        <Text className="text-[14px] text-white font-bold mt-[1px]">{title ?? '오늘의 분석'}</Text>
      </View>
    </View>

    <View className="gap-2">
      {loading ? (
        <NoDataHint dark />
      ) : generating ? (
        <View className="flex-row items-center gap-2 py-1">
          <ActivityIndicator size="small" color="#ffffff" />
          <Text className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
            AI 코치가 요약 리포트를 만드는 중…
          </Text>
        </View>
      ) : items && items.length > 0 ? (
        items.map((it, i) => (
          <CoachBullet key={i} tone={COACH_TONES[i % COACH_TONES.length]} title={it.title} body={it.body} />
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
