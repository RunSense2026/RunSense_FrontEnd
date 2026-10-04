import { useEffect, useState } from 'react';

import { fetchNearbyParks } from '@/api';
import type { ParkResponseDto, ParkTag } from '@/types/api';

import type { ResolvedLocation } from './useResolvedLocation';

/** 화면에 보여줄 추천 공원 수 (서버 허용 1~10) */
const PARK_LIMIT = 5;

export interface NearbyParksState {
  parks: ParkResponseDto[];
  loading: boolean;
  error: string | null;
}

/**
 * 현재 위치 주변 공원 추천 (`GET /api/course/nearby`).
 * 좌표가 정해지면(`ready`) 조회하고, 위치·시설 태그 필터가 바뀌면 다시 조회한다.
 * 면적 필터는 서버 기본값(10,000㎡ 이상)을 따른다 — 러닝할 만한 크기의 공원만 받기 위함.
 */
export const useNearbyParks = (
  { lat, lon, ready }: ResolvedLocation,
  tags: ParkTag[],
): NearbyParksState => {
  const [parks, setParks] = useState<ParkResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 배열은 렌더마다 새로 만들어지므로 내용으로 의존성을 건다.
  const tagKey = tags.join(',');

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchNearbyParks({ lat, lon, limit: PARK_LIMIT, tags: tagKey ? (tagKey.split(',') as ParkTag[]) : undefined })
      .then((data) => {
        if (!cancelled) setParks(data);
      })
      .catch(() => {
        if (!cancelled) setError('주변 공원을 불러오지 못했어요.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, lat, lon, tagKey]);

  return { parks, loading, error };
};
