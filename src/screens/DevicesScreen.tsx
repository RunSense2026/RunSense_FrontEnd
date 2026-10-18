import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { DarkShell, DarkNavHeader, RSTabBar, type TabId } from '@/components/domain';
import { useInsoleStore } from '@/stores/insoleStore';
import { useWatchStore } from '@/stores/watchStore';
import {
  INSOLE_TRANSPORT,
  isBluetoothReady,
  findInsoles,
  stopFindingInsoles,
  connectInsole,
  disconnectInsole,
  canRecalibrate,
  recalibrateInsole,
  bleErrorMessage,
  type InsoleCandidate,
} from '@/bluetooth/insole';
import { HEEL_STRIKE_THRESHOLD } from '@/utils/insoleMetrics';
import type { FootSide, InsolePacket } from '@/types/insole';

import { handleRootTabPress } from '@/navigation/tabRoutes';
import type { ScreenProps } from '@/types/navigation';

interface FootConn {
  connected: boolean;
  deviceName: string | null;
  packet: InsolePacket | null;
  battery: number | null;
}

export const DevicesScreen = ({ navigation }: ScreenProps<'Devices'>) => {
  const handleTabPress = (id: TabId) => handleRootTabPress(navigation, id);

  const left = useInsoleStore((s) => s.L);
  const right = useInsoleStore((s) => s.R);
  // 갤럭시 워치 — Data Layer 로 실제 연결 여부를 확인한다 (RunSense 워치 앱 설치 여부 포함)
  const watchConnected = useWatchStore((s) => s.connected);
  const watchAppInstalled = useWatchStore((s) => s.appInstalled);
  const watchName = useWatchStore((s) => s.nodeName);
  const connectedCount = (left.connected ? 1 : 0) + (right.connected ? 1 : 0) + (watchConnected ? 1 : 0);

  // 기기 선택 모달 상태
  const [pickerFoot, setPickerFoot] = useState<FootSide | null>(null);
  const [candidates, setCandidates] = useState<InsoleCandidate[]>([]);
  const [scanning, setScanning] = useState(false);
  const [busyFoot, setBusyFoot] = useState<FootSide | null>(null);

  const openPicker = async (foot: FootSide) => {
    setPickerFoot(foot);
    setScanning(true);
    setCandidates([]);
    try {
      if (!(await isBluetoothReady())) {
        setPickerFoot(null);
        Alert.alert('블루투스가 필요해요', '블루투스 권한을 허용하고 블루투스를 켜주세요.');
        return;
      }
      await findInsoles(foot, setCandidates);
    } catch (e) {
      setPickerFoot(null);
      Alert.alert(
        '오류',
        INSOLE_TRANSPORT[foot] === 'ble'
          ? bleErrorMessage(e)
          : '페어링된 기기를 불러오지 못했어요. OS 설정에서 인솔을 먼저 페어링했는지 확인해주세요.',
      );
    } finally {
      setScanning(false);
    }
  };

  const closePicker = () => {
    stopFindingInsoles();
    setPickerFoot(null);
  };

  const handleSelect = async (candidate: InsoleCandidate) => {
    const foot = pickerFoot;
    if (!foot) return;
    closePicker();
    setBusyFoot(foot);
    try {
      await connectInsole(foot, candidate.id);
    } catch {
      Alert.alert('연결 실패', `${candidate.name ?? candidate.id} 에 연결하지 못했어요.`);
    } finally {
      setBusyFoot(null);
    }
  };

  // 영점 재조정 — 펌웨어가 약 1.5초간 무부하 값을 재므로 인솔에서 발을 뗀 상태여야 한다.
  const handleRecalibrate = (foot: FootSide) => {
    Alert.alert('영점 조정', '인솔에서 발을 떼고 아무것도 올려두지 않은 상태에서 진행해주세요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '조정',
        onPress: async () => {
          setBusyFoot(foot);
          try {
            await recalibrateInsole(foot);
          } catch {
            Alert.alert('영점 조정 실패', '인솔 연결 상태를 확인해주세요.');
          } finally {
            setBusyFoot(null);
          }
        },
      },
    ]);
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

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14 }}>
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
          onRecalibrate={canRecalibrate('L') ? () => handleRecalibrate('L') : undefined}
        />
        <InsoleCard
          side="R"
          name="오른발 인솔"
          conn={right}
          busy={busyFoot === 'R'}
          onConnect={() => openPicker('R')}
          onDisconnect={() => handleDisconnect('R')}
          onRecalibrate={canRecalibrate('R') ? () => handleRecalibrate('R') : undefined}
        />
        <DeviceCard
          icon="♥"
          name="심박 (Galaxy Watch)"
          model={
            !watchConnected
              ? '워치 미연결 · Galaxy Wearable 앱에서 페어링'
              : watchAppInstalled
                ? `${watchName ?? 'Galaxy Watch'} · RunSense 워치 앱`
                : `${watchName ?? 'Galaxy Watch'} · 워치 앱 설치 필요`
          }
          connected={watchConnected}
          heart
        />

        <SensorTestPanel left={left.packet} right={right.packet} />
      </ScrollView>

      <DevicePickerModal
        visible={pickerFoot != null}
        foot={pickerFoot}
        devices={candidates}
        scanning={scanning}
        onSelect={handleSelect}
        onRescan={() => pickerFoot && openPicker(pickerFoot)}
        onClose={closePicker}
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
  /** BLE 인솔만 — 연결돼 있을 때 영점 재조정 버튼을 보인다 */
  onRecalibrate?: () => void;
}

const InsoleCard = ({ side, name, conn, busy, onConnect, onDisconnect, onRecalibrate }: InsoleCardProps) => {
  const model = conn.connected
    ? conn.deviceName ?? `RunSense-${side}`
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
            {conn.connected && conn.battery != null && <BatteryBadge percent={conn.battery} />}
          </View>
          <Text className="text-[11px] font-medium" style={{ color: 'rgba(167,139,250,0.7)' }} numberOfLines={1}>
            {model}
          </Text>
        </View>

        {conn.connected && onRecalibrate && (
          <Pressable
            onPress={onRecalibrate}
            disabled={busy}
            className="px-[10px] h-8 rounded-lg items-center justify-center"
            style={{
              backgroundColor: 'rgba(124,58,237,0.12)',
              borderWidth: 0.5,
              borderColor: 'rgba(167,139,250,0.35)',
            }}
          >
            <Text className="text-[12px] font-bold" style={{ color: '#ddd6fe' }}>영점</Text>
          </Pressable>
        )}

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

// 리튬 배터리 잔량 — 20% 이하 빨강, 50% 이하 주황.
const BatteryBadge = ({ percent }: { percent: number }) => {
  const c =
    percent <= 20
      ? { fg: '#fca5a5', bg: 'rgba(239,68,68,0.14)', border: 'rgba(239,68,68,0.4)' }
      : percent <= 50
        ? { fg: '#fcd34d', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.4)' }
        : { fg: '#6ee7b7', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)' };
  const fill = (12 * percent) / 100;
  return (
    <View
      className="px-[6px] py-[2px] rounded-full flex-row items-center gap-[3px]"
      style={{ backgroundColor: c.bg, borderWidth: 0.5, borderColor: c.border }}
    >
      <Svg width={12} height={8} viewBox="0 0 24 14" fill="none">
        <Path d="M2 2h17v10H2z" stroke={c.fg} strokeWidth={2.2} strokeLinejoin="round" />
        <Path d="M22 5.5v3" stroke={c.fg} strokeWidth={2.2} strokeLinecap="round" />
        <Path d={`M4.5 4.5h${fill}v5h-${fill}z`} fill={c.fg} />
      </Svg>
      <Text className="text-[9px] font-bold" style={{ color: c.fg }}>{percent}%</Text>
    </View>
  );
};

// ─── 정적 기기 카드 (Galaxy Watch 심박) ───────────────────────────
interface DeviceCardProps {
  icon: string;
  name: string;
  model: string;
  connected?: boolean;
  heart?: boolean;
}

const DeviceCard = ({ icon, name, model, connected = true, heart }: DeviceCardProps) => (
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
          <ConnBadge connected={connected} />
        </View>
        <Text className="text-[11px] font-medium" style={{ color: 'rgba(167,139,250,0.7)' }}>{model}</Text>
      </View>
    </View>
  </View>
);

// ─── 인솔 선택 모달 (클래식: 페어링 목록 / BLE: 주변 스캔) ─────────
interface DevicePickerModalProps {
  visible: boolean;
  foot: FootSide | null;
  devices: InsoleCandidate[];
  scanning: boolean;
  onSelect: (device: InsoleCandidate) => void;
  onRescan: () => void;
  onClose: () => void;
}

const DevicePickerModal = ({ visible, foot, devices, scanning, onSelect, onRescan, onClose }: DevicePickerModalProps) => {
  const isBle = foot != null && INSOLE_TRANSPORT[foot] === 'ble';
  return (
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
              {isBle ? '주변의 RunSense 인솔을 선택하세요 (페어링 필요 없음)' : '페어링된 기기에서 인솔을 선택하세요'}
            </Text>

            {devices.length === 0 ? (
              scanning ? (
                <View className="py-8 items-center">
                  <ActivityIndicator color="#a78bfa" />
                  <Text className="text-[12px] mt-2" style={{ color: 'rgba(167,139,250,0.7)' }}>
                    {isBle ? '주변 인솔을 찾는 중…' : '기기를 불러오는 중…'}
                  </Text>
                </View>
              ) : (
                <View className="py-6 items-center">
                  <Text className="text-[12px] text-center" style={{ color: 'rgba(167,139,250,0.7)' }}>
                    {isBle
                      ? '주변에서 인솔을 찾지 못했어요. 인솔 전원을 켜고 휴대폰 가까이에 둔 뒤 다시 찾아주세요.'
                      : '페어링된 기기가 없어요. OS 블루투스 설정에서 인솔(HC-06 등)을 먼저 페어링해주세요.'}
                  </Text>
                  {isBle && <RescanButton onPress={onRescan} />}
                </View>
              )
            ) : (
              <ScrollView style={{ maxHeight: 280 }}>
                {devices.map((d) => (
                  <Pressable
                    key={d.id}
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
                      <Text className="text-[10px] font-medium mt-[2px]" style={{ color: 'rgba(167,139,250,0.6)' }}>{d.id}</Text>
                    </View>
                    <Text className="text-[12px] font-bold text-purple-300">연결 →</Text>
                  </Pressable>
                ))}
                {isBle &&
                  (scanning ? (
                    <View className="flex-row items-center justify-center gap-2 py-2">
                      <ActivityIndicator size="small" color="#a78bfa" />
                      <Text className="text-[11px]" style={{ color: 'rgba(167,139,250,0.7)' }}>더 찾는 중…</Text>
                    </View>
                  ) : (
                    <RescanButton onPress={onRescan} />
                  ))}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const RescanButton = ({ onPress }: { onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    className="self-center mt-3 px-[14px] h-8 rounded-lg items-center justify-center"
    style={{
      backgroundColor: 'rgba(124,58,237,0.18)',
      borderWidth: 0.5,
      borderColor: 'rgba(167,139,250,0.45)',
    }}
  >
    <Text className="text-[12px] font-bold" style={{ color: '#ddd6fe' }}>다시 찾기</Text>
  </Pressable>
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
