import { useMemo, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  type DimensionValue,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { LightShell, WeatherIcon, deriveWeatherCondition } from '@/components/domain';
import { useNearbyParks } from '@/hooks/useNearbyParks';
import { useResolvedLocation, type ResolvedLocation } from '@/hooks/useResolvedLocation';
import { useWeather, useAirQuality } from '@/hooks/useWeatherAir';
import { gradients } from '@/theme/tokens';
import { PARK_TAGS } from '@/types/api';

import type { AirQualityResponseDto, ParkResponseDto, ParkTag } from '@/types/api';
import type { TabScreenProps } from '@/types/navigation';

type CourseSort = 'distance' | 'area' | 'name';
const COURSE_SORT_LABELS: Record<CourseSort, string> = { distance: '거리순', area: '넓은순', name: '이름순' };

export const CourseScreen = ({ navigation }: TabScreenProps<'Course'>) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [courseSort, setCourseSort] = useState<CourseSort>('distance');
  const [tags, setTags] = useState<ParkTag[]>([]);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);

  // GPS → 위경도 + 표시 지역명 (실패 시 강남구 폴백). 새로고침 시 재조회.
  const location = useResolvedLocation(refreshKey);
  // 주변 공원 추천 — GET /api/course/nearby (위치·시설 필터가 바뀌면 재조회)
  const { parks, loading, error } = useNearbyParks(location, tags);

  const sortedParks = useMemo(
    () =>
      [...parks].sort((a, b) => {
        if (courseSort === 'name') return a.name.localeCompare(b.name);
        if (courseSort === 'area') return (b.area ?? -1) - (a.area ?? -1);
        return a.rank - b.rank; // 서버 순위 = 가까운 순
      }),
    [parks, courseSort],
  );
  // 지도·카드 강조 — 고른 공원이 없으면 가장 가까운 공원
  const selected = parks.find((p) => p.rank === selectedRank) ?? parks[0] ?? null;

  const toggleTag = (tag: ParkTag) => {
    setSelectedRank(null);
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <LightShell>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16 }}>
        {/* Header */}
        <View className="flex-row justify-between items-start py-1 pb-[14px]">
          <View>
            <Text className="text-[11px] font-semibold tracking-[0.66px] uppercase" style={{ color: '#7c6bb5' }}>
              내 주변 공원
            </Text>
            <Text className="text-[22px] font-bold mt-1 tracking-[-0.66px]" style={{ color: '#1e1b4b' }}>
              오늘의 추천 코스
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setSelectedRank(null);
              setRefreshKey((k) => k + 1);
            }}
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

        <AirQualityCard location={location} />
        <ParkMap location={location} parks={parks} selected={selected} onSelect={(p) => setSelectedRank(p.rank)} />

        <View className="flex-row justify-between items-baseline mt-[18px] mb-[10px]" style={{ zIndex: 20 }}>
          <View className="flex-row items-baseline gap-[6px]">
            <Text className="text-[14px] font-bold" style={{ color: '#1e1b4b' }}>추천 공원</Text>
            <Text className="text-[11px] font-medium" style={{ color: '#9b8cc5' }}>
              {loading ? '찾는 중' : `${parks.length}곳`}
            </Text>
          </View>
          <CourseSortDropdown value={courseSort} onChange={setCourseSort} />
        </View>

        <TagFilter selected={tags} onToggle={toggleTag} />

        {loading ? (
          <StatusCard>
            <ActivityIndicator color="#7c3aed" />
            <Text className="text-[12px] font-medium mt-2" style={{ color: '#9b8cc5' }}>
              주변 공원을 찾고 있어요...
            </Text>
          </StatusCard>
        ) : error ? (
          <StatusCard>
            <Text className="text-[13px] font-medium" style={{ color: '#ef4444' }}>{error}</Text>
            <Pressable onPress={() => setRefreshKey((k) => k + 1)} hitSlop={8} className="mt-2">
              <Text className="text-[12px] font-bold text-purple-500">다시 시도</Text>
            </Pressable>
          </StatusCard>
        ) : parks.length === 0 ? (
          <StatusCard>
            <Text className="text-[13px] font-semibold" style={{ color: '#1e1b4b' }}>
              조건에 맞는 공원이 없어요
            </Text>
            <Text className="text-[11px] font-medium mt-1 text-center" style={{ color: '#9b8cc5' }}>
              {tags.length
                ? '시설 정보가 없는 공원이 많아요. 필터를 줄여보세요.'
                : '근처에 면적 1만㎡ 이상인 공원이 없어요.'}
            </Text>
            {tags.length > 0 && (
              <Pressable onPress={() => setTags([])} hitSlop={8} className="mt-2">
                <Text className="text-[12px] font-bold text-purple-500">필터 초기화</Text>
              </Pressable>
            )}
          </StatusCard>
        ) : (
          sortedParks.map((park) => (
            <ParkCard
              key={`${park.rank}-${park.name}`}
              park={park}
              nearest={park.rank === 1}
              selected={park.rank === selected?.rank}
              onPress={() => setSelectedRank(park.rank)}
              onDirections={() => openDirections(park)}
              onStart={() => navigation.navigate('RunSetup')}
            />
          ))
        )}

        {location.isFallback && location.ready && (
          <Text className="text-[10px] text-center mt-1 font-medium" style={{ color: '#9b8cc5' }}>
            위치를 확인하지 못해 기본 위치({location.name}) 기준으로 추천했어요.
          </Text>
        )}
      </ScrollView>
    </LightShell>
  );
};

