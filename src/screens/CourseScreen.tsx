import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, type DimensionValue } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';

import { LightShell } from '@/components/domain';
import { fetchWeatherData, fetchAirQualityData } from '@/api';
import { gradients } from '@/theme/tokens';
import { DEFAULT_LOCATION } from '@/constants/location';

import type { WeatherItem } from '@/types/publicApi';
import type { TabScreenProps } from '@/types/navigation';

export const CourseScreen = (_props: TabScreenProps<'Course'>) => {
  return (
    <LightShell>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16 }}>
        {/* Header */}
        <View className="flex-row justify-between items-start py-1 pb-[14px]">
          <View>
            <Text className="text-[11px] font-semibold tracking-[0.66px] uppercase" style={{ color: '#7c6bb5' }}>
              📍 {DEFAULT_LOCATION.NAME}
            </Text>
            <Text className="text-[22px] font-bold mt-1 tracking-[-0.66px]" style={{ color: '#1e1b4b' }}>
              오늘의 추천 코스
            </Text>
          </View>
          <Pressable
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
        </View>

        <AirQualityCard />
        <MapCard />

        <View className="flex-row justify-between items-baseline mt-[18px] mb-[10px]">
          <View className="flex-row items-baseline gap-[6px]">
            <Text className="text-[14px] font-bold" style={{ color: '#1e1b4b' }}>추천 코스</Text>
            <Text className="text-[11px] font-medium" style={{ color: '#9b8cc5' }}>3개</Text>
          </View>
          <Text className="text-[11px] text-purple-500 font-semibold">거리순 ▾</Text>
        </View>

        <CourseCard
          rank={1}
          name="한강공원 합정 산책로"
          desc="강변 따라 평탄한 직선 코스, 공기 흐름 좋음"
          score={94}
          best
        />
        <CourseCard
          rank={2}
          name="망원동 골목 코스"
          desc="조용한 주택가 도심 러닝, 신호 적음"
          score={82}
        />
        <CourseCard
          rank={3}
          name="월드컵공원 둘레길"
          desc="언덕 구간 포함 인터벌 추천, 흙길 일부"
          score={76}
        />

      </ScrollView>
    </LightShell>
  );
};

