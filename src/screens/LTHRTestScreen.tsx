import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { analyzeLthr, createLthrCoaching } from '@/api/ai';
import { DarkShell, RSTabBar, type TabId } from '@/components/domain';
import { handleRootTabPress } from '@/navigation/tabRoutes';
import { useMyLthr } from '@/stores/profileStore';
import { WATCH_LIVE_STALE_MS, useWatchStore } from '@/stores/watchStore';
import { colors } from '@/theme/tokens';
import { HR_AEROBIC_MAX, HR_THRESHOLD_MAX, hrZoneColor } from '@/utils/format';
import {
  MEASURE_START_SECONDS,
  REST_SECONDS,
  TEST_SECONDS,
  WARMUP_SECONDS,
  analyzeLthrLocally,
  downsampleHeartRates,
  fmtClock,
  isValidHeartRate,
  runningLthrEstimate,
} from '@/utils/lthr';

import type { LthrAnalyzeResponseDto, LthrHeartRateSampleDto } from '@/types/aiApi';
import type { ScreenProps } from '@/types/navigation';

// HR graph width = screen − ScrollView padding (18×2) − HR card padding (14×2)
const HR_GRAPH_W = Dimensions.get('window').width - 18 * 2 - 14 * 2;
/** 실시간 심박 그래프에 보여줄 최근 샘플 수(초) */
const RECENT_WINDOW = 60;

type Stage = 'rest' | 'warmup' | 'test' | 'analyzing';

interface HeartRateReading {
  hr: number;
  fromWatch: boolean;
}

// 워치 심박이 없을 때 쓰는 시뮬레이션 — 단계별로 실제 테스트와 비슷한 곡선을 그린다.
// (러닝 대시보드와 같은 방식: 워치가 없으면 시뮬레이션 값으로 폴백)
const simulatedHeartRate = (stage: Stage, elapsed: number): number => {
  const noise = Math.sin(elapsed * 1.7) * 2 + Math.cos(elapsed * 0.6) * 1.5;
  if (stage === 'rest') return 60 + Math.sin(elapsed * 1.7) * 2;
  if (stage === 'warmup') return 105 + (elapsed / WARMUP_SECONDS) * 30 + noise;
  const min = elapsed / 60;
  // 전반 10분 145→160 으로 올라가고, 후반 20분은 160 근처에서 서서히 오른다.
  return (min < 10 ? 145 + min * 1.5 : 160 + (min - 10) * 0.3) + noise;
};

// 현재 심박 — 최근 15초 안에 받은 워치 실시간 심박이 있으면 그 값, 없으면 시뮬레이션 값.
const readHeartRate = (stage: Stage, elapsed: number): HeartRateReading => {
  const { live, liveAt } = useWatchStore.getState();
  if (live && Date.now() - liveAt <= WATCH_LIVE_STALE_MS && live.heartRate > 0) {
    return { hr: Math.round(live.heartRate), fromWatch: true };
  }
  return { hr: Math.round(simulatedHeartRate(stage, elapsed)), fromWatch: false };
};

const zoneLabel = (hr: number): string =>
  hr < HR_AEROBIC_MAX ? '유산소 영역' : hr < HR_THRESHOLD_MAX ? '역치 영역' : '무산소 영역';