// 기기 지도 앱으로 공원 위치를 연다 (안드로이드 geo: 인텐트 / iOS 지도).
const openDirections = (park: ParkResponseDto) => {
  const { latitude: lat, longitude: lon, name } = park;
  const label = encodeURIComponent(name);
  const url =
    Platform.OS === 'ios'
      ? `maps:?q=${label}&ll=${lat},${lon}`
      : `geo:${lat},${lon}?q=${lat},${lon}(${label})`;
  Linking.openURL(url).catch(() => {
    Alert.alert('지도를 열 수 없어요', '기기에 지도 앱이 설치돼 있는지 확인해주세요.');
  });
};

/** 거리(km) → '420m' / '1.2km' */
const fmtDistance = (km: number): string => (km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`);

/** 면적(㎡) → '1.2만㎡' / '8,500㎡' */
const fmtArea = (area: number | null): string => {
  if (area == null) return '정보 없음';
  return area >= 10000 ? `${(area / 10000).toFixed(1)}만㎡` : `${Math.round(area).toLocaleString()}㎡`;
};

const StatusCard = ({ children }: { children: ReactNode }) => (
  <View
    className="rounded-[16px] py-6 px-4 mb-[10px] items-center justify-center"
    style={{ backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 0.5, borderColor: 'rgba(124,58,237,0.12)' }}
  >
    {children}
  </View>
);

// 시설 태그 필터 — 고른 시설을 모두 갖춘 공원만 서버가 돌려준다.
const TagFilter = ({ selected, onToggle }: { selected: ParkTag[]; onToggle: (tag: ParkTag) => void }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    className="mb-[10px] -mx-[18px]"
    contentContainerStyle={{ paddingHorizontal: 18, gap: 6 }}
  >
    {PARK_TAGS.map((tag) => {
      const on = selected.includes(tag);
      return (
        <Pressable
          key={tag}
          onPress={() => onToggle(tag)}
          className="px-[11px] py-[6px] rounded-full"
          style={{
            backgroundColor: on ? '#7c3aed' : 'rgba(255,255,255,0.78)',
            borderWidth: 0.5,
            borderColor: on ? '#7c3aed' : 'rgba(124,58,237,0.18)',
          }}
        >
          <Text className="text-[11px] font-semibold" style={{ color: on ? '#fff' : '#6b5ca5' }}>
            {tag}
          </Text>
        </Pressable>
      );
    })}
  </ScrollView>
);

// 코스 정렬 드롭다운 — 거리순(서버 순위) / 넓은순 / 이름순
const CourseSortDropdown = ({
  value,
  onChange,
}: {
  value: CourseSort;
  onChange: (s: CourseSort) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ position: 'relative', zIndex: 30 }}>
      <Pressable onPress={() => setOpen((o) => !o)} className="flex-row items-center gap-[2px]" hitSlop={8}>
        <Text className="text-[11px] text-purple-500 font-semibold">{COURSE_SORT_LABELS[value]}</Text>
        <Text className="text-[9px] text-purple-500">▾</Text>
      </Pressable>
      {open && (
        <View
          style={{
            position: 'absolute',
            top: 22,
            right: 0,
            minWidth: 92,
            backgroundColor: '#ffffff',
            borderRadius: 12,
            borderWidth: 0.5,
            borderColor: 'rgba(124,58,237,0.18)',
            paddingVertical: 4,
            elevation: 8,
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          {(Object.keys(COURSE_SORT_LABELS) as CourseSort[]).map((k) => (
            <Pressable
              key={k}
              onPress={() => {
                onChange(k);
                setOpen(false);
              }}
              className="px-3 py-[7px]"
            >
              <Text className="text-[12px] font-semibold" style={{ color: k === value ? '#7c3aed' : '#6b5ca5' }}>
                {COURSE_SORT_LABELS[k]}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

/** 대기질 카드 표시값 */
interface AirDisplay {
  value: string;
  label: string;
  grade: string;
}

// 대기질 응답 → 카드 표시값(수치·등급 라벨).
const toAirDisplay = (air: AirQualityResponseDto): AirDisplay => {
  // 초미세먼지(PM2.5)가 통신 장애·점검으로 비어 올 경우 미세먼지(PM10) 값으로 대체한다.
  const numeric = air.pm25Value ?? air.pm10Value ?? null;
  const value = numeric === null ? '-' : String(Math.round(numeric));

  let grade: string;
  if (numeric !== null) {
    if (numeric <= 15) grade = '1';
    else if (numeric <= 35) grade = '2';
    else if (numeric <= 75) grade = '3';
    else grade = '4';
  } else {
    // 수치가 없을 때는 API 가 준 등급을 쓴다.
    grade = air.pm25Grade || air.khaiGrade || '2';
  }

  const label =
    grade === '1' ? '좋음' : grade === '3' ? '나쁨' : grade === '4' ? '매우 나쁨' : '보통';
  return { value, label, grade };
};

const AirQualityCard = ({ location }: { location: ResolvedLocation }) => {
  const { name: locationName } = location;

  // 날씨와 대기질은 백엔드에서 각각 따로 받아온다: 한쪽이 느리거나 죽어도 다른 쪽은 그대로 나온다.
  const { weather, loading, error } = useWeather(location);
  const air = useAirQuality(location);
  const airData = air ? toAirDisplay(air) : null;

  const condition = deriveWeatherCondition(
    weather?.precipitationType ?? undefined,
    weather?.skyCondition ?? undefined,
  );

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

  const temp = weather?.temperature ?? 18;
  const humidity = weather?.humidity ?? 48;

  // 대기질 조회 실패(에어코리아 점검·일시 오류) 시 '--' 로 표시한다.
  const airValue = airData?.value ?? '--';
  const airLabel = airData?.label ?? '정보 없음';
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
      {/* 현재 위치 — 카드 안 상단에 표시 (지역명이 길어도 카드 폭 안에서 줄바꿈) */}
      <Text
        className="text-[12px] font-semibold mb-[10px]"
        style={{ color: '#7c6bb5' }}
        numberOfLines={2}
      >
        {locationName}
      </Text>

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

        <WeatherIcon condition={condition} size={56} />
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

// ─── 지도 ─────────────────────────────────────────────────────────
// 지도 SDK(API 키) 없이, 내 위치를 중심으로 추천 공원의 실제 방향·거리를 찍는 약식 지도.
// 위경도 차이를 km 로 바꿔(경도는 위도에 따라 cos 보정) 같은 축척으로 그린다.

const MAP_W = 340;
const MAP_H = 180;
const MAP_PAD_X = 26;
const MAP_PAD_Y = 14;
/** 왼쪽 아래 위치 라벨이 차지하는 높이 — 핀이 라벨에 가리지 않도록 지도 중심을 그만큼 올린다 */
const MAP_LABEL_H = 34;
/** 거리 눈금 후보(km) — 지도에 들어가는 것 중 바깥 두 개만 그린다 */
const RING_STEPS_KM = [0.25, 0.5, 1, 2, 3, 5, 10, 20];

const toLocalKm = (lat0: number, lon0: number, lat: number, lon: number) => ({
  x: (lon - lon0) * 111.32 * Math.cos((lat0 * Math.PI) / 180),
  y: (lat - lat0) * 110.57,
});

interface ParkMapProps {
  location: ResolvedLocation;
  parks: ParkResponseDto[];
  selected: ParkResponseDto | null;
  onSelect: (park: ParkResponseDto) => void;
}

const ParkMap = ({ location, parks, selected, onSelect }: ParkMapProps) => {
  const cx = MAP_W / 2;
  const cy = (MAP_H - MAP_LABEL_H) / 2;
  const points = parks.map((p) => ({ park: p, ...toLocalKm(location.lat, location.lon, p.latitude, p.longitude) }));

  // 가장 먼 공원이 테두리 안쪽에 들어오도록 가로·세로 중 빡빡한 쪽에 축척을 맞춘다.
  const maxX = Math.max(0.2, ...points.map((p) => Math.abs(p.x)));
  const maxY = Math.max(0.2, ...points.map((p) => Math.abs(p.y)));
  const pxPerKm = Math.min((cx - MAP_PAD_X) / maxX, (cy - MAP_PAD_Y) / maxY);
  const toPx = (x: number, y: number) => ({ px: cx + x * pxPerKm, py: cy - y * pxPerKm });

  // 눈금 원은 라벨(원의 위쪽)이 보이도록 세로 안에 들어오는 것만 그린다.
  const rings = RING_STEPS_KM.filter((km) => km * pxPerKm <= cy - 4).slice(-2);
  const sel = selected ? points.find((p) => p.park.rank === selected.rank) : undefined;
  const selPx = sel ? toPx(sel.x, sel.y) : null;

  return (
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
        <Svg width="100%" height="100%" viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet">
          {/* 거리 눈금 */}
          {rings.map((km) => (
            <G key={km}>
              <Circle
                cx={cx}
                cy={cy}
                r={km * pxPerKm}
                stroke="rgba(124,58,237,0.22)"
                strokeWidth={1}
                strokeDasharray="4 4"
                fill="none"
              />
              <SvgText x={cx + 4} y={cy - km * pxPerKm + 11} fontSize={9} fontWeight="600" fill="rgba(107,92,165,0.75)">
                {km < 1 ? `${km * 1000}m` : `${km}km`}
              </SvgText>
            </G>
          ))}
          {/* 북쪽 표시 */}
          <SvgText x={MAP_W - 16} y={16} fontSize={10} fontWeight="700" fill="rgba(107,92,165,0.7)" textAnchor="middle">
            N
          </SvgText>

          {/* 내 위치 → 선택 공원 */}
          {selPx && (
            <Line
              x1={cx}
              y1={cy}
              x2={selPx.px}
              y2={selPx.py}
              stroke="#7c3aed"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              strokeLinecap="round"
            />
          )}

          {/* 내 위치 — 가까운 공원 핀이 가려지지 않도록 핀보다 먼저 그린다 */}
          <Circle cx={cx} cy={cy} r={11} fill="rgba(59,130,246,0.2)" />
          <Circle cx={cx} cy={cy} r={6} fill="#fff" />
          <Circle cx={cx} cy={cy} r={4} fill="#3b82f6" />

          {/* 공원 핀 — 탭하면 선택 (선택된 핀은 맨 위에) */}
          {[...points]
            .sort((a, b) => Number(a.park.rank === selected?.rank) - Number(b.park.rank === selected?.rank))
            .map(({ park, x, y }) => {
            const { px, py } = toPx(x, y);
            const on = park.rank === selected?.rank;
            return (
              <G key={`${park.rank}-${park.name}`} onPress={() => onSelect(park)}>
                <Circle cx={px} cy={py} r={on ? 12 : 10} fill="#fff" />
                <Circle cx={px} cy={py} r={on ? 9 : 7.5} fill={on ? '#7c3aed' : '#10b981'} />
                <SvgText x={px} y={py + 3.5} fontSize={on ? 10 : 9} fontWeight="700" fill="#fff" textAnchor="middle">
                  {park.rank}
                </SvgText>
              </G>
            );
          })}

        </Svg>

        {parks.length === 0 && (
          <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
            <Text className="text-[11px] font-semibold mt-12" style={{ color: 'rgba(107,92,165,0.8)' }}>
              {location.ready ? '표시할 공원이 없어요' : '위치 확인 중...'}
            </Text>
          </View>
        )}

        <View
          className="absolute bottom-[10px] left-[10px] rounded-[10px] px-[10px] py-[6px] flex-row items-center gap-[5px]"
          style={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderWidth: 0.5,
            borderColor: 'rgba(124,58,237,0.14)',
            maxWidth: '70%',
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
          <Text className="text-[10px] text-purple-500 font-bold" numberOfLines={1}>
            {selected ? `${selected.name} · ${fmtDistance(selected.distanceKm)}` : location.name}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

// ─── 공원 카드 ────────────────────────────────────────────────────

/** 카드에 바로 보여줄 시설 태그 수 — 나머지는 '+n' */
const VISIBLE_TAGS = 4;

interface ParkCardProps {
  park: ParkResponseDto;
  nearest: boolean;
  selected: boolean;
  onPress: () => void;
  onDirections: () => void;
  onStart: () => void;
}

const ParkCard = ({ park, nearest, selected, onPress, onDirections, onStart }: ParkCardProps) => {
  const extraTags = park.tags.length - VISIBLE_TAGS;
  return (
    <Pressable
      onPress={onPress}
      className="rounded-[16px] py-[14px] px-4 mb-[10px] relative overflow-hidden"
      style={{
        backgroundColor: 'rgba(255,255,255,0.78)',
        borderWidth: selected ? 1 : 0.5,
        borderColor: selected ? 'rgba(124,58,237,0.45)' : 'rgba(124,58,237,0.12)',
      }}
    >
      {selected && (
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
            <Text className="text-[10px] font-bold tracking-[0.6px]" style={{ color: '#9b8cc5' }}>#{park.rank}</Text>
            {nearest && (
              <LinearGradient
                colors={gradients.action}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}
              >
                <Text className="text-white text-[10px] font-bold">✦ 가장 가까움</Text>
              </LinearGradient>
            )}
            {!!park.type && (
              <Text className="text-[10px] font-semibold" style={{ color: '#7c6bb5' }}>{park.type}</Text>
            )}
          </View>
          <Text className="text-[15px] font-bold tracking-[-0.3px]" style={{ color: '#1e1b4b' }}>{park.name}</Text>
          {!!park.address && (
            <Text className="text-[11px] mt-1 font-medium leading-[15px]" style={{ color: '#6b5ca5' }} numberOfLines={2}>
              {park.address}
            </Text>
          )}
        </View>

        <View
          className="rounded-full items-center justify-center bg-white"
          style={{ width: 50, height: 50, flexShrink: 0, borderWidth: 3, borderColor: selected ? '#7c3aed' : '#3b82f6' }}
        >
          {/* 숫자와 단위를 나눠 써야 '1.6km' 같은 값도 원 안에 들어간다 */}
          <Text className="text-[13px] font-bold tracking-[-0.4px] leading-[16px]" style={{ color: selected ? '#7c3aed' : '#3b82f6' }}>
            {park.distanceKm < 1 ? Math.round(park.distanceKm * 1000) : park.distanceKm.toFixed(1)}
          </Text>
          <Text className="text-[9px] font-semibold leading-[11px]" style={{ color: '#9b8cc5' }}>
            {park.distanceKm < 1 ? 'm' : 'km'}
          </Text>
        </View>
      </View>

      {park.tags.length > 0 && (
        <View className="flex-row flex-wrap gap-1 mt-[10px]">
          {park.tags.slice(0, VISIBLE_TAGS).map((tag) => (
            <View key={tag} className="px-2 py-[2px] rounded-full" style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}>
              <Text className="text-[10px] font-semibold" style={{ color: '#059669' }}>{tag}</Text>
            </View>
          ))}
          {extraTags > 0 && (
            <View className="px-2 py-[2px] rounded-full" style={{ backgroundColor: 'rgba(124,58,237,0.08)' }}>
              <Text className="text-[10px] font-semibold text-purple-500">+{extraTags}</Text>
            </View>
          )}
        </View>
      )}

      {/* Stats row */}
      <View
        className="flex-row items-center gap-4 mt-[10px] pt-[10px]"
        style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(124,58,237,0.14)', borderStyle: 'dashed' }}
      >
        <View>
          <Text className="text-[9px] font-semibold" style={{ color: '#9b8cc5' }}>면적</Text>
          <Text className="text-[12px] font-bold" style={{ color: '#1e1b4b' }}>{fmtArea(park.area)}</Text>
        </View>
        <View className="ml-auto flex-row gap-[6px]">
          <Pressable
            onPress={onDirections}
            hitSlop={4}
            className="px-3 py-[6px] rounded-full"
            style={{ backgroundColor: 'rgba(124,58,237,0.08)' }}
          >
            <Text className="text-purple-500 text-[11px] font-bold">길찾기</Text>
          </Pressable>
          <Pressable onPress={onStart} hitSlop={4}>
            <LinearGradient
              colors={gradients.action}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}
            >
              <Text className="text-white text-[11px] font-bold">러닝 시작 →</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};
