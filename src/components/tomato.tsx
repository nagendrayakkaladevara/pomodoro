import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useTomatoDial, type TomatoDialProps } from "../lib/use-tomato-dial";

function FlatTomato() {
  return (
    <svg viewBox="0 0 320 260" className="flat-tomato" aria-hidden="true">
      <defs>
        <radialGradient id="fruit" cx="30%" cy="20%" r="85%">
          <stop stopColor="#ff8770" />
          <stop offset=".5" stopColor="#e64c35" />
          <stop offset="1" stopColor="#a12720" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="231" rx="86" ry="9" fill="#808080" opacity=".1" />
      <path d="M57 135C34 19 273 21 266 135Z" fill="url(#fruit)" />
      <path d="M57 142C59 245 264 250 266 142Z" fill="url(#fruit)" />
      <path
        d="m160 61-50-14 31-5-5-29 25 26 23-31 2 30 44-1-42 19 27 20-50-13-42 18Z"
        fill="#477346"
      />
      <path
        d="M156 45q-5-22 14-33"
        fill="none"
        stroke="#3a6539"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M63 135q99 11 197 0"
        fill="none"
        stroke="#6f2520"
        strokeWidth="3"
      />
      <path d="m155 154 5-7 5 7Z" fill="#fff3d6" />
    </svg>
  );
}

