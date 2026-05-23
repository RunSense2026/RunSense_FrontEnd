import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

interface RSSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
}

export const RSSparkline = ({ data, width = 280, height = 36, stroke = '#a78bfa' }: RSSparklineProps) => {
  if (!data?.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * height] as const);
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${path} L${width} ${height} L0 ${height} Z`;
  const gradId = `rs-spark-${Math.random().toString(36).slice(2, 8)}`;

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
};