const AirQualityCard = () => {
  const [weatherItems, setWeatherItems] = useState<WeatherItem[]>([]);
  const [airData, setAirData] = useState<{ value: string; label: string; grade: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getCourseData = async () => {
      try {
        const [weather, air] = await Promise.all([
          fetchWeatherData(DEFAULT_LOCATION.NX, DEFAULT_LOCATION.NY),
          fetchAirQualityData(DEFAULT_LOCATION.STATION_NAME),
        ]);

        setWeatherItems(weather);

        if (air) {
          const grade = air.pm25Grade || air.khaiGrade || '2';
          let label = '보통'; // 기본 2등급
          if (grade === '1') label = '좋음'; // 1등급 (초록색)
          else if (grade === '2') label = '보통'; // 2등급 (노란색)
          else if (grade === '3') label = '나쁨';
          else if (grade === '4') label = '매우 나쁨'; // 4등급 (빨간색)

          let displayValue = air.pm25Value;
          if (!displayValue || displayValue === '-') {
            displayValue = (air.pm10Value && air.pm10Value !== '-') ? air.pm10Value : '-';
          }

          setAirData({ value: displayValue, label, grade });
        }
      } catch (err) {
        setError('날씨/대기질 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    getCourseData();
  }, []);

  if (loading) {
    return (
      <View className="rounded-[18px] p-[14px] mb-3 h-[180px] justify-center items-center" style={{ backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 0.5, borderColor: 'rgba(124,58,237,0.14)' }}>
        <ActivityIndicator color="#7c3aed" />
        <Text className="text-[12px] font-medium mt-2" style={{ color: '#9b8cc5' }}>대기질 정보 로딩 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="rounded-[18px] p-[14px] mb-3 h-[180px] justify-center items-center" style={{ backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 0.5, borderColor: 'rgba(124,58,237,0.14)' }}>
        <Text className="text-[13px] font-medium" style={{ color: '#ef4444' }}>{error}</Text>
      </View>
    );
  }

  const temp = weatherItems.find((i) => i.category === 'T1H')?.obsrValue ?? '18';
  const humidity = weatherItems.find((i) => i.category === 'REH')?.obsrValue ?? '48';

  const airValue = airData?.value ?? '32';
  const airLabel = airData?.label ?? '좋음';
  const grade = airData?.grade ?? '2';

  // 하단 눈금 바(초록, 노랑, 주황, 빨강)에 맞춘 색상 및 텍스트 매핑
  let mainColor = '#fbbf24'; // 기본 2등급(보통): 노란색
  let badgeBg = 'rgba(251,191,36,0.14)';
  let descText = 'PM2.5 · 야외 활동 무난해요';

  if (grade === '1') {
    mainColor = '#10b981'; badgeBg = 'rgba(16,185,129,0.14)'; descText = 'PM2.5 · 러닝하기 아주 좋아요';
  } else if (grade === '3') {
    mainColor = '#f97316'; badgeBg = 'rgba(249,115,22,0.14)'; descText = 'PM2.5 · 무리한 러닝은 피하세요';
  } else if (grade === '4') {
    mainColor = '#ef4444'; badgeBg = 'rgba(239,68,68,0.14)'; descText = 'PM2.5 · 야외 활동을 자제하세요';
  }

  // 게이지 바 퍼센트 계산 (각 구간별 비례하여 포인터 위치 정확히 계산)
  const numericVal = parseInt(airValue, 10);
  let markerPercent = 0;
  
  if (!isNaN(numericVal)) {
    if (numericVal <= 15) {
      markerPercent = (numericVal / 15) * 25; // 0 ~ 25% 구간
    } else if (numericVal <= 35) {
      markerPercent = 25 + ((numericVal - 15) / 20) * 25; // 25 ~ 50% 구간
    } else if (numericVal <= 75) {
      markerPercent = 50 + ((numericVal - 35) / 40) * 25; // 50 ~ 75% 구간
    } else {
      markerPercent = 75 + ((Math.min(100, numericVal) - 75) / 25) * 25; // 75 ~ 100% 구간
    }
  }

  const markerLeft: DimensionValue = isNaN(numericVal) ? '30%' : `${Math.max(2, Math.min(98, markerPercent))}%`;

  return (
    <View
      className="rounded-[18px] p-[14px] mb-3"
      style={{
        backgroundColor: 'rgba(255,255,255,0.78)',
        borderWidth: 0.5,
        borderColor: 'rgba(124,58,237,0.14)',
      }}
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-[10px] font-bold tracking-[0.8px] uppercase" style={{ color: '#9b8cc5' }}>
            현재 대기질
          </Text>
          <View className="flex-row items-baseline gap-2 mt-[6px] flex-wrap">
            <Text className="text-[32px] font-bold tracking-[-1.28px] leading-[40px]" style={{ color: mainColor }}>{airValue}</Text>
            <Text className="text-[12px] font-semibold" style={{ color: '#9b8cc5' }}>μg/m³</Text>
            <View
              className="px-[9px] py-[3px] rounded-full flex-row items-center gap-1"
              style={{ backgroundColor: badgeBg }}
            >
              <View className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: mainColor }} />
              <Text className="text-[11px] font-bold" style={{ color: mainColor }}>{airLabel}</Text>
            </View>
          </View>
          <Text className="text-[11px] mt-1 font-medium" style={{ color: '#6b5ca5' }}>{descText}</Text>
        </View>

        <LinearGradient
          colors={['#fbbf24', '#f59e0b']}
          start={{ x: 0.35, y: 0.35 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 56, height: 56, borderRadius: 28 }}
        />
      </View>

      {/* PM scale */}
      <View className="mb-3">
        <View className="flex-row h-[6px] rounded-[3px] overflow-hidden relative">
          <View className="flex-1 bg-good-2" />
          <View className="flex-1 bg-warn" />
          <View className="flex-1" style={{ backgroundColor: '#f97316' }} />
          <View className="flex-1 bg-bad-2" />
        </View>
        <View className="relative">
          <View
            className="absolute w-[14px] h-[14px] rounded-full bg-white"
            style={{
              left: markerLeft,
              marginLeft: -7,
              top: -10,
              borderWidth: 2,
              borderColor: mainColor,
            }}
          />
        </View>
        <View className="flex-row justify-between mt-[6px]">
          {['0', '15', '35', '75', '100+'].map((v) => (
            <Text key={v} className="text-[9px] font-semibold" style={{ color: '#9b8cc5' }}>
              {v}
            </Text>
          ))}
        </View>
      </View>

      <View className="flex-row gap-2">
        <MiniWeather icon="🌡" label="기온" value={`${temp}°`} />
        <MiniWeather icon="💧" label="습도" value={`${humidity}%`} />
      </View>
    </View>
  );
};

