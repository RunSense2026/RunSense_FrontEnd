import { useEffect, useRef } from 'react';

import { useWatchHeartRate, useWatchLive } from '@/stores/watchStore';
import { isWearSupported, wearBridge } from '@/wear/wearBridge';
import type { AiCoachingWithVoiceDto } from '@/types/aiApi';

/** 최근 5분 = 1초 tick × 300 */
const RECENT_HR_SAMPLES = 300;

export interface WatchRunLink {
  /** 현재 심박(bpm) — 워치 실측값, 측정 안 되면 0 */
  hr: number;
  /** 현재 케이던스(spm) */
  cad: number;
  /** 심박이 워치 센서에서 온 값인지 */
  hrFromWatch: boolean;
  /** 최근 5분 심박 샘플(1초 간격, 실측만) — 스파크라인용 */
  recentHr: number[];
  /** 러닝 전체 평균 심박 (리포트 저장용) — 워치 실측 샘플만 평균, 없으면 undefined */
  avgHr: number | undefined;
  /** 러닝 전체 평균 케이던스 — 워치·인솔 실측 샘플만 평균, 없으면 undefined */
  avgCad: number | undefined;
  /** 워치가 인솔+케이던스로 계산한 폼 점수 (워치 미연결이면 undefined) */
  formScore: number | undefined;
}

/**
 * 폰 러닝 화면(DashboardA)과 갤럭시 워치를 잇는다.
 *
 *  - 심박은 워치 실측값만 쓴다. 폰 러닝 중 워치가 `/runsense/hr` 로 따로 보내는 값을 우선하고,
 *    워치에서도 러닝 중이면 `/runsense/run/live` 값을 쓴다. 둘 다 없으면 0(화면엔 --).
 *  - 케이던스·폼 점수는 `/runsense/run/live` 값을 쓴다. 케이던스는 워치가 없으면
 *    인솔 걸음 수(insoleCadence)로, 둘 다 없으면 시뮬레이션 값으로 폴백한다.
 *    케이던스 시뮬레이션 값은 화면 표시용일 뿐 리포트 평균(avgCad)에는 넣지 않는다.
 *  - 화면에 있는 동안 폰 러닝 중임을 워치에 알려, 워치가 기록 저장·코칭 생성을 폰에 맡기게 한다.
 *  - 폰이 만든 AI 코칭을 워치 화면에도 띄운다.
 */
export const useWatchRunLink = (
  tick: number,
  latestCoaching: AiCoachingWithVoiceDto | null,
  targetPaceSpk?: number,
  /** 인솔 걸음으로 계산한 현재 케이던스(spm) — 인솔 미연결이면 0 */
  insoleCadence = 0,
): WatchRunLink => {
  const live = useWatchLive();
  const relayHr = useWatchHeartRate();

  const simulatedCad = 178 + Math.round(Math.sin(tick / 3) * 2);

  const hr = relayHr > 0 ? relayHr : live && live.heartRate > 0 ? live.heartRate : 0;
  const hrFromWatch = hr > 0;
  const realCad = live && live.cadence > 0 ? live.cadence : insoleCadence;
  const cad = realCad > 0 ? realCad : simulatedCad;

  // 1초(tick)마다 실측 샘플만 평균에 쌓는다.
  const hrSum = useRef(0);
  const hrCount = useRef(0);
  const cadSum = useRef(0);
  const cadCount = useRef(0);
  const recentHr = useRef<number[]>([]);
  useEffect(() => {
    if (hrFromWatch) {
      hrSum.current += hr;
      hrCount.current += 1;
      recentHr.current = [...recentHr.current, hr].slice(-RECENT_HR_SAMPLES);
    }
    if (realCad > 0) {
      cadSum.current += realCad;
      cadCount.current += 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // 폰 러닝 진행 중 표시 — 진입 시 켜고 화면을 떠나면 끈다.
  useEffect(() => {
    if (!isWearSupported()) return;
    void wearBridge.sendPhoneRunState(true, targetPaceSpk);
    return () => {
      void wearBridge.sendPhoneRunState(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 새 코칭이 생기면 워치에도 보여 준다 (음성은 폰이 재생).
  useEffect(() => {
    if (!isWearSupported() || !latestCoaching) return;
    void wearBridge.sendCoaching({
      feedbackText: latestCoaching.feedbackText,
      focusPoint: latestCoaching.focusPoint,
      recExercise: latestCoaching.recExercise,
    });
  }, [latestCoaching]);

  return {
    hr,
    cad,
    hrFromWatch,
    recentHr: recentHr.current,
    avgHr: hrCount.current > 0 ? Math.round(hrSum.current / hrCount.current) : undefined,
    avgCad: cadCount.current > 0 ? Math.round(cadSum.current / cadCount.current) : undefined,
    formScore: live?.formScore && live.formScore > 0 ? live.formScore : undefined,
  };
};
