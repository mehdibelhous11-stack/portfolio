'use client';

import { useEffect, useRef } from 'react';
import { onFrame, pointer, scrollState, reducedMotion } from '@/lib/scroll';
import { MARK_ASPECT } from '@/lib/mark';
import Mark from './Mark';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
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

/**
 * The mark as a machined plate — the subject of the page rather than a
 * backdrop, since the name does not carry the hero. Turning it shows what
 * the flat mark only implies: the pocket is a real hole, with walls.
 *
 * Monochrome: the only chromatic event is the metal picking up its
 * environment. One canvas for the whole document.
 */
export default function Scene({ onReady, active }) {
  const canvasRef = useRef(null);
  const fallbackRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // No WebGL: the CSS fallback mark stays on screen and the chunk's work
    // is skipped entirely.
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) return;

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
        return;
      }

      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
      renderer.setSize(innerWidth, innerHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 60);

      /* A procedural room gives the metal something to reflect without
         shipping a single byte of HDR. */
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      const envRT = pmrem.fromScene(room, 0.04);
      scene.environment = envRT.texture;
      room.dispose?.();
      pmrem.dispose();

      const SIZE = 1;
      const DEPTH = 0.24;

      const rig = new THREE.Group();
      scene.add(rig);

      const geometry = createMarkGeometry({
        size: SIZE,
        depth: DEPTH,
        bevel: lowPower ? 0 : 0.014,
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
      const edges = new THREE.LineSegments(createMarkEdges({ size: SIZE, depth: DEPTH }), edgeMaterial);
      edges.scale.setScalar(1.004);
      rig.add(edges);

      /* A flat outline hanging behind the solid, always square to camera: the
         drawing the part was cut from. It stays 2D deliberately. */
      const ghostMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(token('--scene-grid') || '#ffffff'),
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      });
      const ghost = new THREE.LineSegments(createMarkOutline({ size: SIZE }), ghostMaterial);
      scene.add(ghost);

      const gridMaterial = new THREE.ShaderMaterial({
        vertexShader: GRID_VERT,
        fragmentShader: GRID_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uScale: { value: 160 },
          uOpacity: { value: 0.075 },
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
         Sized as a share of viewport height, not in world units, so it holds
         the same presence from a phone to an ultrawide. The intro copy is
         left-aligned and narrow, so the solid sits right of centre. */
      const frame = { scale: 1, x: 0, y: 0, parkX: 1, peak: 1, viewH: 2.4, viewW: 4 };

      const resize = () => {
        const w = innerWidth;
        const h = innerHeight;
        camera.aspect = w / h;
        camera.position.z = 5;
        camera.updateProjectionMatrix();

        frame.viewH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
        frame.viewW = frame.viewH * camera.aspect;

        const wide = clamp01((w - 560) / 560);
        const share = lerp(0.22, 0.47, wide);
        frame.scale = (share * frame.viewH) / MARK_ASPECT;
        frame.x = lerp(0, 0.19, wide) * frame.viewW;
        frame.y = lerp(0.2, -0.02, wide) * frame.viewH;
        frame.parkX = 0.42 * frame.viewW;
        frame.peak = lerp(0.6, 1, wide);

        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
        renderer.setSize(w, h, false);
      };
      resize();
      addEventListener('resize', resize, { passive: true });

      const HOME = { rx: -0.14, ry: -0.52 };
      const pose = { rx: HOME.rx, ry: HOME.ry, x: frame.x, y: frame.y, scale: frame.scale };
      const target = { ...pose };
      let visible = true;
      let opacity = 0;

      const render = () => renderer.render(scene, camera);

      const update = (dt, now) => {
        const p = scrollState.progress;
        const t = now * 0.001;

        // Past the intro the solid retreats to the right edge and dims to a
        // trace. Measured in viewport heights, not page progress, so it is
        // gone by the first section however long the page grows: nothing
        // below should be read against a moving specular highlight.
        const past = clamp01((scrollState.y - innerHeight * 0.12) / (innerHeight * 0.5));
        opacity = lerp(opacity, lerp(frame.peak, 0.1, past), 1 - Math.pow(0.001, dt));
        canvas.style.opacity = opacity.toFixed(3);
        if (opacity < 0.02) return;

        const px = pointer.active ? pointer.nx : 0;
        const py = pointer.active ? pointer.ny : 0;

        // Scroll sways the plate instead of spinning it: a thin plate seen
        // edge-on is a grey bar, not the mark, so it never turns past ~60°.
        const vh = scrollState.y / innerHeight;
        target.ry = HOME.ry + px * 0.38 + Math.sin(vh / 1.6) * 0.5;
        target.rx = HOME.rx + py * 0.24 + Math.sin(vh / 2.3) * 0.12;
        target.x = lerp(frame.x, frame.parkX, past) + px * 0.1 * frame.scale;
        target.y = frame.y - py * 0.07 * frame.scale - p * 0.3;
        target.scale = frame.scale * lerp(1, 0.46, past);

        const k = 1 - Math.pow(0.0015, dt); // frame-rate independent damping
        pose.rx = lerp(pose.rx, target.rx, k);
        pose.ry = lerp(pose.ry, target.ry, k);
        pose.x = lerp(pose.x, target.x, k);
        pose.y = lerp(pose.y, target.y, k);
        pose.scale = lerp(pose.scale, target.scale, k);

        const bob = Math.sin(t * 0.55) * 0.035 * frame.scale;
        rig.position.set(pose.x, pose.y + bob, 0);
        rig.rotation.set(pose.rx, pose.ry, Math.sin(t * 0.37) * 0.02);
        rig.scale.setScalar(pose.scale);

        ghost.position.set(pose.x * 0.82, pose.y * 0.82 + bob * 0.4, -1.1);
        ghost.scale.setScalar(pose.scale * 1.7);
        ghostMaterial.opacity = lerp(0.12, 0.04, past);

        grid.position.z = ((t * 0.12) % 1) - 0.5;
        gridMaterial.uniforms.uOffset.value.y = p * 6;

        render();
      };

      if (reduced) {
        rig.position.set(frame.x, frame.y, 0);
        rig.rotation.set(HOME.rx, HOME.ry, 0);
        rig.scale.setScalar(frame.scale);
        ghost.position.set(frame.x * 0.82, frame.y * 0.82, -1.1);
        ghost.scale.setScalar(frame.scale * 1.7);
        canvas.style.opacity = '1';
      }

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
        gridMaterial.uniforms.uOpacity.value =
          document.documentElement.dataset.theme === 'light' ? 0.09 : 0.075;
        render();
      };
      addEventListener('theme:change', repaint);

      const off = onFrame((dt, now) => {
        if (!visible || reduced) return;
        update(dt, now);
      });

      render(); // first frame before reporting ready
      canvas.setAttribute('data-ready', '');
      fallbackRef.current?.setAttribute('hidden', '');
      dispatchEvent(new Event('scene:ready'));
      onReady?.();

      cleanup = () => {
        off();
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
  }, [onReady]);

  return (
    <>
      <canvas className="scene" ref={canvasRef} aria-hidden="true" />
      <div className="scene-fallback" ref={fallbackRef} aria-hidden="true">
        <Mark />
      </div>
    </>
  );
}
