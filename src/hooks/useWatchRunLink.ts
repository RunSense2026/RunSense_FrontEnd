import { useEffect, useRef } from 'react';

import { useWatchLive } from '@/stores/watchStore';
import { isWearSupported, wearBridge } from '@/wear/wearBridge';
import type { AiCoachingWithVoiceDto } from '@/types/aiApi';

export interface WatchRunLink {
  /** 현재 심박(bpm) — 워치 값이 있으면 워치, 없으면 시뮬레이션 */
  hr: number;
  /** 현재 케이던스(spm) */
  cad: number;
  /** 심박이 워치 센서에서 온 값인지 */
  hrFromWatch: boolean;
  /** 러닝 전체 평균 심박 (리포트 저장용) */
  avgHr: number;
  /** 러닝 전체 평균 케이던스 */
  avgCad: number;
  /** 워치가 인솔+케이던스로 계산한 폼 점수 (워치 미연결이면 undefined) */
  formScore: number | undefined;
}

/**
 * 폰 러닝 화면(DashboardA)과 갤럭시 워치를 잇는다.
 *
 *  - 워치가 `/runsense/run/live` 로 보내는 심박·케이던스·폼 점수를 화면 값으로 쓴다.
 *    (워치가 없으면 기존 시뮬레이션 값으로 자연스럽게 폴백)
 *  - 화면에 있는 동안 폰 러닝 중임을 워치에 알려, 워치가 기록 저장·코칭 생성을 폰에 맡기게 한다.
 *  - 폰이 만든 AI 코칭을 워치 화면에도 띄운다.
 */
export const useWatchRunLink = (
  tick: number,
  latestCoaching: AiCoachingWithVoiceDto | null,
  targetPaceSpk?: number,
): WatchRunLink => {
  const live = useWatchLive();

  const simulatedHr = 156 + Math.round(Math.sin(tick / 4) * 3);
  const simulatedCad = 178 + Math.round(Math.sin(tick / 3) * 2);

  const hrFromWatch = !!live && live.heartRate > 0;
  const hr = hrFromWatch ? live!.heartRate : simulatedHr;
  const cad = live && live.cadence > 0 ? live.cadence : simulatedCad;

  // 1초(tick)마다 한 샘플씩 평균을 쌓는다.
  const hrSum = useRef(0);
  const hrCount = useRef(0);
  const cadSum = useRef(0);
  const cadCount = useRef(0);
  useEffect(() => {
    if (hr > 0) {
      hrSum.current += hr;
      hrCount.current += 1;
    }
    if (cad > 0) {
      cadSum.current += cad;
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
    avgHr: hrCount.current > 0 ? Math.round(hrSum.current / hrCount.current) : hr,
    avgCad: cadCount.current > 0 ? Math.round(cadSum.current / cadCount.current) : cad,
    formScore: live?.formScore && live.formScore > 0 ? live.formScore : undefined,
  };
};
