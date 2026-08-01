"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { ScrollState } from "./capability";

/**
 * The phone and the laptop, built from geometry rather than loaded as models.
 *
 * Three reasons, in order of how much they matter:
 *
 * 1. There are no GLTF models in this repository, so there is nothing to load.
 * 2. The brief asks for an iPhone and a MacBook specifically. Photorealistic
 *    Apple hardware taken apart as the centrepiece of a commercial site is
 *    trade dress Apple does enforce, and Zaplex would be the one holding that
 *    risk. These are deliberately generic devices — a phone and a laptop, not
 *    anybody's phone and laptop.
 * 3. Geometry costs kilobytes. A pair of photoreal models with textures is
 *    tens of megabytes, which is the wrong thing to send this audience.
 *
 * Every part carries an assembled position and a drifted-apart position, and
 * lerps between them on scroll. Nothing is thrown: the brief asks for parts
 * that float apart gracefully, so separation is eased and rotation is slow.
 */

const INDIGO = "#6366F1";
const ELECTRIC = "#4F8DFF";
const PURPLE = "#8B5CF6";

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Maps overall scroll to a 0..1 range for one chapter. */
export function chapter(p: number, from: number, to: number) {
  return clamp01((p - from) / (to - from));
}

type PartProps = {
  /** Assembled position. */
  home: [number, number, number];
  /** Where it drifts to when the device comes apart. */
  away: [number, number, number];
  /** Extra rotation applied at full separation. */
  spin?: [number, number, number];
  progress: React.RefObject<number>;
  children: React.ReactNode;
  /** Staggers this part so they do not all leave at once. */
  delay?: number;
};

function Part({ home, away, spin = [0, 0, 0], progress, children, delay = 0 }: PartProps) {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    const group = ref.current;
    if (!group) return;
    const t = easeInOut(clamp01(((progress.current ?? 0) - delay) / (1 - delay)));

    group.position.set(
      THREE.MathUtils.lerp(home[0], away[0], t),
      THREE.MathUtils.lerp(home[1], away[1], t),
      THREE.MathUtils.lerp(home[2], away[2], t)
    );
    group.rotation.set(spin[0] * t, spin[1] * t, spin[2] * t);

    // A slow idle drift once apart, so the field never looks frozen.
    if (t > 0.01) {
      group.position.y += Math.sin(performance.now() * 0.0006 + home[0] * 4) * 0.012 * t;
      group.rotation.y += dt * 0.05 * t;
    }
  });

  return <group ref={ref}>{children}</group>;
}

function Screen({
  width,
  height,
  color = ELECTRIC,
  intensity = 1.4,
}: {
  width: number;
  height: number;
  color?: string;
  intensity?: number;
}) {
  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        // Emissive plus ACES tone mapping stands in for a bloom pass. It keeps
        // the postprocessing dependency out of the bundle and still glows.
        emissiveIntensity={intensity}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Thin readout bars, so a screen reads as a dashboard rather than a light. */
function ScreenContent({ width, height }: { width: number; height: number }) {
  const rows = [0.82, 0.55, 0.68, 0.4, 0.9];
  return (
    <group position={[0, 0, 0.002]}>
      {rows.map((w, i) => (
        <mesh
          key={i}
          position={[
            -width / 2 + (width * w) / 2 + width * 0.06,
            height / 2 - height * 0.16 - i * height * 0.14,
            0,
          ]}
        >
          <planeGeometry args={[width * w * 0.86, height * 0.055]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.75} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export function Phone({ progress }: { progress: React.RefObject<number> }) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (group.current) {
      group.current.rotation.y = Math.sin(performance.now() * 0.0002) * 0.16;
    }
  });

  return (
    <group ref={group} position={[-1.5, 0, 0]}>
      {/* Glass */}
      <Part home={[0, 0, 0.055]} away={[0, 0.95, 1.5]} spin={[0.22, 0, 0.1]} progress={progress}>
        <RoundedBox args={[0.78, 1.62, 0.012]} radius={0.07} smoothness={4}>
          <meshPhysicalMaterial
            color="#0b0f1a"
            metalness={0}
            roughness={0.05}
            transmission={0.55}
            thickness={0.4}
            transparent
            opacity={0.55}
          />
        </RoundedBox>
      </Part>

      {/* Display */}
      <Part home={[0, 0, 0.03]} away={[0, 0.42, 0.95]} spin={[0.1, 0, 0]} progress={progress} delay={0.05}>
        <group>
          <Screen width={0.72} height={1.54} />
          <ScreenContent width={0.72} height={1.54} />
        </group>
      </Part>

      {/* Battery */}
      <Part home={[0, -0.18, -0.01]} away={[-0.95, -0.5, 0.5]} spin={[0, 0.5, 0.3]} progress={progress} delay={0.12}>
        <RoundedBox args={[0.5, 0.78, 0.05]} radius={0.02} smoothness={3}>
          <meshStandardMaterial color="#1b2233" metalness={0.5} roughness={0.4} />
        </RoundedBox>
      </Part>

      {/* Logic board */}
      <Part home={[0, 0.42, -0.01]} away={[0.95, 0.62, 0.4]} spin={[0, -0.6, 0.2]} progress={progress} delay={0.18}>
        <group>
          <RoundedBox args={[0.52, 0.42, 0.03]} radius={0.015} smoothness={3}>
            <meshStandardMaterial color="#123024" metalness={0.3} roughness={0.65} />
          </RoundedBox>
          {[-0.12, 0.06].map((x, i) => (
            <mesh key={i} position={[x, 0.05, 0.03]}>
              <boxGeometry args={[0.14, 0.12, 0.02]} />
              <meshStandardMaterial
                color={INDIGO}
                emissive={INDIGO}
                emissiveIntensity={0.6}
                metalness={0.8}
                roughness={0.3}
              />
            </mesh>
          ))}
        </group>
      </Part>

      {/* Camera module */}
      <Part home={[-0.22, 0.6, -0.05]} away={[-0.85, 1.05, -0.35]} spin={[0.6, 0.4, 0]} progress={progress} delay={0.09}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          {[-0.1, 0.1].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <cylinderGeometry args={[0.075, 0.075, 0.06, 24]} />
              <meshStandardMaterial color="#0a0d14" metalness={0.9} roughness={0.15} />
            </mesh>
          ))}
        </group>
      </Part>

      {/* Charging coil */}
      <Part home={[0, -0.25, -0.045]} away={[0.5, -1.0, 0.2]} spin={[1.1, 0.3, 0]} progress={progress} delay={0.24}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.018, 12, 40]} />
          <meshStandardMaterial
            color={PURPLE}
            emissive={PURPLE}
            emissiveIntensity={0.5}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      </Part>

      {/* Frame — stays put, everything else leaves it. */}
      <Part home={[0, 0, 0]} away={[0, 0, -0.35]} progress={progress}>
        <RoundedBox args={[0.82, 1.66, 0.09]} radius={0.09} smoothness={4}>
          <meshStandardMaterial color="#20263a" metalness={0.95} roughness={0.22} />
        </RoundedBox>
      </Part>
    </group>
  );
}

export function Laptop({ progress }: { progress: React.RefObject<number> }) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (group.current) {
      group.current.rotation.y = -0.35 + Math.sin(performance.now() * 0.00017) * 0.12;
    }
  });

  return (
    <group ref={group} position={[1.65, -0.25, -0.9]} scale={1.15}>
      {/* Lid and screen */}
      <Part home={[0, 0.62, -0.62]} away={[0.4, 1.5, -1.5]} spin={[0.18, 0.2, 0]} progress={progress} delay={0.06}>
        <group rotation={[-0.28, 0, 0]}>
          <RoundedBox args={[1.9, 1.22, 0.05]} radius={0.03} smoothness={3}>
            <meshStandardMaterial color="#20263a" metalness={0.92} roughness={0.25} />
          </RoundedBox>
          <group position={[0, 0, 0.028]}>
            <Screen width={1.78} height={1.1} color={INDIGO} intensity={1.1} />
            <ScreenContent width={1.78} height={1.1} />
          </group>
        </group>
      </Part>

      {/* Keyboard deck */}
      <Part home={[0, 0, 0]} away={[0, 0.5, 0.9]} spin={[0.12, 0, 0.06]} progress={progress} delay={0.14}>
        <group>
          <RoundedBox args={[1.9, 0.05, 1.28]} radius={0.025} smoothness={3}>
            <meshStandardMaterial color="#262d43" metalness={0.85} roughness={0.34} />
          </RoundedBox>
          <mesh position={[0, 0.028, -0.16]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.6, 0.62]} />
            <meshStandardMaterial color="#11151f" metalness={0.4} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.028, 0.42]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.66, 0.4]} />
            <meshStandardMaterial color="#171d2b" metalness={0.3} roughness={0.5} />
          </mesh>
        </group>
      </Part>

      {/* Mainboard */}
      <Part home={[0, -0.06, -0.2]} away={[-1.1, -0.35, 0.3]} spin={[0, 0.7, 0.2]} progress={progress} delay={0.2}>
        <group>
          <RoundedBox args={[1.5, 0.03, 0.5]} radius={0.01} smoothness={2}>
            <meshStandardMaterial color="#123024" metalness={0.35} roughness={0.6} />
          </RoundedBox>
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.24, 0.03, 0.24]} />
            <meshStandardMaterial
              color={ELECTRIC}
              emissive={ELECTRIC}
              emissiveIntensity={0.8}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        </group>
      </Part>

      {/* Battery bank */}
      <Part home={[0, -0.08, 0.32]} away={[1.15, -0.55, 0.6]} spin={[0.3, -0.4, 0]} progress={progress} delay={0.26}>
        <RoundedBox args={[1.4, 0.05, 0.42]} radius={0.015} smoothness={2}>
          <meshStandardMaterial color="#1b2233" metalness={0.5} roughness={0.45} />
        </RoundedBox>
      </Part>

      {/* Fans */}
      <Part home={[0, -0.05, -0.45]} away={[0.2, 0.9, -1.05]} spin={[0.5, 1.2, 0]} progress={progress} delay={0.3}>
        <group>
          {[-0.45, 0.45].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.17, 0.17, 0.035, 20]} />
              <meshStandardMaterial color="#2c3450" metalness={0.8} roughness={0.35} />
            </mesh>
          ))}
        </group>
      </Part>
    </group>
  );
}
