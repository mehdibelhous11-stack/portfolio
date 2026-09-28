'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Mark from './Mark';
import { sections, site } from '@/lib/content';
import { onFrame, scrollState, scrollTo, lockScroll } from '@/lib/scroll';
import { seq } from '@/lib/sequence';

const pad = (n) => String(n).padStart(2, '0');
const THEME_KEY = 'mb-theme';

/**
 * A bar and an index. There is no row of links: navigation is a numbered
 * table of contents at every screen size, because the site is read as a
 * document rather than browsed as an app.
 */
export default function Nav() {
  const [open, setOpen] = useState(false);
  const bar = useRef(null);
  const lastY = useRef(0);
  const opener = useRef(null);

  /* Auto-hide going down, reveal going up, always show at the top. No sheet
     while the opening is pinned: there is no text under the bar to cover. */
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    return onFrame(() => {
      const y = scrollState.y;
      const down = y > lastY.current;
      const opening = !seq.static && y < seq.start + seq.length;
      if (y < 80 || !down || open) el.removeAttribute('data-hidden');
      else if (down && y - lastY.current > 2) el.setAttribute('data-hidden', '');
      el.toggleAttribute('data-top', (y < 8 || opening) && !open);
      lastY.current = y;
    });
  }, [open]);

  const setIndex = useCallback((next) => {
    setOpen(next);
    lockScroll(next);
    document.body.style.overflow = next ? 'hidden' : '';
    if (!next) opener.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && open && setIndex(false);
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open, setIndex]);

  // Unmounting with the body locked would leave the page stuck.
  useEffect(() => () => {
    document.body.style.overflow = '';
    lockScroll(false);
  }, []);

  const go = (e, id) => {
    e.preventDefault();
    setIndex(false);
    // Let the overlay finish hiding before the scroll starts.
    setTimeout(() => scrollTo(`#${id}`), 60);
  };

  return (
    <>
      <header className="nav" ref={bar}>
        <div className="shell nav__inner">
          <a className="nav__brand" href="#top" aria-label={`${site.name} — haut de page`}>
            <Mark />
            <span className="nav__name">{site.name}</span>
          </a>

          <div className="nav__tools">
            <ThemeToggle />
            <button
              className="pill"
              type="button"
              ref={opener}
              aria-expanded={open}
              aria-controls="index"
              onClick={() => setIndex(!open)}
            >
              {open ? 'Fermer' : 'Index'}
            </button>
          </div>
        </div>
      </header>

      <nav
        className="index"
        id="index"
        aria-label="Index"
        aria-hidden={!open}
        data-open={open ? '' : undefined}
        inert={!open}
      >
        <div className="shell index__links">
          {sections.map((s, i) => (
            <a
              className="index__link"
              key={s.id}
              href={`#${s.id}`}
              style={{ '--i': i }}
              onClick={(e) => go(e, s.id)}
            >
              <span className="index__num">{pad(i + 1)}</span>
              {s.label}
            </a>
          ))}
        </div>
        <div className="shell index__foot">
          <Link className="label" href="/text">
            Version texte
          </Link>
          <span className="label">{site.location}</span>
          <span className="label">{site.year}</span>
        </div>
      </nav>
    </>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || 'dark');
  }, []);

  const flip = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    setTheme(next);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', next === 'dark' ? '#0b0b0c' : '#f1f0ec');
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode — the choice simply will not persist */
    }
    // Give CSS a frame to settle before the scene re-samples its tokens.
    requestAnimationFrame(() => dispatchEvent(new Event('theme:change')));
  };

  return (
    <button
      className="pill pill--icon"
      type="button"
      onClick={flip}
      aria-label={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
    >
      <svg className="icon--moon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
      </svg>
      <svg className="icon--sun" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
      </svg>
    </button>
  );
}
