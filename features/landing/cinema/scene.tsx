"use client";

import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Phone, Laptop, chapter } from "./devices";
import { ModuleField } from "./modules";
import { ParticleField } from "./particles";
import type { ScrollState } from "./capability";

/**
 * The camera moves on scroll: in from darkness, around the pair, out to take
 * in the field once the hardware has come apart. Slow, and always eased —
 * nothing here should arrive suddenly.
 */
function CameraRig({ scroll }: { scroll: ScrollState }) {
  const { camera } = useThree();
  const shake = useRef(0);

  useFrame((_, dt) => {
    const p = scroll.value;

    // Arrival pulls in from far away; the teardown pushes back out to fit the
    // constellation of parts and modules in frame.
    const arrive = chapter(p, 0, 0.18);
    const orbit = chapter(p, 0.18, 0.62);
    const pull = chapter(p, 0.62, 1);

    const distance = THREE.MathUtils.lerp(11, 6.4, arrive) + pull * 3.6;
    const angle = -0.35 + orbit * 1.05 + pull * 0.25;
    const height = THREE.MathUtils.lerp(0.4, 0.9, orbit) + pull * 0.5;

    camera.position.set(
      Math.sin(angle) * distance,
      height,
      Math.cos(angle) * distance
    );

    // A breath of handheld drift keeps it from feeling like a CAD turntable.
    shake.current += dt;
    camera.position.x += Math.sin(shake.current * 0.35) * 0.06;
    camera.position.y += Math.cos(shake.current * 0.27) * 0.045;

    camera.lookAt(0, 0.1 + pull * 0.15, 0);
  });

  return null;
}

function Lighting({ dark }: { dark: boolean }) {
  return (
    <>
      {/* Lights only — drei's Environment presets fetch an HDR from a CDN,
          which would break the offline story and add a megabyte to the page. */}
      <ambientLight intensity={dark ? 0.35 : 0.9} />
      <directionalLight
        position={[4, 6, 5]}
        intensity={dark ? 1.6 : 2.4}
        castShadow={false}
      />
      <directionalLight position={[-6, 2, -4]} intensity={dark ? 0.8 : 1.1} color="#4F8DFF" />
      <pointLight position={[0, 0, 2.4]} intensity={dark ? 7 : 4} color="#6366F1" distance={12} />
      <pointLight position={[-3, -1.5, 1]} intensity={dark ? 4 : 2} color="#8B5CF6" distance={10} />
    </>
  );
}

function Stage({ scroll, dark }: { scroll: ScrollState; dark: boolean }) {
  // Refs rather than state: these are read inside useFrame every frame, and
  // routing them through React would re-render the tree sixty times a second.
  const teardown = useRef(0);
  const flow = useRef(0);

  useFrame(() => {
    const p = scroll.value;
    teardown.current = chapter(p, 0.55, 0.9);
    flow.current = chapter(p, 0.12, 0.45);
  });

  return (
    <>
      <CameraRig scroll={scroll} />
      <Lighting dark={dark} />
      <fog attach="fog" args={[dark ? "#030303" : "#EEF1F8", 9, 26]} />

      <Phone progress={teardown} />
      <Laptop progress={teardown} />
      <ModuleField progress={teardown} />
      <ParticleField progress={flow} dark={dark} />
    </>
  );
}

export function CinemaScene({
  scroll,
  dark,
  onContextLost,
}: {
  scroll: ScrollState;
  dark: boolean;
  /**
   * Called if the GPU drops the context. This happens for real on phones —
   * backgrounding the browser, another app claiming the GPU, or simply a
   * device under memory pressure — and the default outcome is a black
   * rectangle where the hero used to be. The stage swaps to the lite path.
   */
  onContextLost?: () => void;
}) {
  return (
    <Canvas
      // Capped so a high-DPI phone does not render four times the pixels it
      // needs and drop to fifteen frames a second doing it.
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: true,
      }}
      camera={{ fov: 38, near: 0.1, far: 60, position: [0, 0.4, 11] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = dark ? 1.15 : 1;

        gl.domElement.addEventListener(
          "webglcontextlost",
          (event) => {
            // Prevent the default so the browser will consider restoring it,
            // then hand the page back to the lightweight path either way.
            event.preventDefault();
            onContextLost?.();
          },
          { once: true }
        );
      }}
      // Frames are driven by our own rAF loop and the scroll damping, so React
      // never needs to re-render for the animation to advance.
      frameloop="always"
    >
      <Stage scroll={scroll} dark={dark} />
    </Canvas>
  );
}
