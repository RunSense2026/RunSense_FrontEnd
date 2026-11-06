import { View, Text, Pressable } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

import { cn } from '@/utils/cn';

export type TabId = 'home' | 'run' | 'course' | 'log' | 'settings';

interface RSTabBarProps {
  active?: TabId;
  onChange?: (id: TabId) => void;
}

const ICON = 22;

const HomeIcon = ({ color }: { color: string }) => (
  <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none">
    <Path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const RunIcon = ({ color }: { color: string }) => (
  <Svg width={ICON} height={ICON} viewBox="0 -960 960 960">
    <Path
      d="M216-565.13q35.2 0 68.13 13.22 32.92 13.22 59.56 37.6l380.67 364.05H760q21.14 0 35.44-14.3 14.3-14.3 14.3-35.44 0-9.55-1.78-20.29-1.79-10.74-12.52-21.48L613.67-423.28l-73.31-220.36-106.9 26.46q-24.56 6.21-44.14-8.94-19.58-15.15-19.58-40.26v-114.98l-40.71-20.36L165.26-581.9q-3.21 3.72-5.36 7.86-2.16 4.14-4.21 8.91H216Zm0 50.26h-64.77q2.62 11.59 8.37 21.5 5.76 9.91 14.5 18.09l331.54 301.46q12.49 12.08 27.98 17.82 15.48 5.74 32.38 5.74h85.41l-342.1-327.43q-18.82-18.16-43.13-27.67-24.31-9.51-50.18-9.51ZM566-100q-26.15 0-49.88-9.46-23.73-9.46-43.66-27.16l-325-295q-40.23-37-45.15-90.3-4.92-53.31 27.46-97.16l154.39-206q12.76-17.23 33.96-22.8 21.19-5.58 40.65 4.96l28.38 14q16 8.31 24.43 22.5Q420-792.23 420-775v109.77l99-25.54q22.69-6.07 43.38 5.58 20.7 11.65 28.39 33.73l66.54 200.23 173.46 173.46q16.92 16.92 23.07 36.46Q860-221.77 860-200q0 41.54-29.04 70.77Q801.92-100 760-100H566Z"
      fill={color}
    />
  </Svg>
);
const MapIcon = ({ color }: { color: string }) => (
  <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 4v16M15 6v16" stroke={color} strokeWidth={1.6} />
  </Svg>
);
const LogIcon = ({ color }: { color: string }) => (
  <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none">
    <Path d="M4 19V5a1 1 0 0 1 1-1h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 8h8M8 12h8M8 16h5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);
const GearIcon = ({ color }: { color: string }) => (
  <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.6} />
    <Path
      d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2L10 21h4l.6-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"
      stroke={color}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  </Svg>
);

const TABS: { id: TabId; label: string; Icon: (p: { color: string }) => JSX.Element }[] = [
  { id: 'home', label: '홈', Icon: HomeIcon },
  { id: 'run', label: '러닝', Icon: RunIcon },
  { id: 'course', label: '코스', Icon: MapIcon },
  { id: 'log', label: '기록', Icon: LogIcon },
  { id: 'settings', label: '설정', Icon: GearIcon },
];

export const RSTabBar = ({ active = 'run', onChange }: RSTabBarProps) => {
  return (
    <View
      className="flex-row px-2 pt-[10px] pb-[22px] border-t border-white/5"
      style={{ backgroundColor: 'rgba(10,6,30,0.6)' }}
    >
      {TABS.map((t) => {
        const isActive = t.id === active;
        const color = isActive ? '#a78bfa' : 'rgba(255,255,255,0.32)';
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange?.(t.id)}
            className="flex-1 items-center gap-1"
          >
            <t.Icon color={color} />
            <Text className={cn('text-[10px]', isActive ? 'font-semibold' : 'font-medium')} style={{ color }}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
