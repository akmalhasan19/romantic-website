"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useGalleryStore } from "@/store/gallery-store";

const FRAME_W = 0.5;
const FRAME_H = 0.67;
const INSET = 0.04;
const DISK_ROTATE_SPEED = 0.04; // rad/s ≈ 2.3°/s, rightward rotation

/* ─── Shared glow sprite ─────────────────────────────────────────── */

function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const glow = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
    glow.addColorStop(0, "rgba(255,255,255,1)");
    glow.addColorStop(0.35, "rgba(255,255,255,0.8)");
    glow.addColorStop(0.75, "rgba(255,255,255,0.2)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

/* ─── Inner Ring Particles (dense, bright, narrow band) ──────────── */

function InnerRingParticles() {
  const circleTexture = useMemo(() => createGlowTexture(), []);

  const positions = useMemo(() => {
    // [minR, maxR, count, ySpread, radialBias]
    const zones: [number, number, number, number, number][] = [
      // Overlap zone near the heart
      [2.2, 3.8, 1800, 0.10, 1.3],
      // Core inner-orbit band
      [3.8, 6.0, 4500, 0.05, 1.0],
      // Extended inner band
      [6.0, 7.5, 2200, 0.10, 1.0],
    ];

    const totalCount = zones.reduce((s, z) => s + z[2], 0);
    const pos = new Float32Array(totalCount * 3);
    let idx = 0;

    for (const [minR, maxR, count, ySpread, radialBias] of zones) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = minR + Math.pow(Math.random(), radialBias) * (maxR - minR);
        const y = (Math.random() - 0.5) * ySpread;
        pos[idx * 3] = Math.cos(angle) * r;
        pos[idx * 3 + 1] = y;
        pos[idx * 3 + 2] = Math.sin(angle) * r;
        idx++;
      }
    }

    return pos;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color="#ffffff"
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        map={circleTexture}
        alphaTest={0.001}
      />
    </points>
  );
}

/* ─── Outer Ring Particles (sparse, dimmer, wider spread) ────────── */

function OuterRingParticles() {
  const circleTexture = useMemo(() => createGlowTexture(), []);

  const positions = useMemo(() => {
    const zones: [number, number, number, number, number][] = [
      [7.5,  9.5,  2200, 0.20, 1.0],
      [9.5,  11.5, 1800, 0.32, 1.0],
      [11.5, 13.0, 1200, 0.45, 1.0],
      [13.0, 15.0,  700, 0.60, 1.0],
    ];

    const totalCount = zones.reduce((s, z) => s + z[2], 0);
    const pos = new Float32Array(totalCount * 3);
    let idx = 0;

    for (const [minR, maxR, count, ySpread, radialBias] of zones) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = minR + Math.pow(Math.random(), radialBias) * (maxR - minR);
        const y = (Math.random() - 0.5) * ySpread;
        pos[idx * 3] = Math.cos(angle) * r;
        pos[idx * 3 + 1] = y;
        pos[idx * 3 + 2] = Math.sin(angle) * r;
        idx++;
      }
    }

    return pos;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.09}
        color="#ffffff"
        transparent
        opacity={0.42}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        map={circleTexture}
        alphaTest={0.001}
      />
    </points>
  );
}

/* ─── GPU-Instanced Photo Frames ─────────────────────────────────── */

