import { useEffect, useState } from 'react';

/**
 * Reactive device profile.
 *
 * CSS media queries handle everything that can be expressed in CSS. This hook
 * exists for the decisions JavaScript has to make:
 *   - the module panel slides up from the bottom on phones and in from the
 *     right on larger screens (Framer Motion needs to know which),
 *   - the zone rail is docked or a drawer,
 *   - the on-screen hint text reflects the actual input method.
 *
 * Every value is derived from the same breakpoints declared in tokens.css.
 */

const BREAKPOINTS = { sm: 480, md: 700, lg: 1024, xl: 1400 };

function measure() {
  if (typeof window === 'undefined') {
    return {
      width: 1280,
      height: 800,
      breakpoint: 'lg',
      isPhone: false,
      isTouch: false,
      isPortrait: false
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);

  const breakpoint =
    width >= BREAKPOINTS.xl ? 'xl' : width >= BREAKPOINTS.lg ? 'lg' : width >= BREAKPOINTS.md ? 'md' : 'sm';

  // A "phone" is a short, narrow, touch-first viewport — landscape phones are
  // still phones, so longSide keeps a tablet in portrait out of this bucket.
  const isPhone = shortSide <= BREAKPOINTS.md && longSide <= BREAKPOINTS.lg + 180;

  return {
    width,
    height,
    breakpoint,
    isPhone,
    isTouch: coarse || navigator.maxTouchPoints > 0,
    isPortrait: height >= width
  };
}

/** Subscribes to every signal that can change the device profile. */
export function useViewport() {
  const [viewport, setViewport] = useState(measure);

  useEffect(() => {
    let frame = 0;

    // Coalesce resize/orientation bursts into one state update per frame —
    // dragging a window edge otherwise re-renders React dozens of times.
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setViewport(measure());
      });
    };

    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    window.visualViewport?.addEventListener('resize', schedule);

    const coarseQuery = window.matchMedia('(pointer: coarse)');
    const onPointerChange = schedule;
    coarseQuery.addEventListener?.('change', onPointerChange);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      coarseQuery.removeEventListener?.('change', onPointerChange);
    };
  }, []);

  return viewport;
}
