import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { createCoaching, resolveVoiceUrl } from '@/api';
import { useProfileStore } from '@/stores/profileStore';
import { ageFromBirthDate } from '@/utils/profile';
import type { AiCoachingRequestDto, AiCoachingWithVoiceDto, AiUserProfileDto } from '@/types/aiApi';

const toNumberOrNull = (value: string): number | null => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

// 코칭 개인화용 프로필 — 마이페이지 값(서버 프로필 캐시)에서 만든다. 아무 값도 없으면 보내지 않는다.
const currentCoachingProfile = (): AiUserProfileDto | null => {
  const p = useProfileStore.getState();
  const profile: AiUserProfileDto = {
    age: ageFromBirthDate(p.birthDate),
    height: toNumberOrNull(p.height),
    weight: toNumberOrNull(p.weight),
    restingHeartRate: toNumberOrNull(p.restingHr),
    lthr: toNumberOrNull(p.lthr),
  };
  return Object.values(profile).some((v) => v != null) ? profile : null;
};

export interface LiveCoachingResult {
  /** 가장 최근에 생성된 코칭 (코치 카드 표시용) */
  latest: AiCoachingWithVoiceDto | null;
  /** 최근 코칭의 TTS 음성 재생 URL (없으면 null) — RSVoiceAutoPlay 에 그대로 넘긴다 */
  voiceUrl: string | null;
  /** 러닝 중 생성된 전체 코칭 목록 (종료 후 저장·요약 생성에 사용) */
  all: AiCoachingWithVoiceDto[];
}

// 실시간 러닝 중 일정 간격(기본 60초)으로 AI 코칭을 생성하고 누적한다.
// getMetrics 는 호출 시점의 현재 지표(페이스·심박·케이던스·양발 센서)를 반환한다.
// 화면이 포커스된 동안만, 일시정지가 아닐 때만 동작한다.
export const useLiveCoaching = (
  paused: boolean,
  getMetrics: () => AiCoachingRequestDto,
  intervalMs = 60000,
): LiveCoachingResult => {
  const [coachings, setCoachings] = useState<AiCoachingWithVoiceDto[]>([]);

  const getRef = useRef(getMetrics);
  getRef.current = getMetrics;

  // 이전 요청이 아직 끝나지 않았으면(콜드 스타트 등) 다음 주기를 건너뛴다.
  const inFlight = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (paused) return;
      const id = setInterval(() => {
        if (inFlight.current) return;
        inFlight.current = true;
        createCoaching({ profile: currentCoachingProfile(), ...getRef.current() })
          .then((c) => setCoachings((prev) => [...prev, c]))
          .catch(() => {
            // 콜드 스타트/네트워크 오류는 조용히 무시하고 다음 주기를 기다린다.
          })
          .finally(() => {
            inFlight.current = false;
          });
      }, intervalMs);
      return () => clearInterval(id);
    }, [paused, intervalMs]),
  );

  const latest = coachings.length > 0 ? coachings[coachings.length - 1] : null;

  return {
    latest,
    voiceUrl: resolveVoiceUrl(latest?.voiceFile),
    all: coachings,
  };
};