function InstancedPhotoFrames({
  textures,
  count,
  scatteredPositions,
  diskAngleRef,
}: {
  textures: THREE.Texture[];
  count: number;
  scatteredPositions: THREE.Vector3[];
  diskAngleRef: React.RefObject<number>;
}) {
  const borderRef = useRef<THREE.InstancedMesh>(null);
  const photoRefs = useRef<Map<number, THREE.InstancedMesh>>(new Map());
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const texLen = textures.length;

  const instanceCounts = useMemo(() => {
    const counts = new Array(texLen).fill(0) as number[];
    for (let i = 0; i < count; i++) counts[i % texLen]++;
    return counts;
  }, [count, texLen]);

  // Persistent counter array — avoids allocation every frame
  const countersRef = useRef<number[]>([]);

  // Hide all instances at origin before useFrame positions them
  useEffect(() => {
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    const border = borderRef.current;
    if (border) {
      for (let i = 0; i < count; i++) border.setMatrixAt(i, hidden);
      border.instanceMatrix.needsUpdate = true;
    }
    for (const m of photoRefs.current.values()) {
      for (let i = 0; i < m.count; i++) m.setMatrixAt(i, hidden);
      m.instanceMatrix.needsUpdate = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state) => {
    const border = borderRef.current;
    if (!border) return;

    const cam = state.camera.quaternion;
    const angle = diskAngleRef.current ?? 0;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Reset per-texture counters
    if (countersRef.current.length !== texLen)
      countersRef.current = new Array(texLen).fill(0) as number[];
    else for (let j = 0; j < texLen; j++) countersRef.current[j] = 0;

    for (let i = 0; i < count; i++) {
      const bp = scatteredPositions[i];
      if (!bp) continue;

      // Rotate position around Y axis by disk angle
      const rx = bp.x * cosA - bp.z * sinA;
      const rz = bp.x * sinA + bp.z * cosA;

      // Billboard facing camera (positions are in world space — billboard is correct)
      dummy.position.set(rx, bp.y, rz);
      dummy.quaternion.copy(cam);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();

      // Photo instance
      const texIdx = i % texLen;
      const photoMesh = photoRefs.current.get(texIdx);
      if (photoMesh) {
        photoMesh.setMatrixAt(countersRef.current[texIdx]++, dummy.matrix);
      }

      // Border: shift slightly behind in camera-local z
      dummy.translateZ(-0.005);
      dummy.updateMatrix();
      border.setMatrixAt(i, dummy.matrix);
    }

    border.instanceMatrix.needsUpdate = true;
    for (const m of photoRefs.current.values()) {
      m.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh
        ref={borderRef}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <planeGeometry args={[FRAME_W, FRAME_H]} />
        <meshBasicMaterial color="#ffffff" />
      </instancedMesh>
      {textures.map((tex, tIdx) => (
        <instancedMesh
          key={tIdx}
          ref={(el) => {
            if (el) photoRefs.current.set(tIdx, el);
            else photoRefs.current.delete(tIdx);
          }}
          args={[undefined, undefined, instanceCounts[tIdx]]}
          frustumCulled={false}
        >
          <planeGeometry args={[FRAME_W - INSET * 2, FRAME_H - INSET * 2]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </instancedMesh>
      ))}
    </>
  );
}

/* ─── Main Scattered Frames Component ────────────────────────────── */

function ScatteredFramesInner({ textures }: { textures: THREE.Texture[] }) {
  const particleCount = useGalleryStore((s) => s.settings.particle_count);
  const count = Math.min(particleCount, 160);

  const diskAngleRef = useRef(0);
  const ringGroupRef = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    diskAngleRef.current += DISK_ROTATE_SPEED * delta;
    if (ringGroupRef.current) {
      ringGroupRef.current.rotation.y = diskAngleRef.current;
    }
  });

  /* eslint-disable react-hooks/purity */
  const scatteredPositions = useMemo(() => {
    const minRadius = 5.5;
    const maxRadius = 14;

    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      const randomY = (Math.random() - 0.5) * 1.5;

      return new THREE.Vector3(
        Math.cos(angle) * radius,
        randomY,
        Math.sin(angle) * radius
      );
    });
  }, [count]);
  /* eslint-enable react-hooks/purity */

  return (
    <group>
      <group ref={ringGroupRef}>
        <InnerRingParticles />
        <OuterRingParticles />
      </group>
      <InstancedPhotoFrames
        textures={textures}
        count={count}
        scatteredPositions={scatteredPositions}
        diskAngleRef={diskAngleRef}
      />
    </group>
  );
}

function OrbitingFramesWithTextures({ urls }: { urls: string[] }) {
  const textures = useTexture(urls);
  const arr = Array.isArray(textures) ? textures : [textures];
  return <ScatteredFramesInner textures={arr} />;
}

export function OrbitingFrames() {
  const images = useGalleryStore((s) => s.images);
  const urls = useMemo(() => images.map((img) => img.url), [images]);

  if (!urls.length) return null;

  return <OrbitingFramesWithTextures urls={urls} />;
}

