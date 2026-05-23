import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';

import { LightShell, RSTabBar, type TabId } from '@/components/domain';
import { gradients } from '@/theme/tokens';

import type { ScreenProps } from '@/types/navigation';

type Period = 'week' | 'month' | 'all';

export const HistoryScreen = ({ navigation }: ScreenProps<'History'>) => {
  const [period, setPeriod] = useState<Period>('week');
  const handleTabPress = (id: TabId) => {
    if (id === 'home') navigation.navigate('Home');
    else if (id === 'course') navigation.navigate('Course');
    else if (id === 'settings') navigation.navigate('Settings');
    else if (id === 'run') navigation.navigate('RunSetup');
  };

  return (
    <LightShell>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 16 }}>
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

        {/* Summary cards */}
        <View className="flex-row gap-2 mb-[14px]">
          <HSummaryCard label="총 거리" value="24.6" unit="km" trend="▲ 18%" />
          <HSummaryCard label="러닝 횟수" value="5" unit="회" trend="목표 5/5" trendGood />
          <HSummaryCard label="평균 폼" value="82" unit="점" trend="▲ 3pt" />
        </View>

        <DailyBarChart />

        {/* Section title */}
        <View className="flex-row justify-between items-baseline mt-4 mb-2">
          <View className="flex-row items-baseline gap-[6px]">
            <Text className="text-[14px] font-bold" style={{ color: '#1e1b4b' }}>러닝 목록</Text>
            <Text className="text-[11px] font-medium" style={{ color: '#9b8cc5' }}>5건</Text>
          </View>
          <Text className="text-[11px] text-purple-500 font-semibold">최신순 ▾</Text>
        </View>

        {/* Run list */}
        <View
          className="rounded-[16px] overflow-hidden"
          style={{
            backgroundColor: 'rgba(255,255,255,0.78)',
            borderWidth: 0.5,
            borderColor: 'rgba(124,58,237,0.12)',
          }}
        >
          <RunRow date="5월 3일" weekday="일" dist="5.24" time="28:42" pace={`5'29"`} form={84} pr />
          <RunDivider />
          <RunRow date="5월 1일" weekday="금" dist="6.40" time="36:14" pace={`5'40"`} form={80} />
          <RunDivider />
          <RunRow date="4월 30일" weekday="목" dist="3.80" time="22:04" pace={`5'48"`} form={78} />
          <RunDivider />
          <RunRow date="4월 29일" weekday="수" dist="4.20" time="23:40" pace={`5'38"`} form={82} />
          <RunDivider />
          <RunRow date="4월 28일" weekday="화" dist="5.00" time="27:30" pace={`5'30"`} form={86} />
        </View>
      </ScrollView>
      <RSTabBar active="log" onChange={handleTabPress} />
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
}

const RunRow = ({ date, weekday, dist, time, pace, form, pr }: RunRowProps) => {
  const formColor = form >= 85 ? '#10b981' : form >= 80 ? '#7c3aed' : '#f59e0b';
  return (
    <View className="flex-row items-center gap-3 px-[14px] py-[13px]">
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
    </View>
  );
};

const RunDivider = () => <View className="h-px mx-[14px]" style={{ backgroundColor: 'rgba(124,58,237,0.12)' }} />;
