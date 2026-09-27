'use client';

/**
 * One rAF loop for the whole page. Lenis, the cursor, the nav and the 3D
 * scene all subscribe to it rather than each starting their own.
 *
 * Lives outside React state on purpose: these values change every frame and
 * pushing them through a provider would re-render the tree 60 times a second.
 */

export const scrollState = { y: 0, progress: 0, velocity: 0 };
export const pointer = { x: 0, y: 0, nx: 0, ny: 0, active: false };

const subscribers = new Set();
let lenis = null;
let started = false;

export const onFrame = (fn) => {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
};

export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** @returns {Promise<() => void>} teardown */
export async function startScroll() {
  if (started) return () => {};
  started = true;

  const readNative = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollState.y = scrollY;
    scrollState.progress = max > 0 ? scrollY / max : 0;
  };

  if (reducedMotion()) {
    addEventListener('scroll', readNative, { passive: true });
    readNative();
  } else {
    const { default: Lenis } = await import('lenis');
    lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false, // native momentum beats anything we can simulate
      touchMultiplier: 1.6,
    });
    lenis.on('scroll', ({ scroll, progress, velocity }) => {
      scrollState.y = scroll;
      scrollState.progress = progress;
      scrollState.velocity = velocity;
    });
  }

  let last = performance.now();
  let raf = 0;
  const frame = (now) => {
    lenis?.raf(now);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    for (const fn of subscribers) fn(dt, now);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const onPointer = (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.nx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ny = (e.clientY / innerHeight) * 2 - 1;
    pointer.active = true;
  };
  addEventListener('pointermove', onPointer, { passive: true });

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('pointermove', onPointer);
    removeEventListener('scroll', readNative);
    lenis?.destroy();
    lenis = null;
    started = false;
  };
}

export function scrollTo(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -64, duration: 1.15 });
  else el.scrollIntoView({ block: 'start' });
}

export const lockScroll = (locked) => (locked ? lenis?.stop() : lenis?.start());
