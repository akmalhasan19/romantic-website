"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { CenterSphere } from "./CenterSphere";
import { OrbitingFrames } from "./OrbitingFrames";
import { FloatingMessage } from "./FloatingMessage";
import { CinematicCamera } from "./CinematicCamera";
import { ScenePostProcessing } from "./ScenePostProcessing";
import { useGalleryStore } from "@/store/gallery-store";

function createCircleTex() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 3, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.7)");
    g.addColorStop(0.8, "rgba(255,255,255,0.15)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

function randomSpherePoints(count: number, minR: number, maxR: number): Float32Array {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = minR + Math.random() * (maxR - minR);
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
  }
  return pos;
}

// Three layers: close/bright, mid, far/dim — all using circular sprites
function AmbientSparkles() {
  const tex = useMemo(() => createCircleTex(), []);

  const close  = useMemo(() => randomSpherePoints(150,   8, 16), []);
  const mid    = useMemo(() => randomSpherePoints(1200, 25, 45), []);
  const far    = useMemo(() => randomSpherePoints(1500, 45, 90), []);

  const common = {
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    map: tex,
    alphaTest: 0.001,
    transparent: true,
    color: "#ffffff",
  } as const;

  return (
    <>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[close, 3]} />
        </bufferGeometry>
        <pointsMaterial {...common} size={0.15} opacity={0.80} />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[mid, 3]} />
        </bufferGeometry>
        <pointsMaterial {...common} size={0.09} opacity={0.45} />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[far, 3]} />
        </bufferGeometry>
        <pointsMaterial {...common} size={0.07} opacity={0.20} />
      </points>
    </>
  );
}

export function Scene3D() {
  const triggerScatter = useGalleryStore((s) => s.triggerScatter);

  return (
    <div className="h-full w-full" onDoubleClick={triggerScatter}>
      <Canvas
        camera={{ position: [0, 5, 18], fov: 60 }}
        dpr={[1, 1.25]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        style={{ background: "#050505" }}
      >
        <AdaptiveDpr pixelated />
        <ambientLight intensity={0.3} />

        <AmbientSparkles />

        <CinematicCamera />

        <Suspense fallback={null}>
          <CenterSphere />
          <OrbitingFrames />
          <FloatingMessage />
          <ScenePostProcessing />
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={40}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}
