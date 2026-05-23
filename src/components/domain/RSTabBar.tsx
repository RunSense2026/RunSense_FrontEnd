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
  <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none">
    <Circle cx={14} cy={4.5} r={1.6} stroke={color} strokeWidth={1.6} />
    <Path d="M9 21l3-7-3-2 2-5 5 2 3 4" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 13l4-1" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
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
