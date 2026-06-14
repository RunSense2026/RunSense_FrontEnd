// FSR 인솔(아두이노 + HC-05/06)이 \n 구분 JSON 으로 보내는 데이터 타입.
// 예) {"foot":"R","timestamp":12345,"steps":10,"stepEvent":false,"total":123.4,"avg":[1.1,2.2,3.3,4.4,5.5]}

export type FootSide = 'L' | 'R';

export interface InsolePacket {
  /** 어느 쪽 발인지 (L/R) */
  foot: FootSide;
  /** 아두이노 내부 millis() 타임스탬프 */
  timestamp: number;
  /** 누적 걸음 수 (아두이노 자체 집계) */
  steps: number;
  /** 이 패킷이 스텝 추가 이벤트인지 */
  stepEvent: boolean;
  /** 발바닥 전체 압력 총합 */
  total: number;
  /** 센서 5개(A0~A4) 평균 압력. index 4 = 뒤꿈치(5번 센서) */
  avg: number[];
}