const MiniWeather = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View
    className="flex-1 px-[6px] py-2 rounded-[10px] items-center"
    style={{
      backgroundColor: 'rgba(124,58,237,0.05)',
      borderWidth: 0.5,
      borderColor: 'rgba(124,58,237,0.1)',
    }}
  >
    <Text className="text-[14px] mb-[2px]">{icon}</Text>
    <Text className="text-[9px] font-semibold tracking-[0.36px]" style={{ color: '#9b8cc5' }}>{label}</Text>
    <Text className="text-[13px] font-bold mt-[1px]" style={{ color: '#1e1b4b' }}>{value}</Text>
  </View>
);

const MapCard = () => (
  <View
    className="rounded-[18px] overflow-hidden h-[180px]"
    style={{
      borderWidth: 1.5,
      borderColor: 'rgba(124,58,237,0.32)',
    }}
  >
    <LinearGradient
      colors={['#e0e7ff', '#ddd6fe', '#e0f2fe']}
      locations={[0, 0.5, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 380 180" preserveAspectRatio="xMidYMid slice">
        <Path d="M 0 60 Q 100 80 200 50 T 380 70" stroke="rgba(255,255,255,0.7)" strokeWidth={6} fill="none" />
        <Path d="M 0 120 Q 80 100 180 130 T 380 110" stroke="rgba(255,255,255,0.5)" strokeWidth={4} fill="none" />
        <Path d="M 80 0 Q 100 80 90 180" stroke="rgba(255,255,255,0.5)" strokeWidth={4} fill="none" />
        <Path d="M 240 0 Q 230 90 250 180" stroke="rgba(255,255,255,0.5)" strokeWidth={4} fill="none" />
        <Path
          d="M 0 30 Q 100 20 200 35 T 380 25 L 380 50 Q 280 60 180 50 T 0 55 Z"
          fill="rgba(96,165,250,0.4)"
        />
        <Ellipse cx={120} cy={130} rx={40} ry={22} fill="rgba(16,185,129,0.25)" />
        <Ellipse cx={290} cy={140} rx={50} ry={28} fill="rgba(16,185,129,0.2)" />
        <Path d="M 60 90 Q 120 75 180 85 T 320 100" stroke="#7c3aed" strokeWidth={3} strokeDasharray="6 4" fill="none" strokeLinecap="round" />
        <Circle cx={60} cy={90} r={8} fill="#fff" />
        <Circle cx={60} cy={90} r={5} fill="#10b981" />
        <Circle cx={320} cy={100} r={8} fill="#fff" />
        <Circle cx={320} cy={100} r={5} fill="#ef4444" />
      </Svg>

      <View className="absolute top-[10px] right-[10px] gap-1">
        <View
          className="w-8 h-8 rounded-[10px] items-center justify-center"
          style={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderWidth: 0.5,
            borderColor: 'rgba(124,58,237,0.18)',
          }}
        >
          <Text className="text-purple-500 text-base font-bold">+</Text>
        </View>
        <View
          className="w-8 h-8 rounded-[10px] items-center justify-center"
          style={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderWidth: 0.5,
            borderColor: 'rgba(124,58,237,0.18)',
          }}
        >
          <Text className="text-purple-500 text-base font-bold">−</Text>
        </View>
      </View>

      <View
        className="absolute bottom-[10px] left-[10px] rounded-[10px] px-[10px] py-[6px] flex-row items-center gap-[5px]"
        style={{
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderWidth: 0.5,
          borderColor: 'rgba(124,58,237,0.14)',
        }}
      >
        <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"
            stroke="#7c3aed"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={12} cy={9} r={2.5} stroke="#7c3aed" strokeWidth={2.4} />
        </Svg>
        <Text className="text-[10px] text-purple-500 font-bold">kakao map</Text>
      </View>
    </LinearGradient>
  </View>
);

