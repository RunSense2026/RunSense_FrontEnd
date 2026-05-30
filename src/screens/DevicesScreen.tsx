import { View, Text, Pressable, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';

import { DarkShell, DarkNavHeader, RSTabBar, type TabId } from '@/components/domain';

import type { ScreenProps } from '@/types/navigation';

export const DevicesScreen = ({ navigation }: ScreenProps<'Devices'>) => {
  const handleTabPress = (id: TabId) => {
    if (id === 'home') navigation.navigate('Home');
    else if (id === 'log') navigation.navigate('History');
    else if (id === 'settings') navigation.navigate('Settings');
    else if (id === 'run') navigation.navigate('RunSetup');
    else if (id === 'course') navigation.navigate('Course');
  };

  return (
    <DarkShell>
      <View
        className="absolute top-0 -right-[100px] w-[280px] h-[280px] rounded-full opacity-40"
        style={{ backgroundColor: 'rgba(124,58,237,0.32)' }}
        pointerEvents="none"
      />
      <View
        className="absolute top-[360px] -left-[100px] w-[240px] h-[240px] rounded-full opacity-40"
        style={{ backgroundColor: 'rgba(59,130,246,0.28)' }}
        pointerEvents="none"
      />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 14 }}>
        <DarkNavHeader
          title="블루투스 기기"
          sub="연결 상태"
          onBack={() => navigation.goBack()}
          right={
            <View
              className="rounded-full px-[10px] py-[5px] flex-row items-center gap-[5px]"
              style={{
                backgroundColor: 'rgba(16,185,129,0.16)',
                borderWidth: 0.5,
                borderColor: 'rgba(16,185,129,0.4)',
              }}
            >
              <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
                <Path d="M7 7l10 10-5 5V2l5 5L7 17" stroke="#6ee7b7" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text className="text-[10px] font-bold text-good">BLE 활성</Text>
            </View>
          }
        />

        <View className="flex-row justify-between items-baseline mb-[10px]">
          <View className="flex-row items-baseline gap-[6px]">
            <Text className="text-[13px] font-bold" style={{ color: '#ddd6fe' }}>연결된 기기</Text>
            <Text className="text-[11px] font-medium" style={{ color: 'rgba(167,139,250,0.6)' }}>3대</Text>
          </View>
        </View>

        <DeviceCard icon="L" name="왼발 인솔" model="RunSense Nano · L" />
        <DeviceCard icon="R" name="오른발 인솔" model="RunSense Nano · R" />
        <DeviceCard icon="♥" name="심박 밴드" model="Polar H10" heart />

        <Pressable
          className="py-[13px] rounded-[14px] items-center flex-row justify-center gap-2 mt-3 mb-[18px]"
          style={{
            backgroundColor: 'rgba(124,58,237,0.08)',
            borderWidth: 1,
            borderColor: 'rgba(167,139,250,0.45)',
          }}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Circle cx={11} cy={11} r={7} stroke="#c4b5fd" strokeWidth={2.2} />
            <Path d="M21 21l-4.3-4.3" stroke="#c4b5fd" strokeWidth={2.2} strokeLinecap="round" />
          </Svg>
          <Text className="text-purple-200 text-[13px] font-bold">새 기기 검색</Text>
        </Pressable>

        <SensorTestPanel />
      </ScrollView>
      <RSTabBar active="settings" onChange={handleTabPress} />
    </DarkShell>
  );
};

interface DeviceCardProps {
  icon: string;
  name: string;
  model: string;
  heart?: boolean;
}

