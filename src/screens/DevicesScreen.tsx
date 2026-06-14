import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import type { BluetoothDevice } from 'react-native-bluetooth-classic';

import { DarkShell, DarkNavHeader, RSTabBar, type TabId } from '@/components/domain';
import { useInsoleStore } from '@/stores/insoleStore';
import {
  isBluetoothReady,
  listBondedDevices,
  connectInsole,
  disconnectInsole,
} from '@/bluetooth/insole';
import { HEEL_STRIKE_THRESHOLD } from '@/utils/insoleMetrics';
import type { FootSide, InsolePacket } from '@/types/insole';

import { handleRootTabPress } from '@/navigation/tabRoutes';
import type { ScreenProps } from '@/types/navigation';

interface FootConn {
  connected: boolean;
  deviceName: string | null;
  packet: InsolePacket | null;
}

export const DevicesScreen = ({ navigation }: ScreenProps<'Devices'>) => {
  const handleTabPress = (id: TabId) => handleRootTabPress(navigation, id);

  const left = useInsoleStore((s) => s.L);
  const right = useInsoleStore((s) => s.R);
  // 인솔 2 + Galaxy Watch(이름만, 항상 연결됨 처리)
  const connectedCount = (left.connected ? 1 : 0) + (right.connected ? 1 : 0) + 1;

  // 기기 선택 모달 상태
  const [pickerFoot, setPickerFoot] = useState<FootSide | null>(null);
  const [bonded, setBonded] = useState<BluetoothDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [busyFoot, setBusyFoot] = useState<FootSide | null>(null);

  const openPicker = async (foot: FootSide) => {
    setPickerFoot(foot);
    setScanning(true);
    setBonded([]);
    try {
      if (!(await isBluetoothReady())) {
        setPickerFoot(null);
        Alert.alert('블루투스가 필요해요', '블루투스 권한을 허용하고 블루투스를 켜주세요.');
        return;
      }
      setBonded(await listBondedDevices());
    } catch {
      setPickerFoot(null);
      Alert.alert('오류', '페어링된 기기를 불러오지 못했어요. OS 설정에서 인솔을 먼저 페어링했는지 확인해주세요.');
    } finally {
      setScanning(false);
    }
  };

  const handleSelect = async (device: BluetoothDevice) => {
    const foot = pickerFoot;
    if (!foot) return;
    setPickerFoot(null);
    setBusyFoot(foot);
    try {
      await connectInsole(foot, device.address);
    } catch {
      Alert.alert('연결 실패', `${device.name ?? device.address} 에 연결하지 못했어요.`);
    } finally {
      setBusyFoot(null);
    }
  };

  const handleDisconnect = async (foot: FootSide) => {
    setBusyFoot(foot);
    try {
      await disconnectInsole(foot);
    } finally {
      setBusyFoot(null);
    }
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
              <Text className="text-[10px] font-bold text-good">BT 활성</Text>
            </View>
          }
        />

        <View className="flex-row justify-between items-baseline mb-[10px]">
          <View className="flex-row items-baseline gap-[6px]">
            <Text className="text-[13px] font-bold" style={{ color: '#ddd6fe' }}>연결된 기기</Text>
            <Text className="text-[11px] font-medium" style={{ color: 'rgba(167,139,250,0.6)' }}>{connectedCount}대</Text>
          </View>
        </View>

        <InsoleCard
          side="L"
          name="왼발 인솔"
          conn={left}
          busy={busyFoot === 'L'}
          onConnect={() => openPicker('L')}
          onDisconnect={() => handleDisconnect('L')}
        />
        <InsoleCard
          side="R"
          name="오른발 인솔"
          conn={right}
          busy={busyFoot === 'R'}
          onConnect={() => openPicker('R')}
          onDisconnect={() => handleDisconnect('R')}
        />
        <DeviceCard icon="♥" name="심박 (Galaxy Watch)" model="Galaxy Watch · BLE" heart />

        <SensorTestPanel left={left.packet} right={right.packet} />
      </ScrollView>

      <DevicePickerModal
        visible={pickerFoot != null}
        foot={pickerFoot}
        devices={bonded}
        scanning={scanning}
        onSelect={handleSelect}
        onClose={() => setPickerFoot(null)}
      />

      <RSTabBar active="settings" onChange={handleTabPress} />
    </DarkShell>
  );
};