interface CourseCardProps {
  rank: number;
  name: string;
  desc: string;
  score: number;
  best?: boolean;
}

const CourseCard = ({ rank, name, desc, score, best }: CourseCardProps) => (
  <View
    className="rounded-[16px] py-[14px] px-4 mb-[10px] relative overflow-hidden"
    style={{
      backgroundColor: 'rgba(255,255,255,0.78)',
      borderWidth: 0.5,
      borderColor: best ? 'rgba(124,58,237,0.28)' : 'rgba(124,58,237,0.12)',
    }}
  >
    {best && (
      <LinearGradient
        colors={['#7c3aed', '#6d28d9', '#3b82f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', left: 0, top: 14, bottom: 14, width: 4, borderRadius: 4 }}
      />
    )}
    <View className="flex-row justify-between items-start gap-[10px]">
      <View className="flex-1">
        <View className="flex-row items-center gap-2 mb-1 flex-wrap">
          <Text className="text-[10px] font-bold tracking-[0.6px]" style={{ color: '#9b8cc5' }}>#{rank}</Text>
          {best && (
            <LinearGradient
              colors={gradients.action}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 3 }}
            >
              <Text className="text-white text-[10px] font-bold">✦ 최적</Text>
            </LinearGradient>
          )}
        </View>
        <Text className="text-[15px] font-bold tracking-[-0.3px]" style={{ color: '#1e1b4b' }}>{name}</Text>
        <Text className="text-[11px] mt-1 font-medium leading-[15px]" style={{ color: '#6b5ca5' }}>{desc}</Text>
      </View>

      <View
        className="w-[50px] h-[50px] rounded-full items-center justify-center bg-white"
        style={{ borderWidth: 3, borderColor: best ? '#7c3aed' : '#3b82f6' }}
      >
        <Text className="text-[14px] font-bold tracking-[-0.28px]" style={{ color: best ? '#7c3aed' : '#3b82f6' }}>{score}</Text>
        <Text className="text-[7px] font-semibold" style={{ color: '#9b8cc5' }}>점</Text>
      </View>
    </View>

    {/* Stats row */}
    <View
      className="flex-row gap-4 mt-[10px] pt-[10px]"
      style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(124,58,237,0.14)', borderStyle: 'dashed' }}
    >
      <View className="ml-auto justify-center">
        {best ? (
          <LinearGradient
            colors={gradients.action}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}
          >
            <Text className="text-white text-[11px] font-bold">시작 →</Text>
          </LinearGradient>
        ) : (
          <View
            className="px-3 py-[6px] rounded-full"
            style={{ backgroundColor: 'rgba(124,58,237,0.08)' }}
          >
            <Text className="text-purple-500 text-[11px] font-bold">시작 →</Text>
          </View>
        )}
      </View>
    </View>
  </View>
);
