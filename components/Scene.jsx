'use client';

import { useEffect, useRef } from 'react';
import { onFrame, pointer, scrollState, reducedMotion } from '@/lib/scroll';
import { MARK_ASPECT } from '@/lib/mark';
import { ANCHORS, ORDER, beat, clamp01, easeInOut, easeOut, lerp, seq, span } from '@/lib/sequence';

const token = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/** Grid floor. Screen-space derivatives keep lines one pixel wide at every
 *  distance instead of aliasing into noise near the horizon. */
const GRID_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GRID_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uScale;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec2 uOffset;

  float gridLine(vec2 uv, float scale) {
    vec2 g = uv * scale + uOffset;
    vec2 d = abs(fract(g - 0.5) - 0.5) / fwidth(g);
    return 1.0 - min(min(d.x, d.y), 1.0);
  }

  void main() {
    float fine = gridLine(vUv, uScale) * 0.4;
    float coarse = gridLine(vUv, uScale * 0.125) * 0.85;
    float a = max(fine, coarse);
    float d = length(vUv - 0.5) * 2.0;
    a *= smoothstep(1.0, 0.1, d);
    if (a < 0.002) discard;
    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`;

/* The turn the solid takes as it leaves the sketch plane, and the pose it
   rests in beside the statement once the opening is over. */
const HERO = { rx: -0.2, ry: -0.56, rz: -0.035 };
const HOME = { rx: -0.14, ry: -0.52 };

/**
 * The mark as a machined plate. It enters the page as the last stage of the
 * opening (lib/sequence.js): head-on, flat, exactly over the sketch it
 * replaces, then extruded and turned. Past the opening it settles beside
 * the statement and retreats to a trace at the right edge.
 *
 * Monochrome: the only chromatic event is the metal picking up its
 * environment. One canvas for the whole document.
 */
export default function Scene() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Settled, one way or the other: the boot overlay stops waiting.
    const settled = () => dispatchEvent(new Event('scene:ready'));

    // No WebGL: the sketch finishes the opening in 2D and the chunk's work
    // is skipped entirely.
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) {
      settled();
      return;
    }

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import('three');
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      const { createMarkGeometry, createMarkEdges, createMarkOutline } = await import('@/lib/markGeometry');
      if (disposed) return;

      const reduced = reducedMotion();
      const coarse = matchMedia('(pointer: coarse)').matches;
      const lowPower = coarse || (navigator.hardwareConcurrency ?? 8) <= 4;
      const dprCap = lowPower ? 1.5 : 2;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: !lowPower,
          powerPreference: 'high-performance',
          stencil: false,
        });
      } catch {
        settled();
        return;
      }

      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
      renderer.setSize(innerWidth, innerHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 60);
      camera.position.z = 5;

      /* A procedural room gives the metal something to reflect without
         shipping a single byte of HDR. */
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      const envRT = pmrem.fromScene(room, 0.04);
      scene.environment = envRT.texture;
      room.dispose?.();
      pmrem.dispose();

      const DEPTH = 0.24;
      const BEVEL = lowPower ? 0 : 0.014;
      /* The front face, in the geometry's own units: where the callouts land. */
      const FACE = DEPTH / 2 + BEVEL;

      const rig = new THREE.Group();
      scene.add(rig);

      const geometry = createMarkGeometry({
        size: 1,
        depth: DEPTH,
        bevel: BEVEL,
        bevelSegments: lowPower ? 1 : 2,
      });
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(token('--scene-solid') || '#22242a'),
        metalness: 0.88,
        roughness: 0.3,
        envMapIntensity: 1.6,
        clearcoat: 0.4,
        clearcoatRoughness: 0.32,
      });
      rig.add(new THREE.Mesh(geometry, material));

      /* The drawing laid over the model — built from an unbevelled extrusion
         so chamfer facets do not pollute the overlay. */
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(token('--scene-edge') || '#ffffff'),
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      });
      const edges = new THREE.LineSegments(createMarkEdges({ size: 1, depth: DEPTH }), edgeMaterial);
      edges.scale.setScalar(1.004);
      rig.add(edges);

      /* The sketch, carried into 3D: it starts exactly on the drawing the
         solid lifts out of, then drops back behind it and stays square to
         camera. It stays 2D deliberately. */
      const ghostMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(token('--scene-grid') || '#ffffff'),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const ghost = new THREE.LineSegments(createMarkOutline({ size: 1 }), ghostMaterial);
      scene.add(ghost);

      const gridBase = () => (document.documentElement.dataset.theme === 'light' ? 0.09 : 0.075);
      const gridMaterial = new THREE.ShaderMaterial({
        vertexShader: GRID_VERT,
        fragmentShader: GRID_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uScale: { value: 160 },
          uOpacity: { value: 0 },
          uColor: { value: new THREE.Color(token('--scene-grid') || '#ffffff') },
          uOffset: { value: new THREE.Vector2(0, 0) },
        },
      });
      const grid = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), gridMaterial);
      grid.rotation.x = -Math.PI / 2;
      grid.position.y = -1.9;
      scene.add(grid);

      /* The environment does most of the work. These three only shape it. */
      const key = new THREE.DirectionalLight(new THREE.Color(token('--scene-key') || '#ffffff'), 3.2);
      key.position.set(-3, 4, 5);
      scene.add(key);

      const fill = new THREE.DirectionalLight(new THREE.Color(token('--scene-fill') || '#9aa6bd'), 1.1);
      fill.position.set(4, 1, 2);
      scene.add(fill);

      const rim = new THREE.DirectionalLight(new THREE.Color(token('--scene-key') || '#ffffff'), 1.6);
      rim.position.set(3, -2, -3);
      scene.add(rim);

      /* ---- Framing --------------------------------------------------------
         In the opening the plate is sized and placed from the sketch's own
         framing (seq.frame, stage px), so the handoff is exact. Beside the
         statement it is a share of viewport height, so it holds the same
         presence from a phone to an ultrawide. */
      const frame = { viewH: 2.4, viewW: 4, wpp: 0.003, home: { x: 0, y: 0, s: 1 }, parkX: 1, peak: 1 };
      let dirty = true;

      const resize = () => {
        const w = innerWidth;
        const h = innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();

        frame.viewH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
        frame.viewW = frame.viewH * camera.aspect;
        frame.wpp = frame.viewH / h; // world units per px on the z = 0 plane

        const wide = clamp01((w - 560) / 560);
        frame.home = {
          s: (lerp(0.22, 0.47, wide) * frame.viewH) / MARK_ASPECT,
          x: lerp(0, 0.19, wide) * frame.viewW,
          y: lerp(0.2, -0.02, wide) * frame.viewH,
        };
        frame.parkX = 0.42 * frame.viewW;
        frame.peak = lerp(0.6, 1, wide);

        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
        renderer.setSize(w, h, false);
        dirty = true;
      };
      resize();
      addEventListener('resize', resize, { passive: true });

      const anchorsLocal = ANCHORS.map(([x, y]) => new THREE.Vector3((x - 50) / 84, (50 - y) / 84, FACE));
      const v = new THREE.Vector3();

      const render = () => renderer.render(scene, camera);

      /* Where the callouts' anchors are on screen, this frame. */
      const publish = () => {
        rig.updateMatrixWorld();
        anchorsLocal.forEach((a, i) => {
          v.copy(a).applyMatrix4(rig.matrixWorld).project(camera);
          seq.anchors[i].x = (v.x + 1) * 0.5 * innerWidth;
          seq.anchors[i].y = (1 - v.y) * 0.5 * innerHeight;
        });
        seq.anchorsLive = true;
      };

      const pose = { rx: 0, ry: 0, rz: 0, x: 0, y: 0, s: 1, d: 0 };
      const target = { ...pose };
      let snap = true;

      const update = (dt, now) => {
        const w = innerWidth;
        const h = innerHeight;
        const F = seq.frame;
        const S0 = F.k * 84 * frame.wpp; // as wide as the sketch
        const uE = reduced ? 1 : beat('extrude');
        const uA = reduced ? 1 : beat('annotate');
        const after = seq.after;

        const turn = easeInOut(span(uE, 0.04, 0.94));
        const drift = easeInOut(uA);
        // Sway and float only once it has left the sketch plane.
        const live = reduced ? 0 : span(uE, 0.06, 0.36);

        target.rx = lerp(0, HERO.rx, turn) + 0.05 * drift;
        target.ry = lerp(0, HERO.ry, turn) + 0.2 * drift;
        target.rz = lerp(0, HERO.rz, turn);
        target.x = (F.cx - w / 2) * frame.wpp;
        target.y = -(F.cy - h / 2) * frame.wpp;
        target.s = S0 * lerp(1, 1.08, turn);
        target.d = easeOut(span(uE, 0.02, 0.62));

        let settle = 0;
        let past = 0;
        if (reduced) {
          // The rendered picture itself slides up with the page, so plate,
          // outline and floor move as one still image — moving the objects
          // instead would leave parallax between depths.
          camera.setViewOffset(w, h, 0, after, w, h);
        } else {
          settle = easeInOut(span(after, 0, 0.9 * h));
          past = span(after, 1.05 * h, 1.6 * h);
          target.rx = lerp(target.rx, HOME.rx, settle);
          target.ry = lerp(target.ry, HOME.ry, settle);
          target.rz = lerp(target.rz, 0, settle);
          target.x = lerp(lerp(target.x, frame.home.x, settle), frame.parkX, past);
          target.y = lerp(target.y, frame.home.y, settle);
          target.s = lerp(target.s, frame.home.s, settle) * lerp(1, 0.46, past);

          const px = pointer.active ? pointer.nx : 0;
          const py = pointer.active ? pointer.ny : 0;
          target.rx += py * 0.2 * live;
          target.ry += px * 0.32 * live;
          target.x += px * 0.06 * target.s * live;
          target.y -= py * 0.05 * target.s * live;
        }

        // Damped — except at the handoff, where the solid has to sit exactly
        // on the sketch it replaces.
        const k = snap || reduced || (uE < 0.08 && after === 0) ? 1 : 1 - 0.0015 ** dt;
        for (const p in pose) pose[p] = lerp(pose[p], target[p], k);
        snap = false;

        const t = now * 0.001;
        const bob = Math.sin(t * 0.55) * 0.03 * pose.s * live;
        rig.position.set(pose.x, pose.y + bob, 0);
        rig.rotation.set(pose.rx, pose.ry, pose.rz + Math.sin(t * 0.37) * 0.015 * live);
        rig.scale.set(pose.s, pose.s, pose.s * Math.max(0.004, pose.d));

        const g = easeInOut(span(uE, 0.03, 0.78));
        ghost.position.set(pose.x * lerp(1, 0.82, g), (pose.y + bob * 0.4) * lerp(1, 0.82, g), lerp(0, -1.1, g));
        ghost.scale.setScalar(pose.s * lerp(1, 1.7, g));
        ghostMaterial.opacity = lerp(0.4, 0.12, g) * span(uE, 0.02, 0.1) * lerp(1, 0.34, past);

        edgeMaterial.opacity = lerp(0.85, 0.28, span(uE, 0, 0.35));
        gridMaterial.uniforms.uOpacity.value = gridBase() * span(uE, 0.25, 0.75);
        if (!reduced) {
          grid.position.z = ((t * 0.12) % 1) - 0.5;
          gridMaterial.uniforms.uOffset.value.y = (scrollState.y / h) * 0.4;
        }

        const opacity = reduced
          ? after < h ? 1 : 0
          : span(uE, 0, 0.1) * lerp(1, frame.peak, settle) * lerp(1, 0.1, past);
        canvas.style.opacity = opacity.toFixed(3);
        if (opacity < 0.01) {
          seq.anchorsLive = false;
          return;
        }
        render();
        publish();
      };

      let visible = true;
      const onVisibility = () => (visible = !document.hidden);
      document.addEventListener('visibilitychange', onVisibility);

      // Re-sample the palette when the theme flips; WebGL cannot read CSS.
      const repaint = () => {
        material.color.set(token('--scene-solid'));
        edgeMaterial.color.set(token('--scene-edge'));
        ghostMaterial.color.set(token('--scene-grid'));
        gridMaterial.uniforms.uColor.value.set(token('--scene-grid'));
        key.color.set(token('--scene-key'));
        fill.color.set(token('--scene-fill'));
        rim.color.set(token('--scene-key'));
        dirty = true;
      };
      addEventListener('theme:change', repaint);

      let lastAfter = -1;
      const off = onFrame((dt, now) => {
        if (!visible) return;
        // Reduced motion: one still frame, redrawn only when the page moves.
        if (reduced && !dirty && seq.after === lastAfter) return;
        lastAfter = seq.after;
        dirty = false;
        update(dt, now);
      }, ORDER.scene);

      // Compile everything once, invisibly, so the handoff never hitches.
      update(0, performance.now());
      render();
      seq.has3d = true;
      canvas.setAttribute('data-ready', '');
      settled();

      cleanup = () => {
        off();
        seq.has3d = false;
        seq.anchorsLive = false;
        removeEventListener('resize', resize);
        removeEventListener('theme:change', repaint);
        document.removeEventListener('visibilitychange', onVisibility);
        renderer.dispose();
        geometry.dispose();
        material.dispose();
        edges.geometry.dispose();
        edgeMaterial.dispose();
        ghost.geometry.dispose();
        ghostMaterial.dispose();
        grid.geometry.dispose();
        gridMaterial.dispose();
        envRT.texture.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <canvas className="scene" ref={canvasRef} aria-hidden="true" />;
}
