import {
  BleManager,
  BleErrorCode,
  type BleError,
  type Device,
  type Subscription,
} from 'react-native-ble-plx';

import type { FootSide } from '@/types/insole';
import { useInsoleStore } from '@/stores/insoleStore';
import { handleInsoleMessage } from './packet';

// Arduino Nano 33 BLE 인솔 — Nordic UART Service(NUS)로 JSON 패킷을 notify 한다(\n 구분 없음).
//   RX(앱→인솔): 'c' 를 쓰면 영점 재조정
//   TX(인솔→앱): {"foot","timestamp","steps","stepEvent","total","avg":[5]}
// 표준 Battery Service(0x180F / 0x2A19)로 리튬 배터리 잔량(0~100%)도 보낸다.
const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_RX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const BATTERY_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';
const BATTERY_LEVEL = '00002a19-0000-1000-8000-00805f9b34fb';

// 패킷 하나가 ~120바이트라 기본 MTU(23 → 20바이트)로는 notify 가 잘린다. 펌웨어 txChar 최대 160바이트.
const REQUEST_MTU = 185;
const MIN_PACKET_MTU = 163;
const CONNECT_TIMEOUT_MS = 10000;
const SCAN_TIMEOUT_MS = 8000;
// 조각난 notify 를 이어 붙일 때의 상한 — 넘으면 깨진 데이터로 보고 버린다.
const MAX_BUFFER_LEN = 512;
// 'c' (영점 재조정 명령)
const RECALIBRATE_CMD_B64 = 'Yw==';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// ble-plx 는 값을 base64 로 준다 — 펌웨어가 ASCII 만 보내므로 바이트 = 문자로 디코딩.
const decodeBase64 = (b64: string): string => {
  let out = '';
  let bits = 0;
  let acc = 0;
  for (const ch of b64) {
    const v = BASE64_CHARS.indexOf(ch);
    if (v < 0) continue; // '=' 패딩 등
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((acc >> bits) & 0xff);
    }
  }
  return out;
};

export interface BleInsoleCandidate {
  id: string;
  name: string | null;
}

let manager: BleManager | null = null;
const getManager = () => {
  if (!manager) manager = new BleManager();
  return manager;
};

// 발별 연결 기기/구독 — 연결 해제 시 정리한다.
const devices: Partial<Record<FootSide, Device>> = {};
const subscriptions: Partial<Record<FootSide, Subscription[]>> = {};

let stopScan: (() => void) | null = null;

const cleanupFoot = (foot: FootSide) => {
  subscriptions[foot]?.forEach((s) => s.remove());
  delete subscriptions[foot];
  delete devices[foot];
  useInsoleStore.getState().resetFoot(foot);
};

// 블루투스/위치 꺼짐 등 스캔 실패 사유를 사용자 문구로.
export const bleErrorMessage = (error: unknown): string => {
  switch ((error as BleError | undefined)?.errorCode) {
    case BleErrorCode.LocationServicesDisabled:
      return '위치 서비스를 켜야 주변 인솔을 찾을 수 있어요.';
    case BleErrorCode.BluetoothPoweredOff:
      return '블루투스를 켜주세요.';
    case BleErrorCode.BluetoothUnauthorized:
      return '블루투스 권한을 허용해주세요.';
    default:
      return '주변 인솔을 찾지 못했어요. 잠시 후 다시 시도해주세요.';
  }
};

// NUS 서비스를 광고하는 주변 인솔을 찾는다. 찾을 때마다 onFound, 시간이 지나거나 stopBleScan 하면 끝난다.
export const scanBleInsoles = (
  onFound: (candidate: BleInsoleCandidate) => void,
  timeoutMs = SCAN_TIMEOUT_MS,
): Promise<void> => {
  stopScan?.();
  const m = getManager();
  return new Promise((resolve, reject) => {
    const seen = new Set<string>();
    const finish = (error?: BleError) => {
      clearTimeout(timer);
      if (stopScan === finish) stopScan = null;
      void m.stopDeviceScan();
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => finish(), timeoutMs);
    stopScan = finish;

    m.startDeviceScan([NUS_SERVICE], null, (error, device) => {
      if (error) {
        finish(error);
        return;
      }
      if (!device || seen.has(device.id)) return;
      seen.add(device.id);
      onFound({ id: device.id, name: device.localName ?? device.name });
    }).catch((e: BleError) => finish(e));
  });
};

