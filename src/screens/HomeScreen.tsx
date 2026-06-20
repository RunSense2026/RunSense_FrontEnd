import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';

import { fetchWeatherData, fetchAirQualityData, fetchSkyCode, readAllRuns, readRunsByDate } from '@/api';
import { WeatherIcon, deriveWeatherCondition, findPty, conditionLabel, type WeatherCondition } from '@/components/domain';
import { useResolvedLocation } from '@/hooks/useResolvedLocation';
import { useAuthStore } from '@/stores/authStore';
import { useWeeklyGoalStore } from '@/stores/weeklyGoalStore';
import type { WeatherItem } from '@/types/publicApi';
import type { RunningActivityResponseDto } from '@/types/api';
import type { HomeScreenProps } from '@/types/navigation';

// ═════════════════════════════════════════════════════════════
// HOME SCREEN — Light theme, purple+blue accents
// Ported from home-screen.jsx
// ═════════════════════════════════════════════════════════════
// 현재 시각으로 아침/오후/저녁/밤 인사말
const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return '좋은 아침이에요 ☀️';
  if (h >= 12 && h < 18) return '좋은 오후예요 🌤️';
  if (h >= 18 && h < 22) return '좋은 저녁이에요 🌙';
  return '편안한 밤이에요 🌙';
};

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const userName = useAuthStore((s) => s.userName);
  const [refreshKey, setRefreshKey] = useState(0);

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
            <View className="flex-1 mr-2">
              <Text className="text-[12px] font-medium" style={{ color: '#6b5ca5' }}>{getGreeting()}</Text>
              <Text className="text-[24px] font-bold mt-[2px] tracking-[-0.72px]" style={{ color: '#1e1b4b' }}>
                오늘도 뛰어볼까요?
              </Text>
            </View>
            <View className="flex-row items-center gap-[10px]">
              <Pressable
                onPress={() => setRefreshKey((k) => k + 1)}
                className="w-9 h-9 rounded-[12px] items-center justify-center"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  borderWidth: 0.5,
                  borderColor: 'rgba(124,58,237,0.14)',
                }}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.7 1 6.4 2.6L21 3" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M21 3v6h-6" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
              <LinearGradient
                colors={['#7c3aed', '#3b82f6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text className="text-white font-bold text-[14px]" numberOfLines={1}>{userName ?? '게스트'}</Text>
              </LinearGradient>
            </View>
          </View>

          <AirWeatherCard refreshKey={refreshKey} />
          <CourseBanner onPress={() => navigation.navigate('Course')} />
          <WeeklyGoalCard refreshKey={refreshKey} onPress={() => navigation.navigate('WeeklyGoalSetup')} />

          {/* Recent runs section header */}
          <View className="flex-row justify-between items-baseline mt-[18px] mb-[10px]">
            <Text className="text-[16px] font-bold tracking-[-0.32px]" style={{ color: '#1e1b4b' }}>
              최근 러닝
            </Text>
            <Pressable onPress={() => navigation.navigate('History')}>
              <Text className="text-[12px] text-purple-500 font-semibold">전체 보기 →</Text>
            </Pressable>
          </View>

          <RecentRunsList refreshKey={refreshKey} navigation={navigation} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// ─── Air quality + weather card ──────────────────────────────────
const AirWeatherCard = ({ refreshKey }: { refreshKey: number }) => {
  const [weatherItems, setWeatherItems] = useState<WeatherItem[]>([]);
  const [condition, setCondition] = useState<WeatherCondition>('sunny');
  const [airData, setAirData] = useState<{ value: string; label: string; color: string; badgeBg: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // GPS → 기상청 격자/에어코리아 측정소/표시 지역명 (실패 시 강남구 폴백)
  const { nx, ny, station, name: locationName, ready } = useResolvedLocation(refreshKey);

  useEffect(() => {
    // 위치 해석이 끝난 뒤에 날씨/대기질을 조회한다.
    if (!ready) return;

    let cancelled = false;
    const getPublicData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [weather, air, sky] = await Promise.all([
          fetchWeatherData(nx, ny),
          fetchAirQualityData(station),
          fetchSkyCode(nx, ny),
        ]);
        if (cancelled) return;

        setWeatherItems(weather);
        setCondition(deriveWeatherCondition(findPty(weather), sky));

        // 에어코리아 등급(1:좋음, 2:보통, 3:나쁨, 4:매우나쁨)에 따른 UI 매핑
        if (air) {
          // 초미세먼지(PM2.5) 데이터가 통신 장애나 점검으로 인해 '-'로 올 경우 미세먼지(PM10) 데이터로 대체합니다.
          let displayValue = air.pm25Value;
          if (!displayValue || displayValue === '-') {
            displayValue = (air.pm10Value && air.pm10Value !== '-') ? air.pm10Value : '-';
          }

          const numericVal = parseInt(displayValue, 10);
          let grade = '2';

          if (!isNaN(numericVal)) {
            if (numericVal <= 15) {
              grade = '1';
            } else if (numericVal <= 35) {
              grade = '2';
            } else if (numericVal <= 75) {
              grade = '3';
            } else {
              grade = '4';
            }
          } else {
            // 수치가 숫자가 아닐 시 API에서 온 등급 사용
            grade = air.pm25Grade || air.khaiGrade || '2';
          }

          let label = '보통';
          let color = '#059669'; // 기본 색상 (초록)
          let badgeBg = 'rgba(16,185,129,0.15)';

          if (grade === '1') { label = '최고'; }
          else if (grade === '2') { label = '야외 OK'; }
          else if (grade === '3') { label = '주의'; color = '#f59e0b'; badgeBg = 'rgba(245,158,11,0.15)'; }
          else if (grade === '4') { label = '야외 자제'; color = '#ef4444'; badgeBg = 'rgba(239,68,68,0.15)'; }

          setAirData({
            value: displayValue,
            label,
            color,
            badgeBg,
          });
        }
      } catch (error) {
        if (!cancelled) setError('날씨/대기질 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    getPublicData();
    return () => {
      cancelled = true;
    };
  }, [ready, nx, ny, station]);

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
  const sky = conditionLabel(condition);

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
          <Text className="text-[14px] font-medium" style={{ color: '#9b8cc5' }}>{sky}</Text>
        </View>
      </View>
      <View className="w-[60px] h-[60px] justify-center items-center">
        <WeatherIcon condition={condition} size={56} />
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
// Date → "YYYY-MM-DD"
const toYMD = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const WeeklyGoalCard = ({ refreshKey, onPress }: { refreshKey: number; onPress: () => void }) => {
  const targetKm = useWeeklyGoalStore((s) => s.targetKm);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [doneKm, setDoneKm] = useState(0);
  const [ranDays, setRanDays] = useState<boolean[]>([false, false, false, false, false, false, false]);

  const days = ['월', '화', '수', '목', '금', '토', '일'] as const;
  const todayIdx = (new Date().getDay() + 6) % 7; // 월=0 … 일=6

  // 이번 주(월~오늘) 러닝 합계·요일을 백엔드에서 가져온다.
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        setDoneKm(0);
        setRanDays([false, false, false, false, false, false, false]);
        return;
      }
      let cancelled = false;
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      readRunsByDate(toYMD(weekStart), toYMD(today))
        .then((res) => {
          if (cancelled) return;
          let sum = 0;
          const ran = [false, false, false, false, false, false, false];
          res.activities.forEach((a) => {
            sum += a.distance;
            const idx = (new Date(a.activityDate).getDay() + 6) % 7;
            ran[idx] = true;
          });
          setDoneKm(sum);
          setRanDays(ran);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [isAuthenticated, refreshKey]),
  );

  const pct = targetKm > 0 ? Math.min(1, doneKm / targetKm) : 0;
  const remaining = Math.max(0, targetKm - doneKm);

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
            <Text className="text-[22px] font-bold tracking-[-0.66px] leading-[28px]" style={{ color: '#1e1b4b' }}>{doneKm.toFixed(1)}</Text>
            <Text className="text-[12px] font-medium" style={{ color: '#9b8cc5' }}>/ {targetKm} km</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-[22px] font-bold text-purple-500 tracking-[-0.44px] leading-[28px]">{Math.round(pct * 100)}%</Text>
          <Text className="text-[10px] font-semibold mt-[3px]" style={{ color: '#9b8cc5' }}>{remaining.toFixed(1)} km 남음</Text>
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
          const isDone = ranDays[i];
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

// ─── Recent runs (실데이터, 최신 5개) ─────────────────────────────
const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// "2026-06-14T07:14:00" → "오늘" / "어제" / "6월 14일"
const formatRunDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

const weekdayOf = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : KO_WEEKDAYS[d.getDay()];
};

const RecentRunsList = ({ refreshKey, navigation }: { refreshKey: number; navigation: HomeScreenProps['navigation'] }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [runs, setRuns] = useState<RunningActivityResponseDto[] | null>(null);
  const [loading, setLoading] = useState(false);

  // 홈으로 돌아올 때마다 갱신 (새 러닝 저장 후 반영)
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        setRuns(null);
        return;
      }
      let cancelled = false;
      setLoading(true);
      readAllRuns()
        .then((res) => {
          if (cancelled) return;
          const latest = res.activities
            .slice()
            .sort((a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime())
            .slice(0, 5);
          setRuns(latest);
        })
        .catch(() => {
          if (!cancelled) setRuns([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [isAuthenticated, refreshKey]),
  );

  if (!isAuthenticated) return <EmptyRuns message="로그인하면 러닝 기록이 표시돼요." />;
  if (loading && !runs) {
    return (
      <View className="py-7 items-center">
        <ActivityIndicator color="#7c3aed" />
      </View>
    );
  }
  if (!runs || runs.length === 0) {
    return <EmptyRuns message="아직 러닝 기록이 없어요. 첫 러닝을 시작해보세요!" />;
  }

  return (
    <>
      {runs.map((r, i) => (
        <RecentRunCard
          key={r.activityId}
          featured={i === 0}
          date={formatRunDate(r.activityDate)}
          weekday={weekdayOf(r.activityDate)}
          dist={r.distance.toFixed(2)}
          time={r.time.replace(/^00:/, '')}
          pace={r.pace}
          form={r.formScore}
          onPress={() => navigation.navigate('Report', { activityId: r.activityId })}
        />
      ))}
    </>
  );
};

const EmptyRuns = ({ message }: { message: string }) => (
  <View
    className="rounded-[16px] py-7 px-4 items-center"
    style={{
      backgroundColor: 'rgba(255,255,255,0.6)',
      borderWidth: 0.5,
      borderColor: 'rgba(124,58,237,0.1)',
    }}
  >
    <Text className="text-[12px] font-medium text-center" style={{ color: '#9b8cc5' }}>{message}</Text>
  </View>
);

// ─── Recent run card ─────────────────────────────────────────────
interface RecentRunCardProps {
  date: string;
  weekday: string;
  dist: string;
  time: string;
  pace: string;
  form: number;
  hr?: number;
  featured?: boolean;
  onPress?: () => void;
}

const RecentRunCard = ({ date, weekday, dist, time, pace, form, hr, featured, onPress }: RecentRunCardProps) => {
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
        {hr != null && <RunMini label="평균 심박" value={String(hr)} unit="bpm" />}
      </View>
    </>
  );

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      {featured ? (
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
      ) : (
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
      )}
    </Pressable>
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