"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

/**
 * The Zaplex modules, appearing in the gaps the hardware leaves behind.
 *
 * Only capabilities the product actually ships are listed. The brief also
 * named Payroll and Payments; neither exists yet, and a landing page that
 * advertises modules a buyer cannot find after signing up is the same problem
 * as quoting a price you do not charge.
 */
const MODULES = [
  "Inventory",
  "Point of sale",
  "Accounting",
  "Customers",
  "Analytics",
  "Reports",
  "AI assistant",
  "Automation",
  "Cloud sync",
  "Offline mode",
  "Suppliers",
  "Debts",
] as const;

const ACCENTS = ["#6366F1", "#4F8DFF", "#8B5CF6"];

/** Fixed placement — a designed constellation, not a random scatter. */
function layout(index: number, total: number) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / (total - 1)) * 2;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = golden * index;
  return new THREE.Vector3(
    Math.cos(theta) * radius * 3.4,
    y * 1.8,
    Math.sin(theta) * radius * 2.2 - 0.3
  );
}

function ModuleCube({
  label,
  target,
  accent,
  index,
  progress,
}: {
  label: string;
  target: THREE.Vector3;
  accent: string;
  index: number;
  progress: React.RefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    const node = group.current;
    if (!node) return;

    // Each cube arrives slightly after the last, so they resolve in sequence
    // rather than popping in together.
    const stagger = index * 0.045;
    const t = Math.max(0, Math.min(1, ((progress.current ?? 0) - stagger) / 0.45));
    const eased = 1 - Math.pow(1 - t, 3);

    node.visible = t > 0.001;
    node.position.set(target.x * eased, target.y * eased, target.z * eased);
    node.scale.setScalar(eased * 0.9);

    const now = performance.now();
    node.rotation.y = now * 0.0003 + index;
    node.rotation.x = Math.sin(now * 0.0004 + index) * 0.2;
  });

  return (
    <group ref={group} visible={false}>
      <mesh>
        <boxGeometry args={[0.34, 0.34, 0.34]} />
        <meshPhysicalMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.35}
          metalness={0.2}
          roughness={0.15}
          transmission={0.6}
          thickness={0.5}
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* Wireframe edge reads as holographic without a postprocessing pass. */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(0.34, 0.34, 0.34)]} />
        <lineBasicMaterial color={accent} transparent opacity={0.9} toneMapped={false} />
      </lineSegments>
      <Text
        position={[0, -0.3, 0]}
        fontSize={0.088}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0}
      >
        {label}
      </Text>
    </group>
  );
}

export function ModuleField({ progress }: { progress: React.RefObject<number> }) {
  const cubes = useMemo(
    () =>
      MODULES.map((label, i) => ({
        label,
        target: layout(i, MODULES.length),
        accent: ACCENTS[i % ACCENTS.length],
      })),
    []
  );

  return (
    <group>
      {cubes.map((cube, i) => (
        <ModuleCube
          key={cube.label}
          label={cube.label}
          target={cube.target}
          accent={cube.accent}
          index={i}
          progress={progress}
        />
      ))}
    </group>
  );
}
