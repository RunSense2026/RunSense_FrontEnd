import { useEffect, useRef, useState } from 'react';

// 이징 스텝 간격(ms). 16ms(60fps)면 구독 화면이 그만큼 리렌더돼 JS 스레드를 잡아먹는다.
// 페이스 같은 숫자 표시엔 ~12fps 로도 충분히 부드럽고, 전체 화면 리렌더는 ~5배 줄어든다.
const STEP_MS = 80;
// 스텝당 이동 비율을 STEP_MS 에 맞춰 키워, 더 적은 프레임으로 같은 시간에 수렴하게 한다.
const STEP_SCALE = STEP_MS / 16;

// Smoothly ease a numeric value toward `target`. Mirrors useTicker in runsense-ui.jsx
// but uses setInterval-driven steps since RN doesn't expose requestAnimationFrame
// reliably outside of Reanimated's worklets.
export const useTicker = (target: number, speed = 0.04): number => {
  const [val, setVal] = useState(target);
  const cur = useRef(target);

  useEffect(() => {
    // 한 스텝에 더 많이 이동하되(STEP_SCALE), 과도 보정 방지를 위해 0~1 로 클램프.
    const step = Math.min(1, speed * STEP_SCALE);
    let id: ReturnType<typeof setInterval> | null = null;
    id = setInterval(() => {
      cur.current = cur.current + (target - cur.current) * step;
      if (Math.abs(target - cur.current) < 0.01) {
        cur.current = target;
        setVal(target);
        if (id) clearInterval(id);
        return;
      }
      setVal(cur.current);
    }, STEP_MS);
    return () => {
      if (id) clearInterval(id);
    };
  }, [target, speed]);

  return val;
};
