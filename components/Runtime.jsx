'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { startScroll, onFrame, pointer, reducedMotion } from '@/lib/scroll';
import Mark from './Mark';

/* three.js is a client-only chunk fetched after the page is already readable.
   ssr:false is required — it touches `window` at module scope. */
const Scene = dynamic(() => import('./Scene'), { ssr: false });

/**
 * Owns everything that only exists in the browser: the rAF loop, the boot
 * overlay, the custom cursor and the 3D scene. One client island instead of
 * four, so the page ships a single hydration boundary.
 */
export default function Runtime() {
  useEffect(() => {
    let teardown = () => {};
    startScroll().then((fn) => {
      teardown = fn;
    });
    return () => teardown();
  }, []);

  return (
    <>
      <Boot />
      <Scene />
      <Cursor />
    </>
  );
}

/* ---- Boot ---------------------------------------------------------------- */
/* Short by design: it covers the font swap and the first WebGL frame, and is
   capped so a slow scene never holds the page hostage. */
const MIN = 650;
const CAP = 2600;

function Boot() {
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    const started = performance.now();
    let alive = true;
    let value = 0;

    // Creep towards 90 so the bar always moves; real signals finish it.
    const creep = setInterval(() => {
      value = Math.min(90, value + (90 - value) * 0.08 + 0.6);
      setPct(value);
    }, 90);

    const finish = () => {
      if (!alive || finished.current) return;
      finished.current = true;
      clearInterval(creep);
      setPct(100);
      const wait = Math.max(0, MIN - (performance.now() - started));
      setTimeout(() => {
        setDone(true);
        // The opening starts drawing as the overlay lifts.
        dispatchEvent(new Event('boot:done'));
        // Remove it from the tree so nothing behind stays unreachable.
        setTimeout(() => setGone(true), 1000);
      }, wait);
    };

    const fonts = document.fonts?.ready ?? Promise.resolve();
    // The scene is a later chunk, so this listener is always attached first.
    const scene = new Promise((r) => addEventListener('scene:ready', r, { once: true }));
    const timeout = new Promise((r) => setTimeout(r, CAP));

    Promise.race([Promise.all([fonts, scene]), timeout]).then(finish).catch(finish);
    return () => {
      alive = false;
      clearInterval(creep);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      className="boot"
      id="boot"
      role="status"
      aria-live="polite"
      data-done={done ? '' : undefined}
      style={{ '--fill': `${pct}%` }}
    >
      <span className="sr-only">Chargement</span>
      <Mark className="mark boot__mark" />
      <div className="boot__rule" />
      <div className="boot__meta">
        <span className="label">Lorem</span>
        <span className="label boot__count">{String(Math.round(pct)).padStart(3, '0')}</span>
      </div>
    </div>
  );
}

/* ---- Cursor -------------------------------------------------------------- */
function Cursor() {
  const ring = useRef(null);
  const dot = useRef(null);

  useEffect(() => {
    const fine = matchMedia('(pointer: fine)').matches;
    if (!fine || reducedMotion()) return;

    const root = document.documentElement;
    root.dataset.cursor = 'idle';

    let rx = innerWidth / 2;
    let ry = innerHeight / 2;

    const off = onFrame(() => {
      if (!pointer.active) return;
      if (root.dataset.cursor !== 'on') root.dataset.cursor = 'on';
      rx += (pointer.x - rx) * 0.18;
      ry += (pointer.y - ry) * 0.18;
      if (ring.current) ring.current.style.transform = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0)`;
      if (dot.current) dot.current.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
    });

    // Delegated, so anything rendered later is covered without re-binding.
    const TEXT = 'INPUT,TEXTAREA,P,LI,H1,H2,H3';
    const over = (e) => {
      const el = ring.current;
      if (!el) return;
      if (e.target.closest?.('a, button, [data-hover]')) el.dataset.hover = 'link';
      else if (e.target.closest?.(TEXT)) el.dataset.hover = 'text';
      else delete el.dataset.hover;
    };
    const leave = () => (root.dataset.cursor = 'idle');
    const enter = () => (root.dataset.cursor = 'on');
    // Keyboard users get the native focus ring back the moment they tab.
    const key = (e) => e.key === 'Tab' && (root.dataset.cursor = 'idle');

    document.addEventListener('pointerover', over, { passive: true });
    document.addEventListener('pointerleave', leave);
    document.addEventListener('pointerenter', enter);
    addEventListener('keydown', key);

    return () => {
      off();
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerleave', leave);
      document.removeEventListener('pointerenter', enter);
      removeEventListener('keydown', key);
      delete root.dataset.cursor;
    };
  }, []);

  return (
    <>
      <div className="cursor" ref={ring} aria-hidden="true" />
      <div className="cursor__dot" ref={dot} aria-hidden="true" />
    </>
  );
}

/**
 * Scroll-linked reveal, for `.cue` (fade up) and `.wo` (write-on, see
 * components/WriteOn.jsx). Exported for sections that opt in.
 *
 * Write-on blocks type in order within their section: one that comes into
 * view while the block before it is still writing waits its turn. Once a
 * block is written it is marked done, which drops the per-character delays —
 * otherwise a theme switch would re-colour the text one character at a time.
 */
const WRITE_GAP = 160;

export function useCue(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll('.cue, .wo');
    if (!items.length) return;

    if (reducedMotion()) {
      items.forEach((n) => {
        n.setAttribute('data-in', '');
        if (n.classList.contains('wo')) n.setAttribute('data-done', '');
      });
      return;
    }

    const ends = new Map(); // section → when its last scheduled block finishes
    const timers = new Set();
    const show = (n) => {
      if (n.classList.contains('wo')) {
        const chain = n.closest('section') ?? el;
        const now = performance.now();
        const wait = Math.max(0, (ends.get(chain) ?? 0) - now);
        const length = Number(n.dataset.wo) || 0;
        n.style.setProperty('--start', `${Math.round(wait)}ms`);
        ends.set(chain, now + wait + length + WRITE_GAP);
        const id = setTimeout(() => {
          timers.delete(id);
          n.setAttribute('data-done', '');
        }, wait + length + 100);
        timers.add(id);
      }
      n.setAttribute('data-in', '');
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
    );
    items.forEach((n) => io.observe(n));
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [ref]);
}
