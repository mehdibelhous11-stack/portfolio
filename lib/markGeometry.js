import { Shape, Path, ExtrudeGeometry, EdgesGeometry, BufferGeometry, Vector3 } from 'three';
import { markContour } from './mark.js';

/**
 * The mark as a solid: a machined plate with its triangular pocket cut
 * through. Same construction as the favicon and the nav — the identity is
 * defined once and this is one of its renderers.
 *
 * Bevel size is deliberately small: the pocket's apex is a 45-degree corner,
 * where a bevel reaches 2.6x its own size. Past ~0.02 the chamfers start
 * closing the pocket.
 *
 * @param {object} [o]
 * @param {number} [o.size]   world units across the mark
 * @param {number} [o.depth]  extrusion depth as a fraction of size
 * @param {number} [o.bevel]  chamfer as a fraction of size; 0 disables
 * @returns {ExtrudeGeometry} centred on its own bounding box
 */
export function createMarkGeometry({ size = 1, depth = 0.24, bevel = 0.014, bevelSegments = 2 } = {}) {
  const { outer, hole } = markContour();
  const trace = (path, pts) => {
    path.moveTo(pts[0].x * size, pts[0].y * size);
    for (let i = 1; i < pts.length; i += 1) path.lineTo(pts[i].x * size, pts[i].y * size);
    path.closePath();
    return path;
  };
  const shape = trace(new Shape(), outer);
  shape.holes.push(trace(new Path(), hole));

  const geometry = new ExtrudeGeometry(shape, {
    depth: depth * size,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel * size,
    bevelSize: bevel * size,
    bevelOffset: 0,
    bevelSegments,
    curveSegments: 1, // there are no curves to segment
    steps: 1,
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Edge overlay for the solid — the technical drawing laid over the model.
 * Built from an unbevelled extrusion so it yields exactly the true edges of
 * the form, pocket included, instead of every chamfer facet.
 */
export function createMarkEdges({ size = 1, depth = 0.24 } = {}) {
  const clean = createMarkGeometry({ size, depth, bevel: 0 });
  const edges = new EdgesGeometry(clean, 1);
  clean.dispose();
  return edges;
}

/**
 * The flat contour and its pocket — the drawing the part was cut from.
 * Lives in its own plane behind the solid rather than wrapping it, so it
 * reads as a drawing and not as a second, ghostly copy of the object.
 * @returns {BufferGeometry} for LineSegments
 */
export function createMarkOutline({ size = 1 } = {}) {
  const { outer, hole } = markContour();
  const pts = [];
  for (const loop of [outer, hole]) {
    loop.forEach((p, i) => {
      const q = loop[(i + 1) % loop.length];
      pts.push(new Vector3(p.x * size, p.y * size, 0), new Vector3(q.x * size, q.y * size, 0));
    });
  }
  return new BufferGeometry().setFromPoints(pts);
}