const DeviceCard = ({ icon, name, model, heart }: DeviceCardProps) => {

  return (
    <View
      className="rounded-[16px] pr-[14px] pl-[18px] py-[14px] mb-[10px] relative overflow-hidden"
      style={{
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 0.5,
        borderColor: 'rgba(167,139,250,0.18)',
      }}
    >
      <LinearGradient
        colors={['#a78bfa', '#7c3aed', '#3b82f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', left: 0, top: 14, bottom: 14, width: 4, borderRadius: 4 }}
      />

      <View className="flex-row gap-3 items-start">
        <LinearGradient
          colors={heart ? ['#ef4444', '#dc2626'] : ['#a78bfa', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text className="font-bold text-white" style={{ fontSize: heart ? 18 : 17 }}>{icon}</Text>
        </LinearGradient>
        <View className="flex-1">
          <View className="flex-row items-center gap-[6px] mb-[3px] flex-wrap">
            <Text className="text-[14px] font-bold text-white tracking-[-0.28px]">{name}</Text>
            <View
              className="px-[6px] py-[2px] rounded-full flex-row items-center gap-[3px]"
              style={{
                backgroundColor: 'rgba(16,185,129,0.16)',
                borderWidth: 0.5,
                borderColor: 'rgba(16,185,129,0.4)',
              }}
            >
              <View className="w-[5px] h-[5px] rounded-full bg-good-2" />
              <Text className="text-good text-[9px] font-bold">연결됨</Text>
            </View>
          </View>
          <Text className="text-[11px] font-medium" style={{ color: 'rgba(167,139,250,0.7)' }}>{model}</Text>
        </View>
        <Pressable
          className="w-7 h-7 rounded-lg items-center justify-center"
          style={{
            backgroundColor: 'rgba(167,139,250,0.1)',
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.18)',
          }}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Circle cx={5} cy={12} r={1.5} fill="#a78bfa" />
            <Circle cx={12} cy={12} r={1.5} fill="#a78bfa" />
            <Circle cx={19} cy={12} r={1.5} fill="#a78bfa" />
          </Svg>
        </Pressable>
      </View>
    </View>
  );
};

const SENSORS = [
  { id: 'F1', label: '발가락', state: 'ok' as const },
  { id: 'F2', label: '내측', state: 'active' as const },
  { id: 'F3', label: '중족', state: 'ok' as const },
  { id: 'F4', label: '외측', state: 'ok' as const },
  { id: 'F5', label: '뒤꿈치', state: 'idle' as const },
];

const SENSOR_STATES = {
  ok: { dot: '#10b981', border: 'rgba(16,185,129,0.4)', bg: 'rgba(16,185,129,0.08)', text: '#6ee7b7', label: '정상' },
  active: { dot: '#fbbf24', border: 'rgba(251,191,36,0.4)', bg: 'rgba(251,191,36,0.1)', text: '#fcd34d', label: '감지' },
  idle: { dot: 'rgba(167,139,250,0.4)', border: 'rgba(167,139,250,0.18)', bg: 'rgba(167,139,250,0.04)', text: 'rgba(167,139,250,0.5)', label: '대기' },
};

const SensorTestPanel = () => (
  <View
    className="rounded-[16px] p-[14px]"
    style={{
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderWidth: 0.5,
      borderColor: 'rgba(167,139,250,0.16)',
    }}
  >
    <View className="flex-row justify-between items-start mb-[10px]">
      <View>
        <Text className="text-[13px] font-bold text-white">센서 테스트</Text>
        <Text className="text-[11px] mt-[2px] font-medium leading-[15px]" style={{ color: 'rgba(167,139,250,0.7)' }}>
          FSR 센서를 눌러 반응을 확인하세요
        </Text>
      </View>
      <View
        className="px-2 py-[3px] rounded-full"
        style={{ backgroundColor: 'rgba(167,139,250,0.1)' }}
      >
        <Text className="text-[9px] text-purple-300 font-bold tracking-[0.72px] uppercase">왼발</Text>
      </View>
    </View>

    <View className="flex-row gap-[6px]">
      {SENSORS.map((s) => {
        const c = SENSOR_STATES[s.state];
        return (
          <View
            key={s.id}
            className="flex-1 rounded-[10px] py-[10px] px-1 items-center"
            style={{
              backgroundColor: c.bg,
              borderWidth: 0.5,
              borderColor: c.border,
            }}
          >
            <View className="w-2 h-2 rounded" style={{ backgroundColor: c.dot }} />
            <Text className="text-[11px] font-bold text-white mt-[6px]">{s.id}</Text>
            <Text className="text-[8px] font-semibold mt-[1px]" style={{ color: 'rgba(167,139,250,0.6)' }}>{s.label}</Text>
            <Text className="text-[8px] font-bold mt-[3px] tracking-[0.48px]" style={{ color: c.text }}>{c.label}</Text>
          </View>
        );
      })}
    </View>

    <View
      className="flex-row gap-3 mt-3 pt-[10px] items-center"
      style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(167,139,250,0.12)' }}
    >
      <DevLegend color="#10b981" label="정상" />
      <DevLegend color="#fbbf24" label="감지 중" />
      <DevLegend color="rgba(167,139,250,0.4)" label="대기" />
      <Text className="ml-auto text-[10px] text-purple-300 font-bold">전체 보정 →</Text>
    </View>
  </View>
);

const DevLegend = ({ color, label }: { color: string; label: string }) => (
  <View className="flex-row items-center gap-1">
    <View className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: color }} />
    <Text className="text-[9px] font-semibold" style={{ color: 'rgba(221,214,254,0.7)' }}>{label}</Text>
  </View>
);
