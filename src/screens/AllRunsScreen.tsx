import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { LightShell } from '@/components/domain';
import { gradients } from '@/theme/tokens';

import type { ScreenProps } from '@/types/navigation';

interface Run {
  date: string;
  day: string;
  dist: string;
  time: string;
  pace: string;
  form: number;
  hr: number;
  type: string;
}

const RUNS: Run[] = [
  { date: '오늘', day: '월', dist: '5.24', time: '28:42', pace: `5'29"`, form: 84, hr: 154, type: 'Z3 템포' },
  { date: '5/12', day: '토', dist: '5.20', time: '28:42', pace: `5'31"`, form: 82, hr: 152, type: 'Z2 유산소' },
  { date: '5/10', day: '목', dist: '3.80', time: '22:04', pace: `5'48"`, form: 78, hr: 148, type: 'Z2 회복' },
  { date: '5/8', day: '화', dist: '5.00', time: '27:30', pace: `5'30"`, form: 80, hr: 150, type: 'Z2 유산소' },
  { date: '5/5', day: '토', dist: '10.20', time: '55:18', pace: `5'25"`, form: 86, hr: 158, type: '롱런' },
  { date: '5/3', day: '목', dist: '4.50', time: '24:30', pace: `5'27"`, form: 81, hr: 151, type: 'Z3 템포' },
  { date: '5/1', day: '화', dist: '5.10', time: '28:00', pace: `5'29"`, form: 79, hr: 149, type: 'Z2 유산소' },
];

const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'week', label: '이번 주' },
  { id: 'month', label: '이번 달' },
  { id: 'year', label: '올해' },
  { id: 'long', label: '롱런' },
  { id: 'tempo', label: 'Z3 템포' },
];

export const AllRunsScreen = ({ navigation }: ScreenProps<'AllRuns'>) => {
  const [filter, setFilter] = useState('all');

  return (
    <LightShell>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 12 }}>
        <View className="flex-row items-center gap-[10px] pt-1 pb-[14px]">
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-[34px] h-[34px] rounded-[11px] items-center justify-center"
            style={{
              backgroundColor: 'rgba(255,255,255,0.8)',
              borderWidth: 0.5,
              borderColor: 'rgba(124,58,237,0.18)',
            }}
          >
            <Text className="text-purple-500 text-[14px] font-bold">←</Text>
          </Pressable>
          <View>
            <Text className="text-[10px] font-bold tracking-[0.8px] uppercase" style={{ color: '#7c6bb5' }}>
              {RUNS.length}회의 기록
            </Text>
            <Text className="text-[20px] font-bold mt-[2px] tracking-[-0.6px]" style={{ color: '#1e1b4b' }}>내 러닝</Text>
          </View>
        </View>

        {/* Summary banner */}
        <LinearGradient
          colors={['#7c3aed', '#6d28d9', '#3b82f6']}
          locations={[0, 0.4, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 12 }}
        >
          <Text className="text-[10px] tracking-[0.8px] uppercase font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>
            이번 달 누적
          </Text>
          <View className="flex-row items-baseline gap-[6px] mt-[6px]">
            <Text className="text-[38px] font-bold text-white tracking-[-1.52px] leading-[40px]">39.04</Text>
            <Text className="text-[14px] font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>km</Text>
          </View>
          <View className="flex-row gap-2 mt-[14px]">
            <SumStat value={String(RUNS.length)} label="총 러닝" />
            <SumStat value="3:34:46" label="총 시간" />
            <SumStat value={`5'30"`} label="평균 페이스" />
          </View>
        </LinearGradient>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3"
          contentContainerStyle={{ gap: 6 }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            if (active) {
              return (
                <Pressable key={f.id} onPress={() => setFilter(f.id)}>
                  <LinearGradient
                    colors={gradients.action}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 }}
                  >
                    <Text className="text-white text-[12px] font-bold">{f.label}</Text>
                  </LinearGradient>
                </Pressable>
              );
            }
            return (
              <Pressable
                key={f.id}
                onPress={() => setFilter(f.id)}
                className="px-[14px] py-[7px] rounded-full"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.78)',
                  borderWidth: 0.5,
                  borderColor: 'rgba(124,58,237,0.14)',
                }}
              >
                <Text className="text-purple-500 text-[12px] font-bold">{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <SectionTitle>이번 주</SectionTitle>
        <BigRunCard {...RUNS[0]} featured />
        <BigRunCard {...RUNS[1]} />

        <SectionTitle>지난 주</SectionTitle>
        {RUNS.slice(2, 5).map((r, i) => (
          <BigRunCard key={i} {...r} />
        ))}

        <SectionTitle>그 이전</SectionTitle>
        {RUNS.slice(5).map((r, i) => (
          <BigRunCard key={i} {...r} />
        ))}
      </ScrollView>
    </LightShell>
  );
};

