/**
 * THE MARK — single source of truth for the Belhous identity.
 *
 * A parallelogram cut along its short diagonal into two triangles that share
 * one edge. The left triangle is hollow: two bars and the shared edge, the
 * way a structure is drawn before it is computed. The right triangle is
 * solid: the part as it is rendered. Calculation on one side, image on the
 * other — one object holding both, which is the position the site argues.
 *
 * Read by an engineer it is a plate with a lightening pocket: material taken
 * out where the load does not need it. Read by a 3D artist it is a quad
 * triangulated, one face in wireframe and one shaded. Both readings are
 * meant.
 *
 *   Technicality   four corners and one bar width define everything; the
 *                  pocket is constructed from them, never drawn by hand.
 *   Clarity        one colour, one hole, no curves — legible at 16 px.
 *   Optimization   the same construction drives the favicon, the nav, the
 *                  OG image and the extruded solid in the 3D scene.
 *   Innovation     the pocket stops exactly on the diagonal, so the solid
 *                  half stays a whole triangle and the edge is shared.
 *
 * The bar width (8) was tuned against a 16 px raster: at 7 the bars break
 * up, at 9 the pocket reads as a centred Δ instead of the hollow half.
 */

/** Design field. The mark is centred on (50, 50) inside this box. */
export const MARK_VIEWBOX = 100;

/** Width of the two bars around the pocket, in field units. */
export const MARK_BAR = 8;

/* The parallelogram. Base 56, height 68: the two triangles are isosceles and
   the slab leans forward, left to right — from constraint to image. */
const A = [8, 84]; //  bottom-left
const B = [64, 84]; // foot of the shared edge
const D = [92, 16]; // top-right
const C = [36, 16]; // head of the shared edge

/** Outer contour, clockwise on screen. */
export const MARK_OUTER = Object.freeze([A, C, D, B]);

/* ---- Construction of the pocket -----------------------------------------
   The hollow triangle A-C-B, pulled in by MARK_BAR from its two free edges
   and left flush with the shared edge C-B. */
const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const mul = (p, k) => [p[0] * k, p[1] * k];
const unit = (v) => mul(v, 1 / Math.hypot(v[0], v[1]));

/** The line through p and q, pushed `by` units towards `inside`. */
function offsetLine(p, q, by, inside) {
  const d = unit(sub(q, p));
  let n = [-d[1], d[0]];
  const w = sub(inside, p);
  if (n[0] * w[0] + n[1] * w[1] < 0) n = mul(n, -1);
  return { p: add(p, mul(n, by)), d };
}

function intersect(l1, l2) {
  const cross = l1.d[0] * l2.d[1] - l1.d[1] * l2.d[0];
  const w = sub(l2.p, l1.p);
  return add(l1.p, mul(l1.d, (w[0] * l2.d[1] - w[1] * l2.d[0]) / cross));
}

const centroid = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
const left = offsetLine(A, C, MARK_BAR, centroid);
const base = offsetLine(A, B, MARK_BAR, centroid);
const shared = offsetLine(C, B, 0, centroid);
const round = (p) => p.map((v) => Math.round(v * 100) / 100);

/** The pocket, counter-clockwise on screen so it cuts under either fill rule. */
export const MARK_HOLE = Object.freeze(
  [intersect(base, shared), intersect(left, shared), intersect(left, base)].map(round),
);

const loop = (pts) => `M${pts.map(([x, y]) => `${x} ${y}`).join('L')}Z`;

/** SVG `d` for the filled mark. Pair it with fill-rule="evenodd". */
export const MARK_PATH = loop(MARK_OUTER) + loop(MARK_HOLE);

/** Height over width of the mark's bounding box. */
export const MARK_ASPECT = (A[1] - C[1]) / (D[0] - A[0]);

/**
 * The mark as three.js-ready contours: y-up, centred on the origin, scaled
 * so the mark spans 1.0 across. ExtrudeGeometry normalises winding itself.
 * @returns {{ outer: {x:number,y:number}[], hole: {x:number,y:number}[] }}
 */
export function markContour() {
  const c = MARK_VIEWBOX / 2;
  const scale = 1 / (D[0] - A[0]);
  const toWorld = ([x, y]) => ({ x: (x - c) * scale, y: (c - y) * scale });
  return { outer: MARK_OUTER.map(toWorld), hole: MARK_HOLE.map(toWorld) };
}
