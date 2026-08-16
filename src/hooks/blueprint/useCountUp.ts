import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 to `end` once `active` becomes true.
 * Supports decimals (e.g. 2.3) via the `decimals` option.
 */
export function useCountUp(
  end: number,
  active: boolean,
  { duration = 1200, decimals = 0 }: { duration?: number; decimals?: number } = {},
) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setValue(end);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(end * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setValue(end);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, end, duration]);

  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