const SumStat = ({ value, label }: { value: string; label: string }) => (
  <View className="flex-1">
    <Text className="text-[16px] font-bold text-white tracking-[-0.32px] leading-5">{value}</Text>
    <Text className="text-[9px] font-semibold mt-[3px] tracking-[0.54px] uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>
      {label}
    </Text>
  </View>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Text
    className="text-[10px] font-bold tracking-[0.8px] uppercase mt-[10px] mb-2"
    style={{ color: '#7c6bb5' }}
  >
    {children}
  </Text>
);

const BigRunCard = ({ date, day, dist, time, pace, form, hr, type, featured }: Run & { featured?: boolean }) => {
  const formColor = form >= 84 ? '#10b981' : form >= 80 ? '#7c3aed' : '#f59e0b';
  const body = (
    <View className="p-[14px]">
      <View className="flex-row justify-between items-center mb-2">
        <View className="flex-row items-center gap-[10px]">
          {featured ? (
            <LinearGradient
              colors={gradients.action}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text className="text-[11px] font-bold text-white">{date}</Text>
              <Text className="text-[9px] mt-[1px]" style={{ color: 'rgba(255,255,255,0.75)' }}>({day})</Text>
            </LinearGradient>
          ) : (
            <View
              className="w-[44px] h-[44px] rounded-[13px] items-center justify-center"
              style={{
                backgroundColor: 'rgba(124,58,237,0.08)',
                borderWidth: 0.5,
                borderColor: 'rgba(124,58,237,0.14)',
              }}
            >
              <Text className="text-[11px] font-bold text-purple-500">{date}</Text>
              <Text className="text-[9px] text-purple-500 opacity-75 mt-[1px]">({day})</Text>
            </View>
          )}
          <View>
            <View className="flex-row items-baseline gap-[5px]">
              <Text className="text-[22px] font-bold tracking-[-0.66px] leading-[28px]" style={{ color: '#1e1b4b' }}>{dist}</Text>
              <Text className="text-[11px] font-semibold" style={{ color: '#9b8cc5' }}>km</Text>
            </View>
            <View className="flex-row items-center gap-[6px] mt-1">
              <Text className="text-[11px] font-semibold" style={{ color: '#6b5ca5' }}>{time}</Text>
              <View className="w-[3px] h-[3px] rounded-full bg-purple-200" />
              <View
                className="px-[7px] py-[2px] rounded-full"
                style={{ backgroundColor: 'rgba(124,58,237,0.08)' }}
              >
                <Text className="text-[10px] text-purple-500 font-bold">{type}</Text>
              </View>
            </View>
          </View>
        </View>
        <View
          className="w-7 h-7 rounded-[9px] items-center justify-center"
          style={{
            backgroundColor: 'rgba(124,58,237,0.06)',
            borderWidth: 0.5,
            borderColor: 'rgba(124,58,237,0.1)',
          }}
        >
          <Text className="text-purple-500 text-[14px]">›</Text>
        </View>
      </View>

      <View className="flex-row gap-[6px]">
        <RunChip label="페이스" value={pace} color="#7c3aed" />
        <RunChip label="폼" value={String(form)} color={formColor} />
        <RunChip label="평균 심박" value={String(hr)} unit="bpm" color="#7c3aed" />
      </View>
    </View>
  );

  if (featured) {
    return (
      <LinearGradient
        colors={['rgba(124,58,237,0.06)', 'rgba(59,130,246,0.04)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(124,58,237,0.22)' }}
      >
        {body}
      </LinearGradient>
    );
  }
  return (
    <View
      className="rounded-[16px] mb-2"
      style={{
        backgroundColor: 'rgba(255,255,255,0.78)',
        borderWidth: 0.5,
        borderColor: 'rgba(124,58,237,0.1)',
      }}
    >
      {body}
    </View>
  );
};

const RunChip = ({ label, value, unit, color }: { label: string; value: string; unit?: string; color: string }) => (
  <View
    className="flex-1 rounded-[9px] px-[6px] py-[7px] items-center"
    style={{
      backgroundColor: 'rgba(255,255,255,0.6)',
      borderWidth: 0.5,
      borderColor: 'rgba(124,58,237,0.06)',
    }}
  >
    <Text className="text-[9px] font-semibold tracking-[0.54px] uppercase" style={{ color: '#9b8cc5' }}>{label}</Text>
    <View className="flex-row items-baseline mt-[3px]">
      <Text className="text-[13px] font-bold" style={{ color }}>{value}</Text>
      {unit && <Text className="text-[9px] ml-[2px] font-medium" style={{ color: '#9b8cc5' }}>{unit}</Text>}
    </View>
  </View>
);