// ─── 인솔(연결 가능) 카드 ─────────────────────────────────────────
interface InsoleCardProps {
  side: FootSide;
  name: string;
  conn: FootConn;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

const InsoleCard = ({ side, name, conn, busy, onConnect, onDisconnect }: InsoleCardProps) => {
  const model = conn.connected
    ? conn.deviceName ?? `RunSense Nano · ${side}`
    : '연결 안 됨 · 탭하여 연결';

  return (
    <View
      className="rounded-[16px] pr-[14px] pl-[18px] py-[14px] mb-[10px] relative overflow-hidden"
      style={{
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 0.5,
        borderColor: conn.connected ? 'rgba(167,139,250,0.18)' : 'rgba(167,139,250,0.1)',
      }}
    >
      <LinearGradient
        colors={['#a78bfa', '#7c3aed', '#3b82f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', left: 0, top: 14, bottom: 14, width: 4, borderRadius: 4, opacity: conn.connected ? 1 : 0.3 }}
      />

      <View className="flex-row gap-3 items-center">
        <LinearGradient
          colors={['#a78bfa', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', opacity: conn.connected ? 1 : 0.55 }}
        >
          <Text className="font-bold text-white text-[17px]">{side}</Text>
        </LinearGradient>

        <View className="flex-1">
          <View className="flex-row items-center gap-[6px] mb-[3px] flex-wrap">
            <Text className="text-[14px] font-bold text-white tracking-[-0.28px]">{name}</Text>
            <ConnBadge connected={conn.connected} />
          </View>
          <Text className="text-[11px] font-medium" style={{ color: 'rgba(167,139,250,0.7)' }} numberOfLines={1}>
            {model}
          </Text>
        </View>

        <Pressable
          onPress={conn.connected ? onDisconnect : onConnect}
          disabled={busy}
          className="px-[12px] h-8 rounded-lg items-center justify-center"
          style={{
            backgroundColor: conn.connected ? 'rgba(239,68,68,0.12)' : 'rgba(124,58,237,0.18)',
            borderWidth: 0.5,
            borderColor: conn.connected ? 'rgba(239,68,68,0.4)' : 'rgba(167,139,250,0.45)',
          }}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#c4b5fd" />
          ) : (
            <Text className="text-[12px] font-bold" style={{ color: conn.connected ? '#fca5a5' : '#ddd6fe' }}>
              {conn.connected ? '해제' : '연결'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const ConnBadge = ({ connected }: { connected: boolean }) => (
  <View
    className="px-[6px] py-[2px] rounded-full flex-row items-center gap-[3px]"
    style={{
      backgroundColor: connected ? 'rgba(16,185,129,0.16)' : 'rgba(167,139,250,0.1)',
      borderWidth: 0.5,
      borderColor: connected ? 'rgba(16,185,129,0.4)' : 'rgba(167,139,250,0.22)',
    }}
  >
    <View
      className="w-[5px] h-[5px] rounded-full"
      style={{ backgroundColor: connected ? '#34d399' : 'rgba(167,139,250,0.5)' }}
    />
    <Text className="text-[9px] font-bold" style={{ color: connected ? '#6ee7b7' : 'rgba(167,139,250,0.7)' }}>
      {connected ? '연결됨' : '대기'}
    </Text>
  </View>
);

// ─── 정적 기기 카드 (Galaxy Watch 심박) ───────────────────────────
interface DeviceCardProps {
  icon: string;
  name: string;
  model: string;
  heart?: boolean;
}

const DeviceCard = ({ icon, name, model, heart }: DeviceCardProps) => (
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
    <View className="flex-row gap-3 items-center">
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
          <ConnBadge connected />
        </View>
        <Text className="text-[11px] font-medium" style={{ color: 'rgba(167,139,250,0.7)' }}>{model}</Text>
      </View>
    </View>
  </View>
);

// ─── 페어링된 기기 선택 모달 ──────────────────────────────────────
interface DevicePickerModalProps {
  visible: boolean;
  foot: FootSide | null;
  devices: BluetoothDevice[];
  scanning: boolean;
  onSelect: (device: BluetoothDevice) => void;
  onClose: () => void;
}

const DevicePickerModal = ({ visible, foot, devices, scanning, onSelect, onClose }: DevicePickerModalProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={onClose}>
      <Pressable onPress={() => {}}>
        <View
          style={{
            backgroundColor: '#150f2e',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 28,
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.2)',
            maxHeight: 420,
          }}
        >
          <View className="self-center w-10 h-1 rounded-full mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <Text className="text-[16px] font-bold text-white mb-1">
            {foot === 'L' ? '왼발' : '오른발'} 인솔 연결
          </Text>
          <Text className="text-[11px] font-medium mb-3" style={{ color: 'rgba(167,139,250,0.7)' }}>
            페어링된 기기에서 인솔을 선택하세요
          </Text>

          {scanning ? (
            <View className="py-8 items-center">
              <ActivityIndicator color="#a78bfa" />
              <Text className="text-[12px] mt-2" style={{ color: 'rgba(167,139,250,0.7)' }}>기기를 불러오는 중…</Text>
            </View>
          ) : devices.length === 0 ? (
            <Text className="text-[12px] py-8 text-center" style={{ color: 'rgba(167,139,250,0.7)' }}>
              페어링된 기기가 없어요. OS 블루투스 설정에서 인솔(HC-06 등)을 먼저 페어링해주세요.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 280 }}>
              {devices.map((d) => (
                <Pressable
                  key={d.address}
                  onPress={() => onSelect(d)}
                  className="rounded-[12px] px-[14px] py-3 mb-2 flex-row items-center justify-between"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderWidth: 0.5,
                    borderColor: 'rgba(167,139,250,0.2)',
                  }}
                >
                  <View className="flex-1">
                    <Text className="text-[13px] font-bold text-white" numberOfLines={1}>{d.name ?? '이름 없음'}</Text>
                    <Text className="text-[10px] font-medium mt-[2px]" style={{ color: 'rgba(167,139,250,0.6)' }}>{d.address}</Text>
                  </View>
                  <Text className="text-[12px] font-bold text-purple-300">연결 →</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

// ─── 실시간 센서값 패널 ───────────────────────────────────────────
const SENSOR_LABELS = ['발가락', '내측', '중족', '외측', '뒤꿈치'];

const SensorTestPanel = ({ left, right }: { left: InsolePacket | null; right: InsolePacket | null }) => (
  <View
    className="rounded-[16px] p-[14px]"
    style={{
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderWidth: 0.5,
      borderColor: 'rgba(167,139,250,0.16)',
    }}
  >
    <View className="mb-[10px]">
      <Text className="text-[13px] font-bold text-white">센서 실시간</Text>
      <Text className="text-[11px] mt-[2px] font-medium leading-[15px]" style={{ color: 'rgba(167,139,250,0.7)' }}>
        왼발·오른발 인솔의 FSR 값을 각각 표시해요
      </Text>
    </View>

    {/* 왼발·오른발 각각 개별 표시 */}
    <FootSensorRow side="왼발" packet={left} />
    <FootSensorRow side="오른발" packet={right} />

    <View
      className="flex-row gap-3 mt-1 pt-[10px] items-center"
      style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(167,139,250,0.12)' }}
    >
      <DevLegend color="#10b981" label="정상" />
      <DevLegend color="#fbbf24" label="감지 중" />
      <DevLegend color="rgba(167,139,250,0.4)" label="대기" />
    </View>
  </View>
);

// 한쪽 발의 센서 5개 값을 한 줄로 표시.
const FootSensorRow = ({ side, packet }: { side: string; packet: InsolePacket | null }) => (
  <View className="mb-3">
    <View className="flex-row items-center justify-between mb-[6px]">
      <View className="px-2 py-[3px] rounded-full" style={{ backgroundColor: 'rgba(167,139,250,0.1)' }}>
        <Text className="text-[9px] text-purple-300 font-bold tracking-[0.72px] uppercase">{side}</Text>
      </View>
      <Text className="text-[10px] font-bold" style={{ color: packet ? '#c4b5fd' : 'rgba(167,139,250,0.5)' }}>
        {packet ? `누적 ${packet.steps}걸음` : '연결 안 됨'}
      </Text>
    </View>

    <View className="flex-row gap-[6px]">
      {SENSOR_LABELS.map((label, i) => {
        const value = packet ? Math.round(packet.avg[i] ?? 0) : null;
        const active = value != null && value >= HEEL_STRIKE_THRESHOLD;
        const c = value == null ? SENSOR_STATES.idle : active ? SENSOR_STATES.active : SENSOR_STATES.ok;
        return (
          <View
            key={label}
            className="flex-1 rounded-[10px] py-[10px] px-1 items-center"
            style={{ backgroundColor: c.bg, borderWidth: 0.5, borderColor: c.border }}
          >
            <View className="w-2 h-2 rounded" style={{ backgroundColor: c.dot }} />
            <Text className="text-[12px] font-bold text-white mt-[6px]">{value ?? '–'}</Text>
            <Text className="text-[8px] font-semibold mt-[1px]" style={{ color: 'rgba(167,139,250,0.6)' }}>{label}</Text>
            <Text className="text-[8px] font-bold mt-[3px] tracking-[0.48px]" style={{ color: c.text }}>{c.label}</Text>
          </View>
        );
      })}
    </View>
  </View>
);

const SENSOR_STATES = {
  ok: { dot: '#10b981', border: 'rgba(16,185,129,0.4)', bg: 'rgba(16,185,129,0.08)', text: '#6ee7b7', label: '정상' },
  active: { dot: '#fbbf24', border: 'rgba(251,191,36,0.4)', bg: 'rgba(251,191,36,0.1)', text: '#fcd34d', label: '감지' },
  idle: { dot: 'rgba(167,139,250,0.4)', border: 'rgba(167,139,250,0.18)', bg: 'rgba(167,139,250,0.04)', text: 'rgba(167,139,250,0.5)', label: '대기' },
};

const DevLegend = ({ color, label }: { color: string; label: string }) => (
  <View className="flex-row items-center gap-1">
    <View className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: color }} />
    <Text className="text-[9px] font-semibold" style={{ color: 'rgba(221,214,254,0.7)' }}>{label}</Text>
  </View>
);
