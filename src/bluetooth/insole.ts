import { PermissionsAndroid, Platform } from 'react-native';
import RNBluetoothClassic, {
  type BluetoothDevice,
  type BluetoothDeviceReadEvent,
  type BluetoothEventSubscription,
} from 'react-native-bluetooth-classic';

import type { FootSide } from '@/types/insole';
import { useInsoleStore } from '@/stores/insoleStore';
import { handleInsoleMessage } from './packet';
import {
  scanBleInsoles,
  stopBleScan,
  connectBleInsole,
  disconnectBleInsole,
  recalibrateBleInsole,
} from './insoleBle';

export { bleErrorMessage } from './insoleBle';

export type InsoleTransport = 'classic' | 'ble';

// 발별 인솔 하드웨어 — 오른발은 Arduino Nano 33 BLE, 왼발은 아직 HC-05/06(블루투스 클래식).
// 왼발도 Nano 33 BLE 로 바꾸면 L 을 'ble' 로만 바꾸면 된다.
export const INSOLE_TRANSPORT: Record<FootSide, InsoleTransport> = { L: 'classic', R: 'ble' };

/** 연결 후보 기기 — classic 은 페어링 목록, ble 는 주변 스캔 결과. id = MAC 주소 */
export interface InsoleCandidate {
  id: string;
  name: string | null;
}

// ─── 블루투스 클래식 (HC-05/06) ───────────────────────────────────

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

// 한쪽 인솔에 연결하고, \n 구분 JSON 스트림을 스토어로 흘려보낸다.
const connectClassicInsole = async (foot: FootSide, address: string): Promise<void> => {
  ensureDisconnectListener();
  const { setConnection } = useInsoleStore.getState();

  // 아두이노 BT.println 과 맞춰 \n 구분 텍스트 모드로 연결.
  const device = await RNBluetoothClassic.connectToDevice(address, { delimiter: '\n' });
  devices[foot] = device;
  setConnection(foot, { connected: true, deviceName: device.name, address: device.address });

  subscriptions[foot]?.remove();
  subscriptions[foot] = device.onDataReceived((event: BluetoothDeviceReadEvent) => {
    handleInsoleMessage(foot, event.data);
  });
};

const disconnectClassicInsole = async (foot: FootSide): Promise<void> => {
  const device = devices[foot];
  cleanupFoot(foot);
  try {
    await device?.disconnect();
  } catch {
    // 이미 끊긴 경우 무시
  }
};

// ─── 공통 ─────────────────────────────────────────────────────────

// Android 12+(API 31)는 BLUETOOTH_CONNECT/SCAN, 그 이전은 위치 권한이 필요하다(BLE 스캔 포함).
export const ensureBluetoothPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const api =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : parseInt(String(Platform.Version), 10);
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

// 권한 + 블루투스 켜짐 여부 확인(필요 시 켜기 요청). 클래식·BLE 가 같은 어댑터를 쓴다.
export const isBluetoothReady = async (): Promise<boolean> => {
  if (!(await ensureBluetoothPermissions())) return false;
  if (await RNBluetoothClassic.isBluetoothEnabled()) return true;
  return RNBluetoothClassic.requestBluetoothEnabled();
};

// 발에 맞는 방식으로 연결 후보를 찾는다.
// classic: OS 설정에서 미리 페어링한 기기 목록을 한 번에. ble: 주변 스캔 결과를 찾는 대로 갱신.
export const findInsoles = async (
  foot: FootSide,
  onUpdate: (candidates: InsoleCandidate[]) => void,
): Promise<void> => {
  if (INSOLE_TRANSPORT[foot] === 'ble') {
    const found: InsoleCandidate[] = [];
    await scanBleInsoles((c) => {
      found.push(c);
      onUpdate([...found]);
    });
    return;
  }
  const bonded = await RNBluetoothClassic.getBondedDevices();
  onUpdate(bonded.map((d) => ({ id: d.address, name: d.name })));
};

export const stopFindingInsoles = stopBleScan;

export const connectInsole = (foot: FootSide, id: string): Promise<void> =>
  INSOLE_TRANSPORT[foot] === 'ble' ? connectBleInsole(foot, id) : connectClassicInsole(foot, id);

export const disconnectInsole = (foot: FootSide): Promise<void> =>
  INSOLE_TRANSPORT[foot] === 'ble' ? disconnectBleInsole(foot) : disconnectClassicInsole(foot);

/** 앱에서 영점 재조정을 지원하는지 (BLE 펌웨어만 RX 명령을 받는다) */
export const canRecalibrate = (foot: FootSide) => INSOLE_TRANSPORT[foot] === 'ble';

export const recalibrateInsole = (foot: FootSide): Promise<void> => recalibrateBleInsole(foot);
