import { MARK_HOLE, MARK_LEAN_DEG, markOuterAt } from './mark.js';

/**
 * THE OPENING — the mark built the way a part is built, scrubbed by scroll.
 *
 *   sketch    the triangle draws itself once the page has booted, and a
 *             word is set down at each of its corners
 *   profile   the rectangle closes around it
 *   incline   the rectangle leans until it fits the triangle
 *   extrude   the sketch becomes the plate (components/Scene.jsx); the
 *             words ride its corners
 *   annotate  the words leave the corners and land on the part as callouts
 *
 * The triangle is drawn first and never changes: the pocket already has its
 * final shape, so the frame is what adapts to it. It is the thread the rest
 * of the page can pick up.
 *
 * Plain module, no React. The sketch, the scene and the nav read this state
 * inside the one rAF loop (lib/scroll.js), in a fixed order: progress, then
 * the 3D pose, then everything pinned to it.
 */

/** Scroll distance of each beat, in screen heights. */
export const BEATS = [
  { id: 'profile', len: 0.9 },
  { id: 'incline', len: 0.75 },
  { id: 'extrude', len: 1.1 },
  { id: 'annotate', len: 1 },
  { id: 'hold', len: 0.6 },
];

/** Screens of scroll the track adds while the stage is pinned. */
export const SEQ_SCREENS = BEATS.reduce((sum, b) => sum + b.len, 0);

/** Each beat's [start, end] on the 0–1 progress. */
export const RANGE = (() => {
  const out = {};
  let at = 0;
  for (const b of BEATS) {
    out[b.id] = [at / SEQ_SCREENS, (at + b.len) / SEQ_SCREENS];
    at += b.len;
  }
  return out;
})();

/** Slots on the shared rAF loop. */
export const ORDER = { progress: -10, scene: 0, pinned: 10 };

export const seq = {
  start: 0, //      document y where the track begins
  length: 1, //     px of scroll while the stage is pinned
  W: 0, //          stage size, px
  H: 0,
  t: 0, //          progress through the pinned part, 0–1
  after: 0, //      px scrolled past the unpin
  intro: 0, //      the triangle drawing itself, 0–1
  static: false, // reduced motion: the finished state, scrolling like any content
  has3d: false, //  otherwise the sketch finishes the job in 2D
  frame: { k: 1, cx: 0, cy: 0, narrow: false },
  /** Window px of each callout's anchor, written by the scene every frame it renders. */
  anchors: [0, 1, 2].map(() => ({ x: 0, y: 0 })),
  /** Window px of the pocket's corners on the solid, in TRIANGLE order; written with the anchors. */
  corners: [0, 1, 2].map(() => ({ x: 0, y: 0 })),
  anchorsLive: false,
};

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
/** How far v is through [a, b], clamped. */
export const span = (v, a, b) => clamp01((v - a) / (b - a));
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOut = (t) => 1 - (1 - t) ** 3;

/** Progress through one beat, 0–1. */
export const beat = (id, t = seq.t) => span(t, RANGE[id][0], RANGE[id][1]);

/** Called first in every frame. */
export function stepProgress(dt, y) {
  seq.after = Math.max(0, y - seq.start - (seq.static ? 0 : seq.length));
  if (seq.static) {
    seq.t = 1;
    return;
  }
  const target = clamp01((y - seq.start) / seq.length);
  // A short glide on top of Lenis, so keyboard jumps and scrollbar drags scrub too.
  seq.t = Math.abs(target - seq.t) < 1e-4 ? target : lerp(seq.t, target, 1 - 0.0008 ** dt);
}

/* ---- Geometry ------------------------------------------------------------
   Field units (lib/mark.js, y down) to stage px. */

/** The finished mark on the stage: px per field unit, and the point it is centred on. */
export function framing(W, H) {
  const narrow = W < 720;
  const k = narrow
    ? Math.min((H * 0.32) / 68, (W * 0.7) / 84)
    : Math.min((H * 0.42) / 68, (W * 0.44) / 84);
  return { k, cx: W / 2, cy: H / 2, narrow };
}

export function toStage([x, y], zoom = 1, center = CENTER.mark, f = seq.frame) {
  return [f.cx + (x - center[0]) * f.k * zoom, f.cy + (y - center[1]) * f.k * zoom];
}

const [A, C, D, B] = markOuterAt(1);
const [foot, apex, corner] = MARK_HOLE; // foot and apex lie on the shared edge
const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
const along = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];

/** The triangle, apex first, in drawing order. */
export const TRIANGLE = [apex, foot, corner];

/** The first frame is closer on the triangle than the finished mark is. */
export const ZOOM_START = 1.32;

/** What the camera is centred on at each stage of the drawing. */
export const CENTER = {
  // Halfway between the triangle's centroid and its box reads as centred.
  triangle: mid(
    [(apex[0] + foot[0] + corner[0]) / 3, (apex[1] + foot[1] + corner[1]) / 3],
    [(corner[0] + foot[0]) / 2, (apex[1] + foot[1]) / 2],
  ),
  rectangle: mid(A, markOuterAt(0)[2]),
  mark: [50, 50],
};

/** The lean at progress `lean` (0–1), in degrees. */
export const leanDeg = (lean) =>
  (Math.atan(Math.tan((MARK_LEAN_DEG * Math.PI) / 180) * lean) * 180) / Math.PI;

/** What each callout points at, in the order of the words. */
export const ANCHORS = [
  [(C[0] + D[0] + B[0]) / 3, (C[1] + D[1] + B[1]) / 3], // the solid half
  mid(mid(A, C), mid(corner, apex)), //                    the bar that carries it
  along(apex, foot, 0.78), //                              the edge they share
];

/**
 * Where each word is first written, in the order of the words: `at` is its
 * corner of the triangle (an index into TRIANGLE), `side` where the word
 * sits from that corner, -1/0/1 on each axis. Every one keeps clear of the
 * frame that is drawn around the triangle later: the apex word runs into
 * the solid half, the two base words run under the base towards each other.
 */
export const CORNER_NOTES = [
  { at: 0, side: [1, 0] }, //  Forme, beside the apex
  { at: 2, side: [1, 1] }, //  Fonction, under the corner
  { at: 1, side: [-1, 1] }, // Précision, under the foot
];

/** Where the words sit around the finished mark, field units; `dir` is the side the text runs to. */
export const NOTE_LAYOUT = {
  wide: [
    { at: [112, 22], dir: 1 },
    { at: [-14, 64], dir: -1 },
    { at: [106, 96], dir: 1 },
  ],
  // A phone has no room left of the bar, so that word runs right from under it.
  narrow: [
    { at: [70, -6], dir: 1 },
    { at: [32, 116], dir: 1 },
    { at: [76, 100], dir: 1 },
  ],
};