export const LTHRTestScreen = ({ navigation }: ScreenProps<'LTHRTest'>) => {
  const myLthr = useMyLthr();

  const [stage, setStage] = useState<Stage>('rest');
  /** 현재 단계 시작 후 경과 시간(초) */
  const [elapsed, setElapsed] = useState(0);
  const [current, setCurrent] = useState<HeartRateReading | null>(null);

  // 1초마다 쌓이는 값은 ref 에 두고, 화면은 elapsed 갱신으로 다시 그린다.
  const restSamplesRef = useRef<number[]>([]);
  const testSamplesRef = useRef<LthrHeartRateSampleDto[]>([]);
  const recentRef = useRef<number[]>([]);
  const simulatedRef = useRef(false);
  /** 결과 화면으로 넘어갈 때는 '테스트 중단' 확인 없이 화면을 떠난다 */
  const leavingRef = useRef(false);

  const goToStage = (next: Stage) => {
    setElapsed(0);
    setStage(next);
  };

  const finish = useCallback(async () => {
    const samples = testSamplesRef.current;
    const restSamples = restSamplesRef.current;
    const testSeconds = samples.length ? samples[samples.length - 1].elapsedSeconds : 0;
    const restingHeartRate =
      Math.round((restSamples.reduce((sum, hr) => sum + hr, 0) / Math.max(1, restSamples.length)) * 10) / 10;
    const previousLthr = myLthr != null ? Math.round(myLthr) : null;

    setStage('analyzing');

    // 정식 분석은 AI 서버, 실패하면 같은 방식으로 기기에서 계산한다(측정값을 버리지 않는다).
    let result: LthrAnalyzeResponseDto;
    try {
      result = await analyzeLthr({ heartRateSamples: samples, previousLthr });
    } catch {
      result = analyzeLthrLocally(samples, previousLthr);
    }

    let coachingAnalysis: string | undefined;
    try {
      coachingAnalysis = (await createLthrCoaching(result)).analysis;
    } catch {
      // 결과 화면에서 한 번 더 시도한다.
    }

    leavingRef.current = true;
    navigation.replace('LTHRReport', {
      result,
      coachingAnalysis,
      samples: downsampleHeartRates(samples),
      restingHeartRate,
      testSeconds,
      finishedAt: new Date().toISOString(),
      simulated: simulatedRef.current,
    });
  }, [myLthr, navigation]);

  const finishRef = useRef(finish);
  finishRef.current = finish;

  // 단계별 1초 타이머 — 경과 시간은 시작 시각 기준으로 계산해 타이머 지연이 쌓이지 않게 한다.
  useEffect(() => {
    if (stage === 'analyzing') return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const sec = Math.floor((Date.now() - startedAt) / 1000);
      const reading = readHeartRate(stage, sec);
      const valid = isValidHeartRate(reading.hr);
      setCurrent(reading);

      if (valid) {
        if (!reading.fromWatch) simulatedRef.current = true;
        recentRef.current = [...recentRef.current, reading.hr].slice(-RECENT_WINDOW);
      }

      if (stage === 'rest') {
        if (valid) restSamplesRef.current.push(reading.hr);
        setElapsed(restSamplesRef.current.length);
        if (restSamplesRef.current.length >= REST_SECONDS) goToStage('warmup');
        return;
      }

      setElapsed(sec);
      if (stage === 'warmup') {
        if (sec >= WARMUP_SECONDS) goToStage('test');
        return;
      }

      // 본 테스트 — AI 서버 규격상 경과 시간은 0~1800초
      if (valid) {
        testSamplesRef.current.push({ elapsedSeconds: Math.min(sec, TEST_SECONDS), heartRate: reading.hr });
      }
      if (sec >= TEST_SECONDS) {
        clearInterval(timer);
        void finishRef.current();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [stage]);

  // 뒤로 가기·탭 이동 등으로 화면을 떠나면 측정이 끊기므로 한 번 확인한다.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (leavingRef.current || stage === 'rest') return;
        e.preventDefault();
        if (stage === 'analyzing') return; // 분석 중에는 떠나지 않는다
        Alert.alert('테스트를 중단할까요?', '지금 나가면 측정값이 저장되지 않아요.', [
          { text: '계속하기', style: 'cancel' },
          {
            text: '중단',
            style: 'destructive',
            onPress: () => {
              leavingRef.current = true;
              navigation.dispatch(e.data.action);
            },
          },
        ]);
      }),
    [navigation, stage],
  );

  const handleTabPress = (id: TabId) => handleRootTabPress(navigation, id);

  if (stage === 'rest') {
    return (
      <RestStage
        seconds={elapsed}
        currentHR={current?.hr}
        fromWatch={current?.fromWatch}
        onCancel={() => navigation.goBack()}
        onTabPress={handleTabPress}
      />
    );
  }

  const isWarmup = stage === 'warmup';
  const isAnalyzing = stage === 'analyzing';
  const total = isWarmup ? WARMUP_SECONDS : TEST_SECONDS;
  const shown = Math.min(elapsed, total);
  const pct = (shown / total) * 100;
  const inMeasure = stage !== 'warmup' && shown >= MEASURE_START_SECONDS;
  const estimate = runningLthrEstimate(testSamplesRef.current);
  const hr = current?.hr;

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
              {isWarmup ? '워밍업 중' : 'LTHR 측정 중'}
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
            <Text className="text-[12px] font-bold mb-[2px]" style={{ color: '#ddd6fe' }}>
              {isWarmup ? '워밍업 안내' : '테스트 안내'}
            </Text>
            <Text className="text-[11.5px] leading-[17px] font-medium" style={{ color: 'rgba(221,214,254,0.8)' }}>
              {isWarmup
                ? '10분간 가볍게 달리며 몸을 풀어주세요. 끝나면 30분 테스트가 자동으로 시작돼요.'
                : inMeasure
                  ? '측정 구간이에요. 끝까지 일정한 최대 강도를 유지하세요. 이 구간의 평균 심박이 LTHR이 됩니다.'
                  : '30분간 혼자 달리는 레이스처럼 최대한 일정하게 달리세요. 10분 후부터 20분간 측정합니다.'}
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
            <PhaseDot label="안정 측정" done />
            <PhaseDot label="워밍업" active={isWarmup} done={!isWarmup} />
            <PhaseDot label="전반 10분" active={!isWarmup && !inMeasure} done={inMeasure} />
            <PhaseDot label="후반 20분 (측정)" active={inMeasure} />
          </View>

          <View className="flex-row items-baseline gap-[6px]">
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="text-[56px] font-bold text-white tracking-[-2.8px] leading-[58px]"
            >
              {fmtClock(shown)}
            </Text>
            <Text className="text-[18px] font-semibold tracking-[-0.36px]" style={{ color: 'rgba(167,139,250,0.6)' }}>
              / {fmtClock(total)}
            </Text>
          </View>
          <Text className="text-[10px] text-purple-300 font-semibold tracking-[0.8px] uppercase mt-[6px]">
            남은 시간 {fmtClock(total - shown)}
          </Text>

          {/* Progress + phase marker */}
          <View className={`w-full mt-[14px] ${isWarmup ? '' : 'pb-[18px]'}`}>
            <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(167,139,250,0.14)' }}>
              <LinearGradient
                colors={['#7c3aed', '#6366f1', '#3b82f6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: `${pct}%`, height: '100%', borderRadius: 999 }}
              />
            </View>
            {!isWarmup && (
              <>
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
              </>
            )}
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
                최근 60초 · {current?.fromWatch ? '워치 센서' : '시뮬레이션'}
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
                <Text
                  className="text-[36px] font-bold tracking-[-1.44px] leading-[40px]"
                  style={{ color: hr != null ? hrZoneColor(hr) : '#fff' }}
                >
                  {hr ?? '--'}
                </Text>
              </View>
              <Text className="text-[10px] font-bold tracking-[0.6px]" style={{ color: '#fca5a5' }}>
                BPM{hr != null ? ` · ${zoneLabel(hr)}` : ''}
              </Text>
            </View>
          </View>

          {/* HR line graph — zone-colored (유산소/역치/무산소) */}
          <HRZoneGraph data={recentRef.current} width={HR_GRAPH_W} height={80} />

          <View
            className="flex-row gap-[10px] mt-3 pt-[10px]"
            style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(167,139,250,0.12)' }}
          >
            <ZoneLegend color={colors.semantic.good} label="유산소" range={`< ${HR_AEROBIC_MAX}`} />
            <ZoneLegend color={colors.semantic.warn} label="역치" range={`${HR_AEROBIC_MAX}-${HR_THRESHOLD_MAX}`} />
            <ZoneLegend color={colors.semantic.bad} label="무산소" range={`≥ ${HR_THRESHOLD_MAX}`} />
          </View>
        </View>

        {/* LTHR pair cards */}
        <View className="flex-row gap-2 mb-[14px]">
          <LTHRStatCard
            label="현재 LTHR"
            value={myLthr ? String(myLthr) : '—'}
            sub={myLthr ? 'bpm' : '미설정'}
            tone={myLthr ? 'cool' : 'muted'}
          />
          <LTHRStatCard
            label="실시간 추정 LTHR"
            value={estimate != null ? String(estimate) : '—'}
            sub={estimate != null ? 'bpm' : isWarmup ? '테스트 후 계산' : '10:00 이후 계산'}
            tone={estimate != null ? 'hot' : 'muted'}
            highlight={estimate != null}
          />
        </View>

        {isWarmup && (
          <Pressable onPress={() => goToStage('test')} className="mb-2">
            <LinearGradient
              colors={['#f59e0b', '#ef4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
            >
              <Text className="text-white text-[14px] font-bold">워밍업 건너뛰고 테스트 시작</Text>
            </LinearGradient>
          </Pressable>
        )}

        {/* 개발 빌드 전용 — 30분을 다 채우지 않고 지금까지의 샘플로 분석 화면을 확인한다 */}
        {__DEV__ && !isWarmup && !isAnalyzing && testSamplesRef.current.length >= 2 && (
          <Pressable
            onPress={() => void finish()}
            className="items-center py-[10px] mb-2 rounded-[14px]"
            style={{ borderWidth: 0.5, borderColor: 'rgba(167,139,250,0.3)' }}
          >
            <Text className="text-[12px] font-semibold" style={{ color: 'rgba(221,214,254,0.8)' }}>
              지금 종료하고 분석 (개발용)
            </Text>
          </Pressable>
        )}

        {/* Stop button */}
        <Pressable onPress={() => navigation.goBack()} disabled={isAnalyzing}>
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
              opacity: isAnalyzing ? 0.75 : 1,
            }}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Svg width={14} height={14} viewBox="0 0 24 24">
                <Rect x={6} y={6} width={12} height={12} rx={1.5} fill="#fff" />
              </Svg>
            )}
            <Text className="text-white text-[14px] font-bold">
              {isAnalyzing ? '결과 분석 중...' : '테스트 중지'}
            </Text>
          </LinearGradient>
        </Pressable>

        <Text className="text-[10px] text-center mt-2 font-medium" style={{ color: 'rgba(167,139,250,0.5)' }}>
          {isAnalyzing ? '잠시만 기다려주세요' : '30분이 끝나면 자동으로 분석돼요 · 중지하면 측정값이 저장되지 않습니다'}
        </Text>
      </ScrollView>

      <RSTabBar active="run" onChange={handleTabPress} />
    </DarkShell>
  );
};