export default function Tomato({
  running,
  progress,
  ...dial
}: { running: boolean; progress: number } & TomatoDialProps) {
  const host = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const current = useRef({
    running,
    progress,
    previewMinutes: dial.previewMinutes,
  });
  current.current = { running, progress, previewMinutes: dial.previewMinutes };
  const [fallback, setFallback] = useState(false);
  const pickTop = useRef<((x: number, y: number) => boolean) | null>(null);
  const interaction = useTomatoDial(dial, (x, y) => {
    if (pickTop.current && !fallback) return pickTop.current(x, y);
    const rect = wrapper.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return false;
    const nx = (x - rect.left) / rect.width,
      ny = (y - rect.top) / rect.height;
    return nx > 0.15 && nx < 0.85 && ny > 0.12 && ny < 0.57;
  });
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setFallback(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(320, 274);
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.32;
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 320 / 274, 0.1, 50);
    camera.position.set(0, 1.35, 4.8);
    camera.lookAt(0, 0.12, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const key = new THREE.DirectionalLight(0xffeee1, 4.4);
    key.position.set(-3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 1.3);
    fill.position.set(4, 1, 1);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffd4b5, 2);
    rim.position.set(1, 3, -3);
    scene.add(rim);
    const material = new THREE.MeshPhysicalMaterial({
      color: "#e54128",
      roughness: 0.3,
      metalness: 0.02,
      clearcoat: 0.48,
      clearcoatRoughness: 0.35,
    });
    const body = new THREE.Group();
    body.rotation.z = -0.055;
    scene.add(body);
    const upper = new THREE.Group();
    upper.position.y = 0.035;
    body.add(upper);
    const hemisphere = (top: boolean) => {
      const geometry = new THREE.SphereGeometry(
        1,
        64,
        32,
        0,
        Math.PI * 2,
        top ? 0 : Math.PI / 2,
        Math.PI / 2,
      );
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i),
          y = positions.getY(i),
          z = positions.getZ(i);
        const angle = Math.atan2(z, x);
        const rib =
          1 + 0.026 * Math.cos(5 * angle) * Math.pow(Math.abs(y), 0.75);
        positions.setXYZ(
          i,
          x * rib * 1.08,
          y * 0.81 - (top ? 0.1 * Math.pow(y, 12) : 0),
          z * rib,
        );
      }
      geometry.computeVertexNormals();
      return new THREE.Mesh(geometry, material);
    };
    upper.add(hemisphere(true));
    body.add(hemisphere(false));
    const seam = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.025, 64),
      new THREE.MeshStandardMaterial({ color: "#87251c", roughness: 0.8 }),
    );
    seam.scale.x = 1.08;
    seam.position.y = 0.015;
    body.add(seam);
    const ivory = new THREE.MeshStandardMaterial({
      color: "#fff1db",
      roughness: 0.8,
    });
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(
          i % 5 === 0 ? 0.016 : 0.009,
          i % 5 === 0 ? 0.07 : 0.032,
          0.012,
        ),
        ivory,
      );
      tick.position.set(Math.sin(angle) * 1.08, 0.08, Math.cos(angle));
      tick.rotation.y = angle;
      upper.add(tick);
    }
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(-0.035, 0);
    arrowShape.lineTo(0, 0.055);
    arrowShape.lineTo(0.035, 0);
    arrowShape.closePath();
    const arrow = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), ivory);
    arrow.position.set(0, -0.11, 1.005);
    body.add(arrow);
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: "#437243",
      roughness: 0.72,
      side: THREE.DoubleSide,
    });
    for (let l = 0; l < 6; l++) {
      const vertices: number[] = [],
        indices: number[] = [];
      for (let j = 0; j <= 12; j++) {
        const t = j / 12,
          width = Math.sin(t * Math.PI) * 0.115;
        const y = 0.74 + Math.sin(t * Math.PI) * 0.06 - t * t * 0.23;
        vertices.push(
          -width,
          y,
          t * 0.64,
          width,
          y + 0.025 * Math.sin(t * Math.PI),
          t * 0.64,
        );
        if (j < 12) {
          const a = j * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const leaf = new THREE.Mesh(geometry, leafMaterial);
      leaf.rotation.y = (l * Math.PI) / 3;
      upper.add(leaf);
    }
    const stemPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.75, 0),
      new THREE.Vector3(0.02, 0.89, 0.015),
      new THREE.Vector3(0.1, 1.0, 0.02),
    ]);
    upper.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(stemPath, 12, 0.043, 8, false),
        leafMaterial,
      ),
    );
    const raycaster = new THREE.Raycaster();
    pickTop.current = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((clientX - rect.left) / rect.width) * 2 - 1,
          -((clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      scene.updateMatrixWorld(true);
      const hit = raycaster.intersectObject(body, true)[0];
      if (!hit) return false;
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        if (object === upper) return true;
        object = object.parent;
      }
      return false;
    };
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      lastRendered = 0,
      angle = 0.4 + current.current.progress * Math.PI * 2,
      hasRendered = false,
      previousPreview: number | null = null,
      restingAngle = angle;
    const animate = (time: number) => {
      frame = requestAnimationFrame(animate);
      const delta = Math.min((time - lastRendered) / 1000, 0.1);
      if (document.hidden || time - lastRendered < 32) return;
      const preview = current.current.previewMinutes;
      if (preview !== null && previousPreview === null) restingAngle = angle;
      const target =
        preview === null ? restingAngle : 0.4 - (preview / 60) * Math.PI * 2;
      const turning =
        preview !== null ||
        previousPreview !== null ||
        Math.abs(target - angle) > 0.001;
      if (!current.current.running && turning)
        angle = motion.matches
          ? target
          : THREE.MathUtils.damp(angle, target, 18, delta);
      if (current.current.running && !motion.matches) {
        angle += delta * 0.25;
        restingAngle = angle;
      }
      if (
        hasRendered &&
        !turning &&
        (!current.current.running || motion.matches)
      ) {
        lastRendered = time;
        return;
      }
      previousPreview = preview;
      upper.rotation.y = angle;
      renderer.render(scene, camera);
      lastRendered = time;
      hasRendered = true;
    };
    frame = requestAnimationFrame(animate);
    const lost = (event: Event) => {
      event.preventDefault();
      setFallback(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      cancelAnimationFrame(frame);
      pickTop.current = null;
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((m) => materials.add(m));
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div
      ref={wrapper}
      className={`tomato-scene ${running ? "is-running" : ""} ${dial.disabled ? "dial-locked" : "dial-available"} ${dial.previewMinutes !== null ? "is-dialing" : ""}`}
      role="slider"
      tabIndex={0}
      aria-label="Tomato duration dial"
      aria-valuemin={0}
      aria-valuemax={dial.maxMinutes}
      aria-valuenow={dial.previewMinutes ?? dial.minutes}
      aria-valuetext={
        dial.disabled
          ? "Duration locked during this session"
          : `${dial.previewMinutes ?? dial.minutes} minutes${dial.previewMinutes !== null ? ", preview" : ""}`
      }
      aria-disabled={dial.disabled}
      aria-orientation="horizontal"
      aria-describedby="dial-hint"
      {...interaction}
    >
      <div className="tomato-shadow" />
      <div ref={host} className={fallback ? "hidden" : "tomato-canvas"} />
      {fallback && <FlatTomato />}
    </div>
  );
}
