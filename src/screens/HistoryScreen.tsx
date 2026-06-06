import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { isAxiosError } from 'axios';
import Svg, { Path, Rect } from 'react-native-svg';

import { LightShell } from '@/components/domain';
import { readAllRuns } from '@/api';
import { useAuthStore } from '@/stores/authStore';
import { gradients } from '@/theme/tokens';

import type { RunningActivityListResponseDto } from '@/types/api';
import type { TabScreenProps } from '@/types/navigation';

type Period = 'week' | 'month' | 'all';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// "2026-05-23T19:12:37" → { date: "5월 3일", weekday: "일", ts }
const formatActivityDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '-', weekday: '', ts: 0 };
  return {
    date: `${d.getMonth() + 1}월 ${d.getDate()}일`,
    weekday: WEEKDAYS[d.getDay()],
    ts: d.getTime(),
  };
};

// "00:28:42" → "28:42" (선행 00시 제거)
const trimTime = (time: string) => time.replace(/^00:/, '');

const periodCutoff = (period: Period): number => {
  if (period === 'all') return 0;
  const days = period === 'week' ? 7 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
};

export const HistoryScreen = ({ navigation }: TabScreenProps<'History'>) => {
  const [period, setPeriod] = useState<Period>('all');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [data, setData] = useState<RunningActivityListResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated) {
      setError('러닝 기록을 보려면 로그인해주세요.');
      setData(null);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await readAllRuns();
      setData(result);
    } catch (e) {
      const message = isAxiosError(e)
        ? e.response?.data?.message ?? '러닝 기록을 불러오지 못했어요.'
        : '러닝 기록을 불러오는 중 오류가 발생했어요.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  // 화면에 포커스될 때마다 새로고침 (저장 후 돌아오면 최신 목록 반영)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const cutoff = periodCutoff(period);
  const activities = (data?.activities ?? [])
    .slice()
    .sort((a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime())
    .filter((a) => new Date(a.activityDate).getTime() >= cutoff);

  return (
    <LightShell>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#7c3aed" />
        }
      >
        {/* Header */}
        <View className="flex-row justify-between items-start pt-1 pb-[14px]">
          <View>
            <Text className="text-[11px] font-semibold tracking-[0.66px] uppercase" style={{ color: '#7c6bb5' }}>
              4월 28일 — 5월 4일
            </Text>
            <Text className="text-[22px] font-bold mt-1 tracking-[-0.66px]" style={{ color: '#1e1b4b' }}>러닝 기록</Text>
          </View>
          <View className="flex-row gap-2">
            <HIconBtn>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Rect x={3} y={4} width={18} height={18} rx={2} stroke="#7c3aed" strokeWidth={2} />
                <Path d="M16 2v4M8 2v4M3 10h18" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </HIconBtn>
            <HIconBtn>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M3 6h18M6 12h12M10 18h4" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </HIconBtn>
          </View>
        </View>

        {/* Period tabs */}
        <View
          className="flex-row gap-1 p-1 rounded-full mb-[14px]"
          style={{
            backgroundColor: 'rgba(255,255,255,0.6)',
            borderWidth: 0.5,
            borderColor: 'rgba(124,58,237,0.14)',
          }}
        >
          {(['week', 'month', 'all'] as Period[]).map((p) => {
            const active = period === p;
            const label = p === 'week' ? '주간' : p === 'month' ? '월간' : '전체';
            if (active) {
              return (
                <Pressable key={p} onPress={() => setPeriod(p)} className="flex-1">
                  <LinearGradient
                    colors={['#7c3aed', '#6366f1', '#3b82f6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingVertical: 8, borderRadius: 999, alignItems: 'center' }}
                  >
                    <Text className="text-white text-[12px] font-bold">{label}</Text>
                  </LinearGradient>
                </Pressable>
              );
            }
            return (
              <Pressable key={p} onPress={() => setPeriod(p)} className="flex-1 py-2 items-center">
                <Text className="text-[12px] font-bold" style={{ color: '#6b5ca5' }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Summary cards — 전체 누적 (서버 합계) */}
        <View className="flex-row gap-2 mb-[14px]">
          <HSummaryCard label="총 거리" value={(data?.totalDistance ?? 0).toFixed(1)} unit="km" trend="전체 누적" />
          <HSummaryCard label="러닝 횟수" value={String(data?.totalCount ?? 0)} unit="회" trend="전체" trendGood />
          <HSummaryCard label="평균 폼" value={Math.round(data?.averageFormScore ?? 0).toString()} unit="점" trend="평균" />
        </View>

        <DailyBarChart />

        {/* Section title */}
        <View className="flex-row justify-between items-baseline mt-4 mb-2">
          <View className="flex-row items-baseline gap-[6px]">
            <Text className="text-[14px] font-bold" style={{ color: '#1e1b4b' }}>러닝 목록</Text>
            <Text className="text-[11px] font-medium" style={{ color: '#9b8cc5' }}>{activities.length}건</Text>
          </View>
          <Text className="text-[11px] text-purple-500 font-semibold">최신순 ▾</Text>
        </View>

        {/* Run list */}
        {loading ? (
          <View className="py-10 items-center">
            <ActivityIndicator color="#7c3aed" />
          </View>
        ) : error ? (
          <Pressable onPress={() => load()} className="py-8 items-center">
            <Text className="text-[13px] font-medium" style={{ color: '#b45309' }}>{error}</Text>
            <Text className="text-[12px] mt-1 text-purple-500 font-semibold">다시 시도</Text>
          </Pressable>
        ) : activities.length === 0 ? (
          <View className="py-10 items-center">
            <Text className="text-[13px] font-medium" style={{ color: '#9b8cc5' }}>아직 러닝 기록이 없어요.</Text>
          </View>
        ) : (
          <View
            className="rounded-[16px] overflow-hidden"
            style={{
              backgroundColor: 'rgba(255,255,255,0.78)',
              borderWidth: 0.5,
              borderColor: 'rgba(124,58,237,0.12)',
            }}
          >
            {activities.map((activity, i) => {
              const { date, weekday } = formatActivityDate(activity.activityDate);
              return (
                <View key={activity.activityId}>
                  {i > 0 && <RunDivider />}
                  <RunRow
                    date={date}
                    weekday={weekday}
                    dist={activity.distance.toFixed(2)}
                    time={trimTime(activity.time)}
                    pace={activity.pace}
                    form={activity.formScore}
                    onPress={() => navigation.navigate('Report', { activityId: activity.activityId })}
                  />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </LightShell>
  );
};

const HIconBtn = ({ children }: { children: React.ReactNode }) => (
  <Pressable
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

const HSummaryCard = ({
  label,
  value,
  unit,
  trend,
  trendGood,
}: {
  label: string;
  value: string;
  unit: string;
  trend: string;
  trendGood?: boolean;
}) => (
  <View
    className="flex-1 rounded-[16px] px-2 py-3 items-center overflow-hidden"
    style={{
      backgroundColor: 'rgba(255,255,255,0.78)',
      borderWidth: 0.5,
      borderColor: 'rgba(124,58,237,0.14)',
    }}
  >
    <LinearGradient
      colors={['#7c3aed', '#6366f1', '#3b82f6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 }}
    />
    <Text className="text-[9px] font-bold tracking-[0.72px] uppercase" style={{ color: '#9b8cc5' }}>
      {label}
    </Text>
    <View className="flex-row items-baseline mt-[6px]">
      <Text className="text-[24px] font-bold text-purple-500 tracking-[-0.72px] leading-[30px]">{value}</Text>
      <Text className="text-[11px] ml-[2px] font-medium" style={{ color: '#9b8cc5' }}>{unit}</Text>
    </View>
    <Text
      className="text-[9px] font-semibold mt-1"
      style={{ color: trendGood ? '#10b981' : '#7c3aed' }}
    >
      {trend}
    </Text>
  </View>
);

const DAYS = [
  { day: '월', dist: 0 },
  { day: '화', dist: 5.0 },
  { day: '수', dist: 4.2 },
  { day: '목', dist: 3.8 },
  { day: '금', dist: 6.4 },
  { day: '토', dist: 0 },
  { day: '일', dist: 5.24 },
];

const DailyBarChart = () => {
  const max = Math.max(...DAYS.map((d) => d.dist));
  return (
    <View
      className="rounded-[18px] p-[14px]"
      style={{
        backgroundColor: 'rgba(255,255,255,0.78)',
        borderWidth: 0.5,
        borderColor: 'rgba(124,58,237,0.12)',
      }}
    >
      <View className="flex-row justify-between items-baseline mb-3">
        <View>
          <Text className="text-[14px] font-bold" style={{ color: '#1e1b4b' }}>요일별 거리</Text>
          <Text className="text-[10px] font-medium mt-[2px]" style={{ color: '#9b8cc5' }}>이번 주 합계 24.6km</Text>
        </View>
        <Text className="text-[11px] text-good-2 font-bold">+3.8km vs 지난주</Text>
      </View>

      <View className="flex-row items-end gap-[6px] h-[100px]">
        {DAYS.map((d) => {
          const ran = d.dist > 0;
          const h = ran ? Math.max(8, (d.dist / max) * 88) : 4;
          const isToday = d.day === '일';
          return (
            <View key={d.day} className="flex-1 items-center gap-[6px]">
              {ran ? (
                <Text className="text-[10px] font-bold text-purple-500">{d.dist}</Text>
              ) : (
                <Text className="text-[10px] text-transparent">·</Text>
              )}
              {ran ? (
                <LinearGradient
                  colors={isToday ? ['#a78bfa', '#7c3aed', '#3b82f6'] : ['#c4b5fd', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{ width: '100%', height: h, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}
                />
              ) : (
                <View
                  className="w-full rounded"
                  style={{
                    height: h,
                    borderWidth: 0.5,
                    borderColor: 'rgba(167,139,250,0.4)',
                    borderStyle: 'dashed',
                  }}
                />
              )}
              <Text
                className={`text-[11px] ${isToday ? 'font-bold' : 'font-medium'}`}
                style={{ color: isToday ? '#7c3aed' : '#9b8cc5' }}
              >
                {d.day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

interface RunRowProps {
  date: string;
  weekday: string;
  dist: string;
  time: string;
  pace: string;
  form: number;
  pr?: boolean;
  onPress?: () => void;
}

const RunRow = ({ date, weekday, dist, time, pace, form, pr, onPress }: RunRowProps) => {
  const formColor = form >= 85 ? '#10b981' : form >= 80 ? '#7c3aed' : '#f59e0b';
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 px-[14px] py-[13px]">
      <View className="w-[44px] items-center">
        <Text className="text-[10px] font-semibold" style={{ color: '#9b8cc5' }}>{weekday}</Text>
        <Text className="text-[13px] font-bold mt-[1px]" style={{ color: '#1e1b4b' }}>{date.split(' ')[1]}</Text>
        <Text className="text-[8px] font-semibold" style={{ color: '#9b8cc5' }}>{date.split(' ')[0]}</Text>
      </View>
      <View className="w-px self-stretch" style={{ backgroundColor: 'rgba(124,58,237,0.1)' }} />
      <View className="flex-1">
        <View className="flex-row items-baseline gap-[6px] mb-[2px]">
          <Text className="text-[17px] font-bold tracking-[-0.51px]" style={{ color: '#1e1b4b' }}>
            {dist}
            <Text className="text-[10px] font-medium" style={{ color: '#9b8cc5' }}> km</Text>
          </Text>
          {pr && (
            <LinearGradient
              colors={gradients.action}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 }}
            >
              <Text className="text-white text-[9px] font-bold">PR</Text>
            </LinearGradient>
          )}
        </View>
        <View className="flex-row gap-[10px]">
          <Text className="text-[11px] font-medium" style={{ color: '#6b5ca5' }}>⏱ {time}</Text>
          <Text className="text-[11px] font-medium" style={{ color: '#6b5ca5' }}>· {pace}</Text>
        </View>
      </View>
      <View
        className="rounded-[10px] px-[10px] py-[6px] items-center"
        style={{
          backgroundColor: `${formColor}15`,
          borderWidth: 0.5,
          borderColor: `${formColor}40`,
        }}
      >
        <Text className="text-[8px] font-bold tracking-[0.48px]" style={{ color: formColor }}>FORM</Text>
        <Text className="text-[14px] font-bold leading-[18px] mt-[1px] tracking-[-0.28px]" style={{ color: formColor }}>{form}</Text>
      </View>
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path d="M9 18l6-6-6-6" stroke="#9b8cc5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
};

const RunDivider = () => <View className="h-px mx-[14px]" style={{ backgroundColor: 'rgba(124,58,237,0.12)' }} />;
