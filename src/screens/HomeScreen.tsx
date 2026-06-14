import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';

import { fetchWeatherData, fetchAirQualityData, reverseGeocodeKo } from '@/api';
import { ensureLocationPermission, getCurrentPosition } from '@/utils/geo';
import { latLonToGrid } from '@/utils/kmaGrid';
import { DEFAULT_LOCATION } from '@/constants/location';
import type { WeatherItem } from '@/types/publicApi';
import type { HomeScreenProps } from '@/types/navigation';

// ═════════════════════════════════════════════════════════════
// HOME SCREEN — Light theme, purple+blue accents
// Ported from home-screen.jsx
// ═════════════════════════════════════════════════════════════
export const HomeScreen = ({ navigation }: HomeScreenProps) => {
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
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16 }}
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
            <Pressable onPress={() => navigation.navigate('History')}>
              <Text className="text-[12px] text-purple-500 font-semibold">전체 보기 →</Text>
            </Pressable>
          </View>

          <RecentRunCard date="오늘" weekday="월" featured dist="5.24" time="28:42" pace="5'29&quot;" form={84} hr={154} />
          <RecentRunCard date="4월 12일" weekday="토" dist="5.20" time="28:42" pace="5'31&quot;" form={82} hr={152} />
          <RecentRunCard date="4월 10일" weekday="목" dist="3.80" time="22:04" pace="5'48&quot;" form={78} hr={148} />
          <RecentRunCard date="4월 8일" weekday="화" dist="5.00" time="27:30" pace="5'30&quot;" form={80} hr={150} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// ─── Air quality + weather card ──────────────────────────────────
