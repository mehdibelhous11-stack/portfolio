'use client';

import { useEffect, useRef } from 'react';
import Mark from './Mark';
import { sequence, site } from '@/lib/content';
import { onFrame, scrollState, reducedMotion } from '@/lib/scroll';
import { MARK_HOLE, markOuterAt } from '@/lib/mark';
import {
  ANCHORS, CENTER, NOTE_LAYOUT, ORDER, RANGE, SEQ_SCREENS, TRIANGLE, ZOOM_START,
  beat, easeInOut, easeOut, framing, leanDeg, lerp, seq, span, stepProgress, toStage,
} from '@/lib/sequence';

const pad = (n) => String(n).padStart(2, '0');
const f = (v) => v.toFixed(1);

const PT = 5; //    sketch point, px
const TAIL = 36; // level run of a leader before its word, px
const GAP = 10; //  leader end to word, px

const poly = (pts) => pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L');

/** A polyline cut at fraction `p` of its length, as path data. */
function trace(points, p, closed = false) {
  if (p <= 0) return '';
  const pts = closed ? [...points, points[0]] : points;
  if (p >= 0.9999) return `M${poly(pts)}${closed ? 'Z' : ''}`;
  const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  let left = p * lens.reduce((s, l) => s + l, 0);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < lens.length; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (left >= lens[i]) {
      d += `L${f(x1)} ${f(y1)}`;
      left -= lens[i];
    } else {
      const k = left / lens[i];
      return `${d}L${f(lerp(x0, x1, k))} ${f(lerp(y0, y1, k))}`;
    }
  }
  return d;
}

/** How far along a polyline each vertex sits, 0–1. */
function stations(points) {
  const lens = points.slice(1).map((q, i) => Math.hypot(q[0] - points[i][0], q[1] - points[i][1]));
  const total = lens.reduce((s, l) => s + l, 0) || 1;
  let run = 0;
  return [0, ...lens.map((l) => (run += l) / total)];
}

/** Writes only what changed: most frames change a few values, not all of them. */
function put(node, key, value) {
  const memo = node.__seq || (node.__seq = {});
  if (memo[key] === value) return;
  memo[key] = value;
  if (key === 'opacity' || key === 'transform') node.style[key] = value;
  else if (key === 'text') node.textContent = value;
  else node.setAttribute(key, value);
}

/**
 * The opening. A tall track with two pinned layers: the stage under the
 * canvas, so the solid covers the drawing it comes out of, and the notes
 * over it, so the callouts stay on top of the part they describe.
 *
 * React renders this once. Every frame after that is drawn from
 * lib/sequence.js inside the shared rAF loop.
 */
