import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { createCoaching } from '@/api';
import type { AiCoachingRequestDto, AiCoachingWithVoiceDto } from '@/types/aiApi';

// 실시간 러닝 중 일정 간격(기본 60초)으로 AI 코칭을 생성한다.
// getMetrics 는 호출 시점의 현재 지표(페이스·심박·케이던스 등)를 반환한다.
// 화면이 포커스된 동안만, 일시정지가 아닐 때만 동작하며 최신 코칭을 반환한다.
export const useLiveCoaching = (
  paused: boolean,
  getMetrics: () => AiCoachingRequestDto,
  intervalMs = 60000,
): AiCoachingWithVoiceDto | null => {
  const [latest, setLatest] = useState<AiCoachingWithVoiceDto | null>(null);

  // 콜백 안에서 항상 최신 getMetrics 를 쓰도록 ref 로 보관(인터벌 재생성 방지).
  const getRef = useRef(getMetrics);
  getRef.current = getMetrics;

  useFocusEffect(
    useCallback(() => {
      if (paused) return;
      const id = setInterval(() => {
        createCoaching(getRef.current())
          .then(setLatest)
          .catch(() => {
            // 콜드 스타트/네트워크 오류는 조용히 무시하고 다음 주기를 기다린다.
          });
      }, intervalMs);
      return () => clearInterval(id);
    }, [paused, intervalMs]),
  );

  return latest;
};
