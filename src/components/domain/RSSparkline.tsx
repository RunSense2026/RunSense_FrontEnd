import { memo, useRef } from 'react';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

interface RSSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
}

// memo: data(배열) 참조가 그대로면 리렌더를 건너뛴다. 부모에서 data 를 useMemo 로
// 안정화하면 매 프레임이 아니라 데이터가 바뀔 때만 다시 그린다.
export const RSSparkline = memo(({ data, width = 280, height = 36, stroke = '#a78bfa' }: RSSparklineProps) => {
  // 그라디언트 id 는 인스턴스당 1회만 생성한다. 매 렌더마다 새 id 를 만들면
  // react-native-svg 에 새 그라디언트 정의가 쌓여(누수) 장시간 사용 시 느려진다.
  const gradId = useRef(`rs-spark-${Math.random().toString(36).slice(2, 8)}`).current;
  if (!data?.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * height] as const);
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${path} L${width} ${height} L0 ${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgLinearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
          <Stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </SvgLinearGradient>
      </Defs>
      <Path d={area} fill={`url(#${gradId})`} />
      <Path d={path} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

RSSparkline.displayName = 'RSSparkline';