export default function Sequence() {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const one = (part) => el.querySelector(`[data-part="${part}"]`);
    const all = (part) => [...el.querySelectorAll(`[data-part="${part}"]`)];

    const stage = one('stage');
    const sketch = one('sketch');
    const profile = one('profile');
    const plumb = one('plumb');
    const diagonal = one('diagonal');
    const frameA = one('frameA');
    const frameB = one('frameB');
    const tri = one('tri');
    const points = all('pt');
    const angle = one('angle');
    const hint = one('hint');
    const step = one('step');
    const stepNum = one('stepNum');
    const stepName = one('stepName');
    const leaders = all('leader');
    const anchors = all('anchor');
    const callouts = all('callout');

    seq.static = reducedMotion();
    seq.intro = seq.static ? 1 : 0;

    let notes = [];
    const measure = () => {
      seq.W = stage.clientWidth;
      seq.H = stage.clientHeight;
      seq.start = el.getBoundingClientRect().top + scrollY;
      seq.length = Math.max(1, el.offsetHeight - seq.H);
      seq.frame = framing(seq.W, seq.H);
      // Keep every word on screen: same margin as the page gutter.
      const margin = Math.min(56, Math.max(20, seq.W * 0.04));
      notes = NOTE_LAYOUT[seq.frame.narrow ? 'narrow' : 'wide'].map(({ at, dir }, i) => {
        let [x, y] = toStage(at);
        const w = callouts[i].offsetWidth;
        x = dir > 0 ? Math.min(x, seq.W - margin - GAP - w) : Math.max(x, margin + GAP + w);
        return { x, y, dir };
      });
    };
    measure();
    addEventListener('resize', measure, { passive: true });
    document.fonts?.ready.then(measure);

    // The triangle draws itself once the boot overlay starts to lift.
    let introAt = null;
    const begin = () => {
      if (introAt === null) introAt = performance.now() + 300;
    };
    const boot = document.getElementById('boot');
    if (seq.static || !boot || boot.hasAttribute('data-done')) begin();
    else addEventListener('boot:done', begin);

    const offProgress = onFrame((dt, now) => {
      stepProgress(dt, scrollState.y);
      if (!seq.static && introAt !== null) seq.intro = easeInOut(span(now, introAt, introAt + 1400));
    }, ORDER.progress);

    let shownStep = -1;

    const draw = (now) => {
      const { t } = seq;
      const since = introAt === null ? -1 : now - introAt;
      const uP = beat('profile');
      const uI = beat('incline');
      const uE = beat('extrude');
      const uA = beat('annotate');
      const uH = beat('hold');

      // Camera: close on the triangle, back out to the rectangle, then kept
      // centred on the mark while the head slides.
      const lean = easeInOut(uI);
      const back = easeInOut(span(uP, 0, 0.7));
      const zoom = lerp(ZOOM_START, 1, back);
      const center = [
        lerp(CENTER.triangle[0], CENTER.rectangle[0], back) + (CENTER.mark[0] - CENTER.rectangle[0]) * lean,
        lerp(CENTER.triangle[1], CENTER.rectangle[1], back),
      ];
      const P = (p) => toStage(p, zoom, center);

      // Sketch — the triangle, apex first.
      const triPx = TRIANGLE.map(P);
      const pT = Math.max(seq.intro, span(t, 0, 0.02));
      put(tri, 'd', trace(triPx, pT, true));

      // Profile — two strokes from the rectangle's foot, meeting at the far corner.
      const [a, c, d, b] = markOuterAt(lean).map(P);
      const pR = easeInOut(span(uP, 0.1, 0.7));
      put(frameA, 'd', trace([a, c, d], pR));
      put(frameB, 'd', trace([a, b, d], pR));

      // A closed profile is shaded, as CAD shades one that is ready to
      // extrude. Without WebGL the shading fills in: the flat mark ends it.
      const tint = span(uP, 0.72, 1) * 0.07;
      const fill = seq.has3d ? tint : lerp(tint, 1, easeOut(span(uE, 0, 0.5)));
      put(profile, 'd', `M${poly([a, c, d, b])}ZM${poly(MARK_HOLE.map(P))}Z`);
      put(profile, 'fill-opacity', fill.toFixed(3));

      // Incline — a plumb line from the foot, and the diagonal the lean swings
      // onto the triangle's edge.
      const guides = span(uP, 0.85, 1) * (1 - span(uE, 0, 0.12));
      put(plumb, 'd', `M${f(a[0])} ${f(a[1])}L${f(a[0])} ${f(c[1])}`);
      put(diagonal, 'd', `M${f(c[0])} ${f(c[1])}L${f(b[0])} ${f(b[1])}`);
      put(plumb, 'opacity', guides.toFixed(3));
      put(diagonal, 'opacity', guides.toFixed(3));
      put(angle, 'text', `${leanDeg(lean).toFixed(1).replace('.', ',')}°`);
      put(angle, 'opacity', (guides * span(uI, 0, 0.04)).toFixed(3));
      put(angle, 'transform', `translate3d(${f((a[0] + c[0]) / 2)}px, ${f(c[1] - 12)}px, 0) translate(-50%, -100%)`);

      // Sketch points, set down as the pen reaches them.
      const [, sB] = stations([a, b, d]);
      const [, sC] = stations([a, c, d]);
      const triAt = stations([...triPx, triPx[0]]);
      const fadePts = 1 - span(uE, 0, 0.2);
      [
        [triPx[0], triAt[0], pT], [triPx[1], triAt[1], pT], [triPx[2], triAt[2], pT],
        [a, 0, pR], [c, sC, pR], [b, sB, pR], [d, 1, pR],
      ].forEach(([p, at, drawn], i) => {
        const on = drawn > 0 ? span(drawn, at - 0.04, at) : 0;
        put(points[i], 'x', f(p[0] - PT / 2));
        put(points[i], 'y', f(p[1] - PT / 2));
        put(points[i], 'opacity', (on * fadePts).toFixed(3));
      });

      // Extrude — the sketch gives way to the solid lifting out of it.
      put(sketch, 'opacity', (1 - (seq.has3d ? span(uE, 0.04, 0.26) : 0)).toFixed(3));

      const hintOn = seq.static || since < 0 ? 0 : span(since, 1500, 2100) * (1 - span(t, 0, 0.012));
      put(hint, 'opacity', hintOn.toFixed(3));

      const idx = t <= 0.0005 ? 0 : t < RANGE.profile[1] ? 1 : t < RANGE.incline[1] ? 2 : t < RANGE.extrude[1] ? 3 : 4;
      if (idx !== shownStep) {
        shownStep = idx;
        stepNum.textContent = pad(idx + 1);
        stepName.textContent = sequence.steps[idx];
      }
      put(step, 'opacity', (seq.static || since < 0 ? 0 : span(since, 0, 600)).toFixed(3));

      // Annotate — each callout lands on the solid, or on the flat mark
      // when there is no solid to pin it to.
      const live = seq.has3d && seq.anchorsLive;
      const fade = seq.static ? 1 : 1 - span(uH, 0.45, 1);
      notes.forEach((n, i) => {
        const anchor = live ? [seq.anchors[i].x, seq.anchors[i].y + seq.after] : toStage(ANCHORS[i]);
        const appear = seq.static ? 1 : easeOut(span(uA, i * 0.2, i * 0.2 + 0.5));
        const word = span(appear, 0.45, 1);
        let ex = n.x - n.dir * TAIL;
        if ((ex - anchor[0]) * n.dir < 0) ex = anchor[0];
        put(leaders[i], 'd', trace([anchor, [ex, n.y], [n.x, n.y]], span(appear, 0, 0.7)));
        put(leaders[i], 'opacity', fade.toFixed(3));
        put(anchors[i], 'x', f(anchor[0] - 3.5));
        put(anchors[i], 'y', f(anchor[1] - 3.5));
        put(anchors[i], 'opacity', (span(appear, 0, 0.12) * fade).toFixed(3));
        const x = n.x + n.dir * (GAP + (1 - word) * 12);
        put(callouts[i], 'transform', `translate3d(${f(x)}px, ${f(n.y)}px, 0) translate(${n.dir < 0 ? '-100%' : '0'}, -50%)`);
        put(callouts[i], 'opacity', (word * fade).toFixed(3));
      });
    };

    const offDraw = onFrame((dt, now) => {
      if (seq.after > seq.H) return; // the stage has scrolled away
      draw(now);
    }, ORDER.pinned);

    return () => {
      offProgress();
      offDraw();
      removeEventListener('resize', measure);
      removeEventListener('boot:done', begin);
    };
  }, []);

  return (
    <section
      className="seq"
      id="top"
      ref={root}
      aria-labelledby="seq-title"
      style={{ '--seq-screens': SEQ_SCREENS }}
    >
      <h1 className="sr-only" id="seq-title">
        {site.name} — {site.role}
      </h1>

      <div className="seq__stage" data-part="stage">
        <svg className="seq__sketch" data-part="sketch" aria-hidden="true" focusable="false">
          <path className="seq__profile" data-part="profile" fillRule="evenodd" />
          <path className="seq__guide" data-part="plumb" />
          <path className="seq__guide" data-part="diagonal" />
          <path className="seq__line" data-part="frameA" />
          <path className="seq__line" data-part="frameB" />
          <path className="seq__line" data-part="tri" />
          {Array.from({ length: 7 }, (_, i) => (
            <rect className="seq__pt" data-part="pt" key={i} width={PT} height={PT} />
          ))}
        </svg>
        <p className="seq__angle" data-part="angle" aria-hidden="true" />
        <div className="seq__still" aria-hidden="true">
          <Mark />
        </div>
        <p className="seq__hint label" data-part="hint" aria-hidden="true">
          {sequence.hint}
        </p>
        <p className="seq__step label" data-part="step" aria-hidden="true">
          <span data-part="stepNum">01</span>
          <span data-part="stepName">{sequence.steps[0]}</span>
        </p>
      </div>

      <div className="seq__notes">
        <svg className="seq__leaders" aria-hidden="true" focusable="false">
          {sequence.callouts.map((word) => (
            <path className="seq__leader" data-part="leader" key={word} />
          ))}
          {sequence.callouts.map((word) => (
            <rect className="seq__anchor" data-part="anchor" key={word} width="7" height="7" />
          ))}
        </svg>
        <ol className="seq__callouts">
          {sequence.callouts.map((word, i) => (
            <li className="callout" data-part="callout" key={word}>
              <span className="callout__num" aria-hidden="true">
                {pad(i + 1)}
              </span>
              <span className="callout__word">{word}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
