import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from '@/types/navigation';

// 화면 밖(워치 메시지 핸들러 등)에서 내비게이션하기 위한 ref.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const navigateFromOutside = <T extends keyof RootStackParamList>(
  name: T,
  params?: RootStackParamList[T],
): void => {
  if (!navigationRef.isReady()) return;
  // @ts-expect-error — 제네릭 파라미터 튜플 추론 한계 (런타임에는 문제 없음)
  navigationRef.navigate(name, params);
};