export const stopBleScan = () => stopScan?.();

// 인솔에 연결하고 TX(JSON)·배터리 notify 를 스토어로 흘려보낸다.
export const connectBleInsole = async (foot: FootSide, id: string): Promise<void> => {
  stopBleScan();
  const m = getManager();
  const { setConnection, setBattery } = useInsoleStore.getState();

  const device = await m.connectToDevice(id, {
    requestMTU: REQUEST_MTU,
    timeout: CONNECT_TIMEOUT_MS,
  });
  try {
    await device.discoverAllServicesAndCharacteristics();
  } catch (e) {
    await m.cancelDeviceConnection(id).catch(() => {});
    throw e;
  }
  if (__DEV__ && (device.mtu ?? 0) < MIN_PACKET_MTU) {
    console.warn(`[insole] BLE MTU ${device.mtu} — 패킷이 잘려 수신이 안 될 수 있어요.`);
  }

  subscriptions[foot]?.forEach((s) => s.remove());
  devices[foot] = device;
  setConnection(foot, {
    connected: true,
    deviceName: device.localName ?? device.name ?? `RunSense-${foot}`,
    address: device.id,
  });

  // notify 한 번 = JSON 한 개가 정상이지만, 조각나서 오면 '{' 부터 '}' 까지 이어 붙인다.
  let buffer = '';
  const onBattery = (value: string | null | undefined) => {
    if (!value) return;
    setBattery(foot, decodeBase64(value).charCodeAt(0));
  };

  subscriptions[foot] = [
    // 이 연결이 아직 현재 연결일 때만 정리 — 재연결 직후 이전 연결의 해제 이벤트가 새 연결을 지우지 않게.
    m.onDeviceDisconnected(id, () => {
      if (devices[foot] === device) cleanupFoot(foot);
    }),
    device.monitorCharacteristicForService(NUS_SERVICE, NUS_TX, (error, ch) => {
      if (error || !ch?.value) return;
      const chunk = decodeBase64(ch.value);
      buffer = chunk.startsWith('{') ? chunk : buffer + chunk;
      if (!buffer.trimEnd().endsWith('}')) {
        if (buffer.length > MAX_BUFFER_LEN) buffer = '';
        return;
      }
      handleInsoleMessage(foot, buffer);
      buffer = '';
    }),
    device.monitorCharacteristicForService(BATTERY_SERVICE, BATTERY_LEVEL, (error, ch) => {
      if (!error) onBattery(ch?.value);
    }),
  ];

  // 배터리는 10초 주기로만 notify 되므로 연결 직후 한 번 읽어 둔다.
  device
    .readCharacteristicForService(BATTERY_SERVICE, BATTERY_LEVEL)
    .then((ch) => onBattery(ch.value))
    .catch(() => {});
};

export const disconnectBleInsole = async (foot: FootSide): Promise<void> => {
  const device = devices[foot];
  cleanupFoot(foot);
  if (!device) return;
  try {
    await getManager().cancelDeviceConnection(device.id);
  } catch {
    // 이미 끊긴 경우 무시
  }
};

// 인솔 영점 재조정 — 펌웨어가 약 1.5초간 무부하 값을 다시 재서 플래시에 저장한다.
export const recalibrateBleInsole = async (foot: FootSide): Promise<void> => {
  const device = devices[foot];
  if (!device) throw new Error('인솔이 연결돼 있지 않아요.');
  await device.writeCharacteristicWithoutResponseForService(
    NUS_SERVICE,
    NUS_RX,
    RECALIBRATE_CMD_B64,
  );
};
