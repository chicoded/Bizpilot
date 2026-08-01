"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The ambient field, and the flow between the two devices.
 *
 * One BufferGeometry of points rather than many meshes: a few hundred separate
 * objects would be a few hundred draw calls, which is what makes scenes like
 * this stutter on the phones this product is actually sold to.
 */

const COUNT = 420;

export function ParticleField({
  progress,
  dark,
}: {
  progress: React.RefObject<number>;
  dark: boolean;
}) {
  const points = useRef<THREE.Points>(null);

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      // Deterministic scatter: a fixed field looks composed, and it also means
      // the scene renders identically on every load.
      const a = i * 2.399963;
      const r = 1.6 + (i % 37) * 0.13;
      positions[i * 3] = Math.cos(a) * r * 0.9;
      positions[i * 3 + 1] = ((i % 23) / 23 - 0.5) * 5.2;
      positions[i * 3 + 2] = Math.sin(a) * r * 0.7 - 1;
      seeds[i] = (i % 17) / 17;
    }
    return { positions, seeds };
  }, []);

  useFrame(() => {
    const node = points.current;
    if (!node) return;

    const p = progress.current ?? 0;
    const now = performance.now() * 0.00022;
    const array = node.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < COUNT; i++) {
      const base = i * 3;
      const seed = seeds[i];
      // Slow vertical drift, plus a pull toward the laptop as the sync
      // chapter runs, so the field reads as data moving rather than dust.
      array[base + 1] += Math.sin(now + seed * 9) * 0.0016;
      array[base] += Math.cos(now * 0.8 + seed * 7) * 0.0012 + p * 0.0009;
    }

    node.geometry.attributes.position.needsUpdate = true;
    node.rotation.y = now * 0.28;

    const material = node.material as THREE.PointsMaterial;
    material.opacity = 0.22 + Math.min(p, 1) * 0.4;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={COUNT}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={dark ? 0.028 : 0.022}
        color={dark ? "#8FA8FF" : "#4F5BD5"}
        transparent
        opacity={0.3}
        sizeAttenuation
        depthWrite={false}
        blending={dark ? THREE.AdditiveBlending : THREE.NormalBlending}
        toneMapped={false}
      />
    </points>
  );
}
