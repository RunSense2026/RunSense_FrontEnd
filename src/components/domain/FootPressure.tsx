import { View, Text } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';

// 발 윤곽(viewBox 80×130).
const FOOT_PATH =
  'M40 8 C56 8 64 22 64 40 C64 52 60 60 58 70 C58 80 60 92 58 104 C56 116 50 122 40 122 C30 122 24 116 22 104 C20 92 22 80 22 70 C20 60 16 52 16 40 C16 22 24 8 40 8 Z';

// 5개 FSR 센서 위치(인덱스 = avg 배열 순서) — 실제 인솔 배선과 동일하게:
//   A0 엄지 · A1 엄지 밑 · A2 새끼발가락 밑 · A3 중간(중족) · A4 뒤꿈치.
// 왼발 기준 화면 좌표(viewBox 80×130). 오른발은 x 를 좌우 반전(80-x)해 미러링한다.
const LEFT_FOOT_POSITIONS: { x: number; y: number }[] = [
  { x: 46, y: 16 }, // A0 엄지
  { x: 30, y: 46 }, // A1 엄지 밑
  { x: 50, y: 36 }, // A2 새끼발가락 밑 (엄지밑과 좌우 반대 + 더 높게)
  { x: 40, y: 74 }, // A3 중간(중족)
  { x: 40, y: 104 }, // A4 뒤꿈치
];

const footPositions = (side: 'L' | 'R'): { x: number; y: number }[] =>
  side === 'L'
    ? LEFT_FOOT_POSITIONS
    : LEFT_FOOT_POSITIONS.map((p) => ({ x: 80 - p.x, y: p.y }));

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

// 압력(0~1) → 연속 색상: 낮음 초록 → 중간 주황 → 높음 빨강.
const hexToRgb = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const mix = (c1: string, c2: string, t: number): string => {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  const ch = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
};
const pressureColor = (v: number): string => {
  const t = clamp01(v);
  return t < 0.5 ? mix('#10b981', '#f59e0b', t / 0.5) : mix('#f59e0b', '#ef4444', (t - 0.5) / 0.5);
};

interface FootPressureProps {
  side: 'L' | 'R';
  /** 센서별 정규화 압력(0~1) — 원 크기/색상/표기값(%)에 사용 */
  fsr: number[];
}

/**
 * 한쪽 발의 실시간 압력 분포 — 센서별로 압력에 따라 크기·색이 변하는 원을 그리고,
 * 각 원 위에 압력값(%)을 표시한다.
 */
export const FootPressure = ({ side, fsr }: FootPressureProps) => {
  const positions = footPositions(side);
  return (
  <View className="items-center">
    <Text className="text-[10px] text-t3 mb-[6px] tracking-[0.8px] font-semibold">
      {side === 'L' ? '왼발' : '오른발'}
    </Text>
    <Svg width={96} height={156} viewBox="0 0 80 130">
      <Path
        d={FOOT_PATH}
        fill="rgba(167,139,250,0.06)"
        stroke="rgba(167,139,250,0.25)"
        strokeWidth={0.8}
      />
      {fsr.map((v, i) => {
        const p = positions[i];
        const radius = 9 + clamp01(v) * 7;
        const color = pressureColor(v);
        return (
          <G key={i}>
            <Circle cx={p.x} cy={p.y} r={radius + 4} fill={color} opacity={0.18} />
            <Circle cx={p.x} cy={p.y} r={radius} fill={color} opacity={0.85} />
            <SvgText
              x={p.x}
              y={p.y + 3}
              fontSize={8}
              fontWeight="bold"
              fill="#ffffff"
              textAnchor="middle"
            >
              {`${Math.round(clamp01(v) * 100)}%`}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  </View>
  );
};
