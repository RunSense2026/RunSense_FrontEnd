import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';

import { RSTabBar, type TabId } from '@/components/domain';

import type { HomeScreenProps } from '@/types/navigation';

// ═════════════════════════════════════════════════════════════
// HOME SCREEN — Light theme, purple+blue accents
// Ported from home-screen.jsx
// ═════════════════════════════════════════════════════════════
export const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const handleTabPress = (id: TabId) => {
    if (id === 'run') navigation.navigate('RunSetup');
    else if (id === 'course') navigation.navigate('Course');
    else if (id === 'log') navigation.navigate('History');
    else if (id === 'settings') navigation.navigate('Settings');
  };

  return (
    <View className="flex-1 bg-[#f6f3ff]">
      <LinearGradient
        colors={['#f6f3ff', '#eef0ff', '#e8eeff', '#f4f0ff']}
        start={{ x: 0.9, y: 0 }}
        end={{ x: 0.1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Ambient bg orbs (no blur — RN doesn't support filter:blur natively) */}
      <View
        className="absolute -top-[60px] -right-[60px] w-[220px] h-[220px] rounded-full opacity-60"
        style={{ backgroundColor: 'rgba(167,139,250,0.18)' }}
      />
      <View
        className="absolute top-[220px] -left-[60px] w-[180px] h-[180px] rounded-full opacity-60"
        style={{ backgroundColor: 'rgba(96,165,250,0.18)' }}
      />

      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center pt-[6px] pb-[14px]">
            <View>
              <Text className="text-[12px] font-medium" style={{ color: '#6b5ca5' }}>좋은 아침이에요 ☀️</Text>
              <Text className="text-[24px] font-bold mt-[2px] tracking-[-0.72px]" style={{ color: '#1e1b4b' }}>
                오늘도 뛰어볼까요?
              </Text>
            </View>
            <LinearGradient
              colors={['#7c3aed', '#3b82f6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text className="text-white font-bold text-[14px]">진우</Text>
            </LinearGradient>
          </View>

          <AirWeatherCard />
          <CourseBanner onPress={() => navigation.navigate('Course')} />
          <WeeklyGoalCard onPress={() => navigation.navigate('WeeklyGoalSetup')} />

          {/* Recent runs section header */}
          <View className="flex-row justify-between items-baseline mt-[18px] mb-[10px]">
            <Text className="text-[16px] font-bold tracking-[-0.32px]" style={{ color: '#1e1b4b' }}>
              최근 러닝
            </Text>
            <Pressable onPress={() => navigation.navigate('AllRuns')}>
              <Text className="text-[12px] text-purple-500 font-semibold">전체 보기 →</Text>
            </Pressable>
          </View>

          <RecentRunCard date="오늘" weekday="월" featured dist="5.24" time="28:42" pace="5'29&quot;" form={84} hr={154} />
          <RecentRunCard date="4월 12일" weekday="토" dist="5.20" time="28:42" pace="5'31&quot;" form={82} hr={152} />
          <RecentRunCard date="4월 10일" weekday="목" dist="3.80" time="22:04" pace="5'48&quot;" form={78} hr={148} />
          <RecentRunCard date="4월 8일" weekday="화" dist="5.00" time="27:30" pace="5'30&quot;" form={80} hr={150} />
        </ScrollView>
        <RSTabBar active="home" onChange={handleTabPress} />
      </SafeAreaView>
    </View>
  );
};

// ─── Air quality + weather card ──────────────────────────────────
const AirWeatherCard = () => (
  <View
    className="rounded-[20px] px-4 pt-4 pb-[14px] mb-3"
    style={{
      backgroundColor: 'rgba(255,255,255,0.72)',
      borderWidth: 0.5,
      borderColor: 'rgba(124,58,237,0.14)',
    }}
  >
    <View className="flex-row justify-between items-start">
      <View>
        <Text className="text-[11px] tracking-[0.66px] uppercase font-semibold" style={{ color: '#7c6bb5' }}>
          서울 · 강남구
        </Text>
        <View className="flex-row items-baseline gap-[6px] mt-[6px]">
          <Text className="text-[36px] font-bold tracking-[-1.44px] leading-[44px]" style={{ color: '#1e1b4b' }}>18°</Text>
          <Text className="text-[13px] font-medium" style={{ color: '#6b5ca5' }}>맑음 · 체감 17°</Text>
        </View>
      </View>
      <View className="w-[60px] h-[60px] relative">
        <LinearGradient
          colors={['#fbbf24', '#f59e0b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 8, right: 8, width: 36, height: 36, borderRadius: 18 }}
        />
        <View
          className="absolute bottom-[6px] left-1 w-[30px] h-[14px] rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}
        />
      </View>
    </View>

    {/* AQI bar */}
    <LinearGradient
      colors={['rgba(110,231,183,0.16)', 'rgba(59,130,246,0.1)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ marginTop: 10, padding: 12, borderRadius: 14, borderWidth: 0.5, borderColor: 'rgba(16,185,129,0.2)' }}
    >
      <View className="flex-row justify-between items-center">
        <View>
          <Text className="text-[10px] font-bold tracking-[0.6px] uppercase" style={{ color: '#059669' }}>
            대기질 좋음
          </Text>
          <View className="flex-row items-baseline gap-[5px] mt-[3px]">
            <Text className="text-[18px] font-bold tracking-[-0.36px]" style={{ color: '#065f46' }}>32</Text>
            <Text className="text-[11px] font-medium" style={{ color: '#047857' }}>PM2.5 ㎍/㎥</Text>
          </View>
        </View>
        <View
          className="flex-row items-center gap-[6px] px-[10px] py-[5px] rounded-full"
          style={{ backgroundColor: 'rgba(16,185,129,0.18)' }}
        >
          <View className="w-[6px] h-[6px] rounded-full bg-good-2" />
          <Text className="text-[11px] font-bold" style={{ color: '#047857' }}>야외 OK</Text>
        </View>
      </View>
      {/* AQI scale */}
      <View className="relative h-[5px] mt-[10px] rounded-[3px] flex-row">
        <View className="flex-1 bg-good-2 rounded-l-[3px]" />
        <View className="flex-1 bg-warn" />
        <View className="flex-1" style={{ backgroundColor: '#f59e0b' }} />
        <View className="flex-1 bg-bad-2 rounded-r-[3px]" />
        <View
          className="absolute w-[10px] h-[10px] rounded-full bg-white"
          style={{
            top: -3,
            left: '10%',
            borderWidth: 1.5,
            borderColor: '#10b981',
          }}
        />
      </View>
    </LinearGradient>

    {/* Stats row */}
    <View className="flex-row gap-[10px] mt-[10px]">
      <MiniWeather label="습도" value="45%" />
      <MiniWeather label="바람" value="2 m/s" />
      <MiniWeather label="자외선" value="낮음" tone="good" />
    </View>
  </View>
);

const MiniWeather = ({ label, value, tone }: { label: string; value: string; tone?: 'good' }) => (
  <View className="flex-1 items-center">
    <Text className="text-[10px] font-semibold tracking-[0.6px] uppercase" style={{ color: '#9b8cc5' }}>
      {label}
    </Text>
    <Text
      className="text-[14px] font-bold mt-[3px] tracking-[-0.14px]"
      style={{ color: tone === 'good' ? '#059669' : '#1e1b4b' }}
    >
      {value}
    </Text>
  </View>
);

// ─── Course recommendation banner ────────────────────────────────
const CourseBanner = ({ onPress }: { onPress: () => void }) => (
  <Pressable onPress={onPress}>
    <LinearGradient
      colors={['#7c3aed', '#6d28d9', '#3b82f6']}
      locations={[0, 0.4, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ overflow: 'hidden', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16, marginBottom: 12 }}
    >
      <Svg style={{ position: 'absolute', right: -10, top: -10, opacity: 0.22 }} width={160} height={160} viewBox="0 0 160 160">
        <Path d="M20 140 Q40 80 80 100 T140 30" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeDasharray="4 6" fill="none" />
        <Circle cx={20} cy={140} r={5} fill="#fff" />
        <Circle cx={140} cy={30} r={5} fill="#fff" />
      </Svg>

      <View>
        <View
          className="self-start px-[10px] py-[3px] rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
        >
          <Text className="text-[10px] text-white font-bold tracking-[0.6px]">✦ 오늘의 추천 코스</Text>
        </View>
        <Text className="text-[19px] font-bold text-white mt-[10px] tracking-[-0.38px]">한강공원 산책로</Text>
        <Text className="text-[12px] mt-1 leading-[18px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
          오늘 대기질이 좋아요. 강변 평지 코스를 추천드려요.
        </Text>

        <View className="flex-row justify-end mt-[14px]">
          <View className="bg-white px-[18px] py-[9px] rounded-full">
            <Text className="text-purple-500 text-[13px] font-bold">시작하기 →</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  </Pressable>
);

// ─── Weekly goal card ────────────────────────────────────────────
const WeeklyGoalCard = ({ onPress }: { onPress: () => void }) => {
  const pct = 0.62;
  const days = ['월', '화', '수', '목', '금', '토', '일'] as const;
  const done = [true, true, false, true, false, true, false];
  const todayIdx = 3;

  return (
    <Pressable
      onPress={onPress}
      className="rounded-[20px] px-4 py-[14px]"
      style={{
        backgroundColor: 'rgba(255,255,255,0.72)',
        borderWidth: 0.5,
        borderColor: 'rgba(124,58,237,0.14)',
      }}
    >
      <View className="flex-row justify-between items-center">
        <View>
          <Text className="text-[11px] tracking-[0.66px] uppercase font-semibold" style={{ color: '#7c6bb5' }}>
            이번 주 목표
          </Text>
          <View className="flex-row items-baseline gap-1 mt-1">
            <Text className="text-[22px] font-bold tracking-[-0.66px] leading-[28px]" style={{ color: '#1e1b4b' }}>12.4</Text>
            <Text className="text-[12px] font-medium" style={{ color: '#9b8cc5' }}>/ 20 km</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-[22px] font-bold text-purple-500 tracking-[-0.44px] leading-[28px]">62%</Text>
          <Text className="text-[10px] font-semibold mt-[3px]" style={{ color: '#9b8cc5' }}>7.6 km 남음</Text>
        </View>
      </View>

      {/* progress bar */}
      <View
        className="mt-3 h-2 rounded overflow-hidden"
        style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
      >
        <LinearGradient
          colors={['#7c3aed', '#3b82f6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: '100%', width: `${pct * 100}%`, borderRadius: 4 }}
        />
      </View>

      {/* 7-day dots */}
      <View className="flex-row justify-between mt-3">
        {days.map((d, i) => {
          const isDone = done[i];
          const isToday = i === todayIdx;
          return (
            <View key={d} className="items-center gap-1">
              {isDone ? (
                <LinearGradient
                  colors={['#7c3aed', '#3b82f6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text className="text-white text-[10px] font-bold">✓</Text>
                </LinearGradient>
              ) : (
                <View
                  className="w-[26px] h-[26px] rounded-[13px] items-center justify-center"
                  style={{
                    borderWidth: isToday ? 1.5 : 1,
                    borderStyle: isToday ? 'dashed' : 'solid',
                    borderColor: isToday ? '#7c3aed' : 'rgba(124,58,237,0.18)',
                  }}
                >
                  <Text className="text-[10px] font-bold" style={{ color: '#9b8cc5' }}>{isToday ? '·' : ''}</Text>
                </View>
              )}
              <Text
                className={`text-[10px] ${isToday ? 'font-bold' : 'font-medium'}`}
                style={{ color: isToday ? '#7c3aed' : '#9b8cc5' }}
              >
                {d}
              </Text>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
};

// ─── Recent run card ─────────────────────────────────────────────
interface RecentRunCardProps {
  date: string;
  weekday: string;
  dist: string;
  time: string;
  pace: string;
  form: number;
  hr: number;
  featured?: boolean;
}

const RecentRunCard = ({ date, weekday, dist, time, pace, form, hr, featured }: RecentRunCardProps) => {
  const body = (
    <>
      <View className="flex-row justify-between items-center mb-[10px]">
        <View className="flex-row items-center gap-2">
          {featured ? (
            <LinearGradient
              colors={['#7c3aed', '#3b82f6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
            >
              <RunGlyph color="#fff" />
            </LinearGradient>
          ) : (
            <View
              className="w-9 h-9 rounded-[12px] items-center justify-center"
              style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
            >
              <RunGlyph color="#7c3aed" />
            </View>
          )}
          <View>
            <Text className="text-[14px] font-bold" style={{ color: '#1e1b4b' }}>
              {date} <Text className="text-[11px] font-medium" style={{ color: '#9b8cc5' }}>({weekday})</Text>
            </Text>
            <Text className="text-[11px] mt-[2px] font-medium" style={{ color: '#6b5ca5' }}>
              {dist} km · {time}
            </Text>
          </View>
        </View>
        {featured && (
          <LinearGradient
            colors={['#7c3aed', '#3b82f6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}
          >
            <Text className="text-[9px] text-white font-bold tracking-[0.54px]">최신</Text>
          </LinearGradient>
        )}
      </View>

      <View className="flex-row gap-[6px]">
        <RunMini label="페이스" value={pace} />
        <RunMini label="폼" value={String(form)} accent={form >= 80 ? '#10b981' : '#f59e0b'} />
        <RunMini label="평균 심박" value={String(hr)} unit="bpm" />
      </View>
    </>
  );

  if (featured) {
    return (
      <LinearGradient
        colors={['rgba(124,58,237,0.06)', 'rgba(59,130,246,0.04)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 16,
          padding: 14,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: 'rgba(124,58,237,0.22)',
        }}
      >
        {body}
      </LinearGradient>
    );
  }

  return (
    <View
      className="rounded-[16px] p-[14px] mb-2"
      style={{
        backgroundColor: 'rgba(255,255,255,0.72)',
        borderWidth: 0.5,
        borderColor: 'rgba(124,58,237,0.1)',
      }}
    >
      {body}
    </View>
  );
};

const RunGlyph = ({ color }: { color: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx={14} cy={4.5} r={1.6} fill={color} />
    <Path d="M9 21l3-7-3-2 2-5 5 2 3 4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

interface RunMiniProps {
  label: string;
  value: string;
  unit?: string;
  accent?: string;
}
const RunMini = ({ label, value, unit, accent }: RunMiniProps) => (
  <View
    className="flex-1 rounded-[10px] py-2 px-[6px] items-center"
    style={{
      backgroundColor: 'rgba(255,255,255,0.6)',
      borderWidth: 0.5,
      borderColor: 'rgba(124,58,237,0.06)',
    }}
  >
    <Text className="text-[9px] font-semibold tracking-[0.54px] uppercase" style={{ color: '#9b8cc5' }}>
      {label}
    </Text>
    <View className="flex-row items-baseline mt-[3px]">
      <Text className="text-[14px] font-bold" style={{ color: accent ?? '#7c3aed' }}>{value}</Text>
      {unit && <Text className="text-[9px] ml-[2px] font-medium" style={{ color: '#9b8cc5' }}>{unit}</Text>}
    </View>
  </View>
);