// 테스트 전 안정 측정 단계 — 움직이지 않은 상태로 REST_SECONDS 동안 심박을 잰다.
const RestStage = ({
  seconds,
  currentHR,
  fromWatch,
  onCancel,
  onTabPress,
}: {
  seconds: number;
  currentHR: number | undefined;
  fromWatch: boolean | undefined;
  onCancel: () => void;
  onTabPress: (id: TabId) => void;
}) => (
  <DarkShell>
    <View
      className="absolute top-0 -right-[80px] w-[280px] h-[280px] rounded-full opacity-40"
      style={{ backgroundColor: 'rgba(124,58,237,0.32)' }}
      pointerEvents="none"
    />
    <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 14 }}>
      <View className="pt-1 pb-[14px]">
        <Text className="text-[11px] text-purple-300 font-semibold tracking-[0.88px] uppercase">체력 테스트</Text>
        <Text className="text-[22px] font-bold text-white tracking-[-0.66px] leading-[26px] mt-1">
          안정 시 심박 측정 중
        </Text>
      </View>

      <View
        className="rounded-[18px] px-4 pt-5 pb-[18px] mb-3 items-center"
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 0.5,
          borderColor: 'rgba(167,139,250,0.18)',
        }}
      >
        <View className="flex-row gap-[6px] mb-3">
          <PhaseDot label="안정 측정" active />
          <PhaseDot label="워밍업" />
          <PhaseDot label="전반 10분" />
          <PhaseDot label="후반 20분 (측정)" />
        </View>

        <View className="flex-row items-baseline gap-[6px]">
          <Text className="text-[56px] font-bold text-white tracking-[-2.8px] leading-[58px]">
            {REST_SECONDS - seconds}
          </Text>
          <Text className="text-[18px] font-semibold" style={{ color: 'rgba(167,139,250,0.6)' }}>초</Text>
        </View>
        <Text className="text-[12px] font-medium text-center mt-2 leading-[18px]" style={{ color: 'rgba(221,214,254,0.8)' }}>
          편안히 선 채로 움직이지 마세요.{'\n'}측정한 평균 심박이 안정 시 심박수로 저장됩니다.
        </Text>

        <View className="w-full h-2 rounded-full overflow-hidden mt-[14px]" style={{ backgroundColor: 'rgba(167,139,250,0.14)' }}>
          <LinearGradient
            colors={['#7c3aed', '#6366f1', '#3b82f6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: `${(seconds / REST_SECONDS) * 100}%`, height: '100%', borderRadius: 999 }}
          />
        </View>

        <View className="flex-row items-baseline gap-1 mt-4">
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path
              d="M12 21s-7-4.5-9.5-9.5C0.5 7 4 3 8 3c2 0 3.5 1 4 2 0.5-1 2-2 4-2 4 0 7.5 4 5.5 8.5C19 16.5 12 21 12 21z"
              fill="#ef4444"
            />
          </Svg>
          <Text className="text-[28px] font-bold text-white tracking-[-1px]">{currentHR ?? '--'}</Text>
          <Text className="text-[11px] font-bold" style={{ color: '#fca5a5' }}>BPM</Text>
        </View>
        {fromWatch != null && (
          <Text className="text-[10px] font-semibold mt-1" style={{ color: 'rgba(167,139,250,0.6)' }}>
            {fromWatch ? '워치 센서' : '워치 미연결 · 시뮬레이션'}
          </Text>
        )}
      </View>

      <Pressable onPress={onCancel} className="items-center py-3">
        <Text className="text-[13px] font-semibold" style={{ color: 'rgba(167,139,250,0.7)' }}>취소</Text>
      </Pressable>
    </ScrollView>

    <RSTabBar active="run" onChange={onTabPress} />
  </DarkShell>
);

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

interface HRZoneGraphProps {
  data: number[];
  width: number;
  height: number;
}

// Line + area graph (same shape as the live run pace sparkline) whose
// segments are colored per HR zone — 유산소=초록 · 역치=노랑 · 무산소=빨강.
const HRZoneGraph = ({ data, width, height }: HRZoneGraphProps) => {
  // 선을 그리려면 점이 2개 이상 필요하다 — 그 전엔 자리만 잡아 둔다.
  if (data.length < 2) return <View style={{ width, height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (RECENT_WINDOW - 1);
  // 최근 60초 창을 고정 폭으로 그리고, 새 샘플이 오른쪽 끝에 붙도록 정렬한다.
  const offset = (RECENT_WINDOW - data.length) * step;
  const pts = data.map((v, i) => [offset + i * step, height - ((v - min) / range) * height] as const);

  return (
    <Svg width={width} height={height}>
      {pts.slice(1).map(([x, y], i) => {
        const [px, py] = pts[i];
        const color = hrZoneColor((data[i] + data[i + 1]) / 2);
        const x1 = px.toFixed(1);
        const y1 = py.toFixed(1);
        const x2 = x.toFixed(1);
        const y2 = y.toFixed(1);
        return (
          <Fragment key={i}>
            <Path d={`M${x1} ${y1} L${x2} ${y2} L${x2} ${height} L${x1} ${height} Z`} fill={color} fillOpacity={0.18} />
            <Path d={`M${x1} ${y1} L${x2} ${y2}`} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          </Fragment>
        );
      })}
    </Svg>
  );
};

const LTHR_TONES = {
  muted: { color: 'rgba(167,139,250,0.5)', border: 'rgba(167,139,250,0.12)', bg: 'rgba(255,255,255,0.03)' },
  hot: { color: '#fbbf24', border: 'rgba(251,191,36,0.3)', bg: 'rgba(251,191,36,0.08)' },
  cool: { color: '#a78bfa', border: 'rgba(167,139,250,0.3)', bg: 'rgba(167,139,250,0.08)' },
};

interface LTHRStatCardProps {
  label: string;
  value: string;
  sub: string;
  tone: 'muted' | 'hot' | 'cool';
  highlight?: boolean;
}

const LTHRStatCard = ({
  label,
  value,
  sub,
  tone,
  highlight,
}: LTHRStatCardProps) => {
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
