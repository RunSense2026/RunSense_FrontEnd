import type { FootSide, InsolePacket } from '@/types/insole';
import { useInsoleStore } from '@/stores/insoleStore';

// 한 줄 JSON → InsolePacket. 형식이 안 맞으면 null. (BT.println 의 \r 도 trim)
export const parsePacket = (line: string): InsolePacket | null => {
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

const warnedMismatch: Partial<Record<FootSide, boolean>> = {};

// 수신한 JSON 한 덩어리를 스토어로 넘긴다.
// 발 구분은 패킷의 foot 대신 '연결한 슬롯'을 따른다 — 펌웨어 FOOT_ID 를 잘못 올려도 반대쪽에 섞이지 않게.
export const handleInsoleMessage = (foot: FootSide, text: string) => {
  const packet = parsePacket(text);
  if (!packet) return;
  if (__DEV__ && packet.foot !== foot && !warnedMismatch[foot]) {
    warnedMismatch[foot] = true;
    console.warn(
      `[insole] ${foot} 슬롯 인솔이 foot:"${packet.foot}" 로 보내고 있어요. 펌웨어 FOOT_ID 를 확인하세요.`,
    );
  }
  useInsoleStore.getState().ingest(packet.foot === foot ? packet : { ...packet, foot });
};
