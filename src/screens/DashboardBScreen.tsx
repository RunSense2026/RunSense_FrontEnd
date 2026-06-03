import { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { DarkShell, RSCoach, RSButton, EndRunModal } from '@/components/domain';
import { fmtPace, fmtTime, hrZone } from '@/utils/format';

import type { ScreenProps } from '@/types/navigation';

// ═════════════════════════════════════════════════════════════
// VARIATION B — "Glance Mode" — extra-large pace, minimal chrome
// ═════════════════════════════════════════════════════════════
export const DashboardBScreen = ({ navigation }: ScreenProps<'DashboardB'>) => {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  // Tick only while focused so a backgrounded run screen doesn't keep burning the JS thread.
  useFocusEffect(
    useCallback(() => {
      if (paused) return;
      const id = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(id);
    }, [paused]),
  );

  const sec = 1068 + tick;
  const distKm = 3.24 + tick * 0.0028;
  const hr = 156 + Math.round(Math.sin(tick / 4) * 3);
  const paceSpk = 328 + Math.round(Math.cos(tick / 6) * 4);

  return (
    <DarkShell recording>
      <View className="px-[22px] flex-row justify-between items-center">
        <Text className="text-[11px] text-t3 tracking-[0.66px] uppercase font-semibold">
          페이스 / km
        </Text>
        <View className="flex-row items-center gap-[5px]">
          <View className="w-[6px] h-[6px] rounded-full bg-purple-300" />
          <Text className="text-[11px] text-purple-300 font-semibold">기록 중</Text>
        </View>
      </View>

      {/* Mega pace */}
      <View className="px-[22px] pt-5 items-center">
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          className="text-[124px] font-bold text-white tracking-[-7.44px] leading-[124px]"
        >
          {fmtPace(paceSpk)}
        </Text>
        <Text className="mt-[14px] text-[12px] font-semibold text-good tracking-[0.96px] uppercase">
          ▼ 목표보다 2초 빠름
        </Text>
      </View>

      {/* Big mono row */}
      <View className="px-[22px] pt-[26px] flex-row gap-[10px]">
        <BigMetric value={distKm.toFixed(2)} unit="km" label="거리" />
        <BigMetric value={fmtTime(sec)} label="시간" />
      </View>

      {/* HR row */}
      <View className="px-[22px] pt-3">
        <HRZoneBar hr={hr} lthr={164} />
      </View>

      <View className="flex-1" />

      <View className="px-4 pb-3">
        <RSCoach subtitle="실시간" message="좋은 페이스에요. 어깨 힘만 살짝 풀어보세요." />
      </View>

      <View className="px-4 pb-[14px] flex-row gap-[10px]">
        <View className="flex-1">
          <RSButton variant="danger" label="■  종료" onPress={() => setEndOpen(true)} />
        </View>
        <View style={{ flex: 1.4 }}>
          <RSButton variant="ghost" label={paused ? '▶  재개' : '⏸  일시정지'} onPress={() => setPaused((p) => !p)} />
        </View>
      </View>

      <EndRunModal
        visible={endOpen}
        distKm={distKm}
        sec={sec}
        pace={fmtPace(paceSpk)}
        onCancel={() => setEndOpen(false)}
        onConfirm={() => {
          setEndOpen(false);
          navigation.navigate('Report');
        }}
      />
    </DarkShell>
  );
};

const BigMetric = ({ value, unit, label }: { value: string; unit?: string; label: string }) => (
  <View
    className="flex-1 rounded-[16px] px-3 py-[14px]"
    style={{
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.06)',
    }}
  >
    <Text className="text-[10px] text-t3 tracking-[0.8px] uppercase font-semibold">
      {label}
    </Text>
    <View className="flex-row items-baseline mt-[6px]">
      <Text className="text-[36px] font-semibold text-white tracking-[-1.08px]">{value}</Text>
      {unit && <Text className="text-[14px] text-t3 ml-1 font-medium">{unit}</Text>}
    </View>
  </View>
);

const HRZoneBar = ({ hr, lthr }: { hr: number; lthr: number }) => {
  const zones = [
    { z: 1, color: '#93c5fd', label: 'Z1' },
    { z: 2, color: '#6ee7b7', label: 'Z2' },
    { z: 3, color: '#a78bfa', label: 'Z3' },
    { z: 4, color: '#fbbf24', label: 'Z4' },
    { z: 5, color: '#f87171', label: 'Z5' },
  ];
  const cur = hrZone(hr, lthr);
  const pct = Math.min(1, hr / (lthr * 1.1));

  return (
    <View
      className="rounded-[16px] p-[14px]"
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <View className="flex-row items-end justify-between">
        <View>
          <Text className="text-[10px] text-t3 tracking-[0.8px] uppercase font-semibold">
            심박수
          </Text>
          <View className="flex-row items-baseline mt-1">
            <Text className="text-[36px] font-semibold leading-[40px]" style={{ color: cur.color }}>{hr}</Text>
            <Text className="text-[14px] text-t3 ml-1">bpm</Text>
          </View>
        </View>
        <View className="items-end">
          <View
            className="px-[10px] py-1 rounded-full"
            style={{
              backgroundColor: `${cur.color}28`,
              borderWidth: 0.5,
              borderColor: `${cur.color}50`,
            }}
          >
            <Text className="text-[11px] font-semibold" style={{ color: cur.color }}>{cur.label}</Text>
          </View>
          <Text className="text-[10px] text-t3 mt-1">LTHR {lthr}</Text>
        </View>
      </View>

      {/* Zone bar */}
      <View className="mt-3 relative h-2 rounded flex-row overflow-hidden">
        {zones.map((z) => (
          <View key={z.z} className="flex-1" style={{ backgroundColor: z.color, opacity: cur.z === z.z ? 1 : 0.32 }} />
        ))}
      </View>
      <View
        className="absolute w-3 h-4 rounded bg-white"
        style={{
          top: 'auto',
          left: `${pct * 100}%`,
          marginLeft: -6,
          borderWidth: 1.5,
          borderColor: '#1a1040',
          bottom: 18,
        }}
      />
      <View className="flex-row mt-1">
        {zones.map((z) => (
          <Text key={z.z} className="flex-1 text-[9px] text-t3 text-center font-semibold">
            {z.label}
          </Text>
        ))}
      </View>
    </View>
  );
};
