"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useCinematicStore } from "@/store/cinematic-store";

// ── Starting position ──────────────────────────────────────────────
const CAM_X = 0;
const CAM_Y = 2.0;
const CAM_Z = 7.0;
const DIST_DEFAULT = Math.sqrt(CAM_X ** 2 + CAM_Y ** 2 + CAM_Z ** 2); // ≈ 7.28

// ── Phase targets ──────────────────────────────────────────────────
const DIST_ZOOMED    = 3.5;   // up close to the heart
const DIST_PULLBACK  = 15.0;  // well beyond outer orbit ring (~11)
const PULLBACK_Y     = 1.2;   // just slightly above orbit plane (orbit ySpread ≤ 0.4)
const PULLBACK_LOOK_Y = -0.4; // subtle downward tilt — barely below horizon

// ── Timing ────────────────────────────────────────────────────────
const DOLLY_DURATION    = 4.5;  // seconds — cinematic approach
const ORBIT_DURATION    = 1.4;  // seconds — linger close to the heart
const PULLBACK_DURATION = 8.0;  // seconds — orbiting retreat
const FINAL_ORBIT_DURATION = 3.5; // seconds — slow orbit at final distance after pullback
const ARC_DURATION         = 5.0; // seconds — 145° horizontal sweep with elevation bell curve
const ARC_SWEEP            = (180 * Math.PI) / 180; // radians — exact horizontal sweep of the arc
const ORBIT_SPEED       = 0.18; // rad/s — used for dolly-in blend
const PULLBACK_ORBIT_SPEED = 0.18; // rad/s during pullback — constant speed, ~65° total sweep
// Dolly-in orbit blend starts at this progress threshold so the orbit
// rotation gradually fades in before dolly-in finishes — no freeze between phases.
const ORBIT_BLEND_START = 0.72;

// Normalised initial speed for arc easing — ensures arc starts at the same
// angular velocity as final-orbit (no perceived stop at the transition).
// Derived from: initial_az_speed = ARC_SWEEP * v0 / ARC_DURATION = PULLBACK_ORBIT_SPEED
const ARC_V0 = (PULLBACK_ORBIT_SPEED * ARC_DURATION) / ARC_SWEEP;

// ── Easing ────────────────────────────────────────────────────────
// Smooth start AND smooth stop — camera decelerates into the heart, no snap.
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
// Slow start then smooth stop — cinematic ease-in-out for pullback
function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}
// Arc easing: starts at final-orbit angular speed (v0), decelerates to stop.
// Cubic Hermite with f(0)=0, f'(0)=v0, f(1)=1, f'(1)=0.
function easeArcOut(t: number): number {
  const v0 = ARC_V0;
  return (v0 - 2) * t * t * t + (3 - 2 * v0) * t * t + v0 * t;
}

type AnimPhase = "idle" | "dolly-in" | "orbit" | "pullback" | "final-orbit" | "arc" | "done";

