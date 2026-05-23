import { useEffect, useRef, useState } from 'react';

// Smoothly ease a numeric value toward `target`. Mirrors useTicker in runsense-ui.jsx
// but uses setInterval-driven steps since RN doesn't expose requestAnimationFrame
// reliably outside of Reanimated's worklets.
export const useTicker = (target: number, speed = 0.04): number => {
  const [val, setVal] = useState(target);
  const cur = useRef(target);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    id = setInterval(() => {
      cur.current = cur.current + (target - cur.current) * speed;
      if (Math.abs(target - cur.current) < 0.01) {
        cur.current = target;
        setVal(target);
        if (id) clearInterval(id);
        return;
      }
      setVal(cur.current);
    }, 16);
    return () => {
      if (id) clearInterval(id);
    };
  }, [target, speed]);

  return val;
};
