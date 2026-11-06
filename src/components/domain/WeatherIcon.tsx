import Svg, { Circle, Rect, Line, Defs, LinearGradient, Stop } from 'react-native-svg';

// 날씨 상태 — 홈/코스 카드의 날씨 아이콘을 결정한다.
export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'sleet';

/**
 * 강수형태(PTY)와 하늘상태(SKY)로 날씨 상태를 도출한다.
 * - PTY: 0/없음=강수없음, 1/5=비, 2/6=비/눈, 3/7=눈
 * - SKY: 1=맑음, 3=구름많음, 4=흐림 (PTY 가 강수없음일 때만 사용)
 */
export const deriveWeatherCondition = (pty?: string, sky?: string): WeatherCondition => {
  switch (pty) {
    case '1':
    case '5':
      return 'rainy';
    case '2':
    case '6':
      return 'sleet';
    case '3':
    case '7':
      return 'snowy';
    default:
      break;
  }
  if (sky === '3' || sky === '4') return 'cloudy';
  return 'sunny';
};

/** 날씨 상태 → 한글 라벨 (온도 옆 등 텍스트 표기용). */
export const conditionLabel = (c: WeatherCondition): string => {
  switch (c) {
    case 'rainy':
      return '비';
    case 'sleet':
      return '비/눈';
    case 'snowy':
      return '눈';
    case 'cloudy':
      return '구름많음';
    default:
      return '맑음';
  }
};

const CLOUD = '#c4cce0';
const RAIN = '#60a5fa';
const SNOW = '#7dd3fc';

// 구름 덩어리 (같은 색 도형이 겹쳐 하나의 실루엣처럼 보인다).
const CloudShape = ({ color = CLOUD }: { color?: string }) => (
  <>
    <Circle cx={25} cy={26} r={9} fill={color} />
    <Circle cx={38} cy={22} r={12} fill={color} />
    <Circle cx={46} cy={28} r={8} fill={color} />
    <Rect x={20} y={26} width={30} height={12} rx={6} fill={color} />
  </>
);

interface WeatherIconProps {
  condition: WeatherCondition;
  size?: number;
}

/**
 * 날씨 상태에 따른 아이콘. 홈/코스에서 동일하게 사용해 모양을 통일한다.
 * viewBox 64×64 기준으로 그리며 size 로 스케일한다.
 */
export const WeatherIcon = ({ condition, size = 56 }: WeatherIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <Defs>
      <LinearGradient id="rsSun" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#fbbf24" />
        <Stop offset="1" stopColor="#f59e0b" />
      </LinearGradient>
    </Defs>

    {condition === 'sunny' && (
      <>
        {/* 햇살 */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const r = (deg * Math.PI) / 180;
          const cx = 32;
          const cy = 32;
          const r1 = 18;
          const r2 = 24;
          return (
            <Line
              key={deg}
              x1={cx + r1 * Math.cos(r)}
              y1={cy + r1 * Math.sin(r)}
              x2={cx + r2 * Math.cos(r)}
              y2={cy + r2 * Math.sin(r)}
              stroke="#fbbf24"
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
        <Circle cx={32} cy={32} r={13} fill="url(#rsSun)" />
      </>
    )}

    {condition === 'cloudy' && (
      <>
        {/* 구름 뒤로 살짝 보이는 해 */}
        <Circle cx={44} cy={18} r={9} fill="url(#rsSun)" />
        <CloudShape />
      </>
    )}

    {condition === 'rainy' && (
      <>
        <CloudShape />
        {[26, 35, 44].map((x) => (
          <Line key={x} x1={x} y1={42} x2={x - 4} y2={54} stroke={RAIN} strokeWidth={3} strokeLinecap="round" />
        ))}
      </>
    )}

    {condition === 'snowy' && (
      <>
        <CloudShape />
        {[26, 35, 44].map((x) => (
          <Circle key={x} cx={x} cy={48} r={2.6} fill={SNOW} />
        ))}
      </>
    )}

    {condition === 'sleet' && (
      <>
        <CloudShape />
        <Line x1={29} y1={42} x2={25} y2={54} stroke={RAIN} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={42} cy={48} r={2.6} fill={SNOW} />
      </>
    )}
  </Svg>
);