export function CinematicCamera() {
  const { camera } = useThree();
  const isZoomedIn   = useCinematicStore((s) => s.isZoomedIn);
  const cinematicKey = useCinematicStore((s) => s.cinematicKey);
  const isStopped    = useCinematicStore((s) => s.isStopped);

  // Internal animation state — all refs to avoid re-renders
  const phaseRef             = useRef<AnimPhase>("idle");
  const tRef                 = useRef(0);
  const startDistRef         = useRef(DIST_DEFAULT);
  const orbitTimeRef         = useRef(0);
  const pullbackAzimuthRef   = useRef(0);
  const arcStartAzimuthRef   = useRef(0);
  const pullbackStartDistRef  = useRef(DIST_ZOOMED);
  const pullbackStartYRef     = useRef(0);

  const isZoomedInRef  = useRef(isZoomedIn);
  const isStoppedRef   = useRef(isStopped);
  const prevZoomedRef  = useRef(false);

  useEffect(() => { isZoomedInRef.current = isZoomedIn; }, [isZoomedIn]);
  useEffect(() => { isStoppedRef.current  = isStopped;  }, [isStopped]);

  // Initial camera placement
  useEffect(() => {
    camera.position.set(CAM_X, CAM_Y, CAM_Z);
    camera.lookAt(0, 0, 0);
    (camera as THREE.PerspectiveCamera).fov = 60;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera]);

  // "Start Over": teleport to start, reset all state → begin dolly-in immediately
  useEffect(() => {
    if (cinematicKey === 0) return;
    camera.position.set(CAM_X, CAM_Y, CAM_Z);
    camera.lookAt(0, 0, 0);
    startDistRef.current     = DIST_DEFAULT;
    tRef.current             = 0;
    orbitTimeRef.current     = 0;
    prevZoomedRef.current    = true;  // already zoomed-in after restartCinematic
    phaseRef.current         = "dolly-in";
  }, [cinematicKey, camera]);

  // Priority 1 → runs after OrbitControls (priority 0)
  useFrame((_state, delta) => {
    if (isStoppedRef.current) return;

    // First "Start" press: idle → dolly-in
    if (isZoomedInRef.current && !prevZoomedRef.current && phaseRef.current === "idle") {
      startDistRef.current  = camera.position.length();
      tRef.current          = 0;
      phaseRef.current      = "dolly-in";
      prevZoomedRef.current = true;
    }

    // ── Phase: dolly-in ──────────────────────────────────────────────
    if (phaseRef.current === "dolly-in") {
      tRef.current = Math.min(1, tRef.current + delta / DOLLY_DURATION);
      const eased   = easeInOutCubic(tRef.current);
      const newDist = THREE.MathUtils.lerp(startDistRef.current, DIST_ZOOMED, eased);
      camera.position.normalize().multiplyScalar(newDist);

      // Blend orbit rotation in gradually from ORBIT_BLEND_START → 1
      // so the camera is already arcing before dolly-in completes.
      if (tRef.current > ORBIT_BLEND_START) {
        const blendT = (tRef.current - ORBIT_BLEND_START) / (1 - ORBIT_BLEND_START);
        const orbitAngle = ORBIT_SPEED * delta * blendT;
        const cos = Math.cos(orbitAngle);
        const sin = Math.sin(orbitAngle);
        const x = camera.position.x;
        const z = camera.position.z;
        camera.position.x = x * cos - z * sin;
        camera.position.z = x * sin + z * cos;
      }

      camera.lookAt(0, 0, 0);

      if (tRef.current >= 1) {
        // Dolly-in done → enter close orbit phase (animation 2).
        // Azimuth captured here so the orbit starts seamlessly from this exact position.
        orbitTimeRef.current = 0;
        tRef.current         = 0;
        phaseRef.current     = "orbit";
      }
      return;
    }

    // ── Phase: orbit ─────────────────────────────────────────────────
    // Camera lingers close to the heart, rotating LEFT — same direction
    // as pullback so there is no direction-reversal snap at transition.
    if (phaseRef.current === "orbit") {
      orbitTimeRef.current += delta;
      // Same rotation matrix as pullback's leftward sweep
      const angle = ORBIT_SPEED * delta;
      const cos   = Math.cos(angle);
      const sin   = Math.sin(angle);
      const x = camera.position.x;
      const z = camera.position.z;
      camera.position.x = x * cos - z * sin;
      camera.position.z = x * sin + z * cos;
      camera.lookAt(0, 0, 0);

      if (orbitTimeRef.current >= ORBIT_DURATION) {
        // Capture XZ horizontal distance so pullback starts at exactly this position.
        pullbackAzimuthRef.current   = Math.atan2(camera.position.x, camera.position.z);
        pullbackStartDistRef.current = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
        pullbackStartYRef.current    = camera.position.y;
        tRef.current     = 0;
        phaseRef.current = "pullback";
      }
      return;
    }

    // ── Phase: pullback ───────────────────────────────────────────────
    // Camera orbits the Love 3D while retreating — orbit speed fades to 0
    // at the end so the stop feels natural, not abrupt.
    if (phaseRef.current === "pullback") {
      tRef.current = Math.min(1, tRef.current + delta / PULLBACK_DURATION);
      const eased = easeInOutQuart(tRef.current);

      // Constant rotation speed throughout pullback — evenly distributed from start to end
      pullbackAzimuthRef.current -= PULLBACK_ORBIT_SPEED * delta;

      // Radial distance and height both ease out
      const dist = THREE.MathUtils.lerp(pullbackStartDistRef.current, DIST_PULLBACK, eased);
      const y    = THREE.MathUtils.lerp(pullbackStartYRef.current,    PULLBACK_Y,    eased);

      const az = pullbackAzimuthRef.current;
      camera.position.set(
        Math.sin(az) * dist,
        y,
        Math.cos(az) * dist
      );

      // LookAt drifts subtly below horizon as camera retreats
      const lookY = THREE.MathUtils.lerp(0, PULLBACK_LOOK_Y, eased);
      camera.lookAt(0, lookY, 0);

      if (tRef.current >= 1) {
        orbitTimeRef.current = 0;
        phaseRef.current = "final-orbit";
      }
    }

    // ── Phase: final-orbit ───────────────────────────────────────────
    // Slow orbit at DIST_PULLBACK for 2 s after pullback completes.
    if (phaseRef.current === "final-orbit") {
      orbitTimeRef.current += delta;
      pullbackAzimuthRef.current -= PULLBACK_ORBIT_SPEED * delta;
      const az = pullbackAzimuthRef.current;
      camera.position.set(
        Math.sin(az) * DIST_PULLBACK,
        PULLBACK_Y,
        Math.cos(az) * DIST_PULLBACK
      );
      camera.lookAt(0, PULLBACK_LOOK_Y, 0);

      if (orbitTimeRef.current >= FINAL_ORBIT_DURATION) {
        // Capture the exact azimuth so arc can sweep precisely 180° from here
        arcStartAzimuthRef.current = pullbackAzimuthRef.current;
        tRef.current     = 0;
        phaseRef.current = "arc";
      }
    }

    // ── Phase: arc ───────────────────────────────────────────────────────
    // Sweeps exactly 180° to the opposite side of the orbit ring,
    // continuing the leftward rotation throughout.
    // Azimuth uses easeArcOut so it starts at the exact final-orbit speed (no stop).
    // Elevation uses easeInOutCubic (v0=0) so it begins rising only gently,
    // never jarring at the transition. LookAt blends from the final-orbit target
    // to (0,0,0) using the same soft elevation easing — full continuity.
    if (phaseRef.current === "arc") {
      tRef.current = Math.min(1, tRef.current + delta / ARC_DURATION);
      const easedAz   = easeArcOut(tRef.current);       // matches final-orbit azimuth speed
      const easedElev = easeInOutCubic(tRef.current);   // soft-start for elevation & lookAt

      // Azimuth sweeps exactly ARC_SWEEP radians leftward from the captured start
      const az = arcStartAzimuthRef.current - ARC_SWEEP * easedAz;
      pullbackAzimuthRef.current = az; // keep in sync for any future use

      const arcR     = Math.sqrt(DIST_PULLBACK ** 2 + PULLBACK_Y ** 2); // true sphere radius
      const elevBase = Math.atan2(PULLBACK_Y, DIST_PULLBACK); // ≈ 4.6°
      const ARC_ELEV_END = 0.30; // ~17° additional elevation above base
      // Elevation rises softly (v=0 at start) so it doesn't feel like an immediate heave
      const elev = elevBase + ARC_ELEV_END * easedElev;

      camera.position.set(
        arcR * Math.cos(elev) * Math.sin(az),
        arcR * Math.sin(elev),
        arcR * Math.cos(elev) * Math.cos(az)
      );

      // Blend lookAt from final-orbit's PULLBACK_LOOK_Y → 0 using the soft elevation
      // easing, so the camera tilt is fully continuous at the final-orbit → arc boundary.
      const lookY = THREE.MathUtils.lerp(PULLBACK_LOOK_Y, 0, easedElev);
      camera.lookAt(0, lookY, 0);

      if (tRef.current >= 1) {
        phaseRef.current = "done";
      }
    }
  }, 1);

  return null;
}