const AirWeatherCard = () => {
  const [weatherItems, setWeatherItems] = useState<WeatherItem[]>([]);
  const [airData, setAirData] = useState<{ value: string; label: string; color: string; badgeBg: string } | null>(null);
  const [locationName, setLocationName] = useState<string>(DEFAULT_LOCATION.NAME);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getPublicData = async () => {
      // 1) GPS 로 실제 위치 해석 → 기상청 격자/측정소/지역명. (실패 시 기본 위치로 폴백)
      let nx: number = DEFAULT_LOCATION.NX;
      let ny: number = DEFAULT_LOCATION.NY;
      let station: string = DEFAULT_LOCATION.STATION_NAME;
      try {
        if (await ensureLocationPermission()) {
          const { lat, lon } = await getCurrentPosition();
          const grid = latLonToGrid(lat, lon);
          nx = grid.nx;
          ny = grid.ny;
          const place = await reverseGeocodeKo(lat, lon).catch(() => null);
          if (place) {
            setLocationName(place.name);
            if (place.gu) station = place.gu;
          }
        }
      } catch {
        // GPS/역지오코딩 실패 → 기본 위치(강남구)로 조회
      }

      // 2) 해석된 위치로 날씨/대기질 조회
      try {
        const [weather, air] = await Promise.all([
          fetchWeatherData(nx, ny),
          fetchAirQualityData(station),
        ]);

        setWeatherItems(weather);

        // 에어코리아 등급(1:좋음, 2:보통, 3:나쁨, 4:매우나쁨)에 따른 UI 매핑
        if (air) {
          const grade = air.pm25Grade || air.khaiGrade || '2';
          let label = '보통';
          let color = '#059669'; // 기본 색상 (초록)
          let badgeBg = 'rgba(16,185,129,0.15)';

          if (grade === '1') { label = '최고'; }
          else if (grade === '2') { label = '야외 OK'; }
          else if (grade === '3') { label = '주의'; color = '#f59e0b'; badgeBg = 'rgba(245,158,11,0.15)'; }
          else if (grade === '4') { label = '야외 자제'; color = '#ef4444'; badgeBg = 'rgba(239,68,68,0.15)'; }

          // 초미세먼지(PM2.5) 데이터가 통신 장애나 점검으로 인해 '-'로 올 경우 미세먼지(PM10) 데이터로 대체합니다.
          let displayValue = air.pm25Value;
          if (!displayValue || displayValue === '-') {
            displayValue = (air.pm10Value && air.pm10Value !== '-') ? air.pm10Value : '-';
          }

          setAirData({
            value: displayValue,
            label,
            color,
            badgeBg,
          });
        }
      } catch (error) {
        setError('날씨/대기질 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    getPublicData();
  }, []);

  // 로딩 중일 때 스켈레톤 UI 또는 ActivityIndicator 표시
  if (loading) {
    return (
      <View className="rounded-[20px] p-[16px] mb-3 h-[230px] justify-center items-center" style={{ backgroundColor: 'rgba(255,255,255,0.72)' }}>
        <ActivityIndicator color="#7c3aed" />
        <Text className="text-[12px] font-medium mt-2" style={{ color: '#9b8cc5' }}>날씨 정보 로딩 중...</Text>
      </View>
    );
  }

  // 에러 발생 시 에러 메시지 표시
  if (error) {
    return (
      <View className="rounded-[20px] p-[16px] mb-3 h-[230px] justify-center items-center" style={{ backgroundColor: 'rgba(255,255,255,0.72)' }}>
        <Text className="text-[13px] font-medium" style={{ color: '#ef4444' }}>{error}</Text>
      </View>
    );
  }

  // 기온(T1H), 습도(REH), 풍속(WSD) 카테고리 매핑 (데이터가 없을 시 기존 하드코딩 값 유지)
  const temp = weatherItems.find((i) => i.category === 'T1H')?.obsrValue ?? '18';
  const humidity = weatherItems.find((i) => i.category === 'REH')?.obsrValue ?? '45';
  const wind = weatherItems.find((i) => i.category === 'WSD')?.obsrValue ?? '2';

  // 대기질 매핑 (데이터가 없을 시 기존 하드코딩 값 유지)
  const airValue = airData?.value ?? '32';
  const airLabel = airData?.label ?? '야외 OK';
  const airColor = airData?.color ?? '#059669';
  const airBadgeBg = airData?.badgeBg ?? 'rgba(16,185,129,0.15)';

  return (
    <View
      className="rounded-[20px] p-[16px] mb-3"
      style={{
        backgroundColor: 'rgba(255,255,255,0.72)',
        borderWidth: 0.5,
        borderColor: 'rgba(124,58,237,0.14)',
      }}
    >
    {/* 3, 4, 5번 영역: 지역, 온도, 날씨 및 아이콘 */}
    <View className="flex-row justify-between items-start">
      <View>
        <Text className="text-[12px] font-semibold" style={{ color: '#9b8cc5' }}>
          {locationName}
        </Text>
        <View className="flex-row items-baseline gap-[8px] mt-[6px]">
          <Text className="text-[44px] font-bold tracking-[-1.5px] leading-[50px]" style={{ color: '#1e1b4b' }}>{temp}°</Text>
          <Text className="text-[14px] font-medium" style={{ color: '#9b8cc5' }}>맑음</Text>
        </View>
      </View>
      <View className="w-[60px] h-[60px] relative justify-center items-center">
        <LinearGradient
          colors={['#fbbf24', '#f59e0b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 44, height: 44, borderRadius: 22 }}
        />
        <View
          className="absolute bottom-[8px] left-[0px] w-[32px] h-[16px] rounded-full"
          style={{ backgroundColor: '#ffffff' }}
        />
      </View>
    </View>

    {/* 6, 7, 8번 영역: 대기질, 습도, 바람 카드 */}
    <View className="flex-row gap-[10px] mt-[16px]">
      {/* 6, 7번: 대기질 카드 */}
      <View
        className="flex-1 rounded-[14px] py-[12px] items-center"
        style={{
          backgroundColor: 'rgba(16,185,129,0.05)',
          borderWidth: 1,
          borderColor: 'rgba(16,185,129,0.3)',
        }}
      >
        <Text className="text-[11px] font-semibold" style={{ color: '#059669' }}>대기질</Text>
        <Text className="text-[22px] font-bold mt-[2px]" style={{ color: airColor }}>{airValue}</Text>
        <Text className="text-[9px] font-medium mt-[2px]" style={{ color: '#059669' }}>PM2.5 ug/m2</Text>
        <View
          className="flex-row items-center gap-[4px] px-[10px] py-[4px] rounded-full mt-[6px]"
          style={{ backgroundColor: airBadgeBg }}
        >
          <View className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: airColor }} />
          <Text className="text-[9px] font-bold" style={{ color: airColor }}>{airLabel}</Text>
        </View>
      </View>

      {/* 8번: 습도 카드 */}
      <View
        className="flex-1 rounded-[14px] py-[12px] items-center justify-center"
        style={{
          backgroundColor: 'rgba(124,58,237,0.02)',
          borderWidth: 1,
          borderColor: 'rgba(124,58,237,0.15)',
        }}
      >
        <Text className="text-[11px] font-semibold" style={{ color: '#9b8cc5' }}>습도</Text>
        <Text className="text-[18px] font-bold mt-[6px]" style={{ color: '#1e1b4b' }}>{humidity}%</Text>
      </View>

      {/* 바람 카드 */}
      <View
        className="flex-1 rounded-[14px] py-[12px] items-center justify-center"
        style={{
          backgroundColor: 'rgba(124,58,237,0.02)',
          borderWidth: 1,
          borderColor: 'rgba(124,58,237,0.15)',
        }}
      >
        <Text className="text-[11px] font-semibold" style={{ color: '#9b8cc5' }}>바람</Text>
        <Text className="text-[18px] font-bold mt-[6px]" style={{ color: '#1e1b4b' }}>{wind} m/s</Text>
      </View>
    </View>
  </View>
  );
};

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