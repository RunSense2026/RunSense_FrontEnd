import { PermissionsAndroid, Platform } from 'react-native';
import RNBluetoothClassic, {
  type BluetoothDevice,
  type BluetoothDeviceReadEvent,
  type BluetoothEventSubscription,
} from 'react-native-bluetooth-classic';

import type { FootSide, InsolePacket } from '@/types/insole';
import { useInsoleStore } from '@/stores/insoleStore';

// 발별 연결 기기/수신 구독 핸들 — 연결 해제 시 정리한다.
const devices: Partial<Record<FootSide, BluetoothDevice>> = {};
const subscriptions: Partial<Record<FootSide, BluetoothEventSubscription>> = {};

// 기기가 외부 요인으로 끊겼을 때 스토어를 갱신하는 전역 리스너(최초 1회 등록).
let disconnectListener: BluetoothEventSubscription | null = null;

const cleanupFoot = (foot: FootSide) => {
  subscriptions[foot]?.remove();
  delete subscriptions[foot];
  delete devices[foot];
  useInsoleStore.getState().resetFoot(foot);
};

const ensureDisconnectListener = () => {
  if (disconnectListener) return;
  disconnectListener = RNBluetoothClassic.onDeviceDisconnected((event) => {
    (['L', 'R'] as FootSide[]).forEach((foot) => {
      if (devices[foot]?.address === event.device?.address) cleanupFoot(foot);
    });
  });
};

// Android 12+(API 31)는 BLUETOOTH_CONNECT/SCAN, 그 이전은 위치 권한이 필요하다.
export const ensureBluetoothPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const api =
    typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
  const perms =
    api >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const result = await PermissionsAndroid.requestMultiple(perms);
  return perms.every((p) => result[p] === PermissionsAndroid.RESULTS.GRANTED);
};

// 권한 + 블루투스 켜짐 여부 확인(필요 시 켜기 요청).
export const isBluetoothReady = async (): Promise<boolean> => {
  if (!(await ensureBluetoothPermissions())) return false;
  if (await RNBluetoothClassic.isBluetoothEnabled()) return true;
  return RNBluetoothClassic.requestBluetoothEnabled();
};

// OS 설정에서 미리 페어링한 기기 목록(HC-05/06 인솔을 여기서 고른다).
export const listBondedDevices = (): Promise<BluetoothDevice[]> =>
  RNBluetoothClassic.getBondedDevices();

// 한 줄(\n 구분) JSON → InsolePacket. 형식이 안 맞으면 null. (BT.println 의 \r 도 trim)
const parsePacket = (line: string): InsolePacket | null => {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const obj = JSON.parse(trimmed);
    if ((obj.foot !== 'L' && obj.foot !== 'R') || !Array.isArray(obj.avg)) return null;
    return {
      foot: obj.foot,
      timestamp: Number(obj.timestamp) || 0,
      steps: Number(obj.steps) || 0,
      stepEvent: Boolean(obj.stepEvent),
      total: Number(obj.total) || 0,
      avg: obj.avg.map((n: unknown) => Number(n) || 0),
    };
  } catch {
    return null;
  }
};

// 한쪽 인솔에 연결하고, \n 구분 JSON 스트림을 스토어로 흘려보낸다.
export const connectInsole = async (foot: FootSide, address: string): Promise<void> => {
  ensureDisconnectListener();
  const { setConnection, ingest } = useInsoleStore.getState();

  // 아두이노 BT.println 과 맞춰 \n 구분 텍스트 모드로 연결.
  const device = await RNBluetoothClassic.connectToDevice(address, { delimiter: '\n' });
  devices[foot] = device;
  setConnection(foot, { connected: true, deviceName: device.name, address: device.address });

  subscriptions[foot]?.remove();
  subscriptions[foot] = device.onDataReceived((event: BluetoothDeviceReadEvent) => {
    const packet = parsePacket(event.data);
    if (packet) ingest(packet);
  });
};

export const disconnectInsole = async (foot: FootSide): Promise<void> => {
  const device = devices[foot];
  cleanupFoot(foot);
  try {
    await device?.disconnect();
  } catch {
    // 이미 끊긴 경우 무시
  }
};
