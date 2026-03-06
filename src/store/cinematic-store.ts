import { create } from "zustand";

export type CameraPhase = "IDLE" | "ORBIT" | "DIVE" | "IMMERSIVE";

interface CinematicState {
  phase: CameraPhase;
  bloomIntensity: number;
  isInsideHeart: boolean;
  isZoomedIn: boolean;
  /** Incremented each time the animation should restart from the beginning */
  cinematicKey: number;
  /** When true, the camera animation is paused wherever it is */
  isStopped: boolean;
  /** Whether the user has clicked start to begin the experience */
  hasStarted: boolean;
  /** True when the cinematic camera animation has reached the end */
  isCinematicDone: boolean;
  setPhase: (phase: CameraPhase) => void;
  setBloomIntensity: (v: number) => void;
  setIsInsideHeart: (v: boolean) => void;
  /** Set the experience as started */
  setHasStarted: (v: boolean) => void;
  /** Set whether the cinematic is finished */
  setCinematicDone: (v: boolean) => void;
  /** Transition from IDLE → ORBIT and start the experience */
  startCinematic: () => void;
  /** Toggle slow cinematic zoom-in / zoom-out */
  toggleZoom: () => void;
  /** Teleport camera back to start and replay the animation from scratch */
  restartCinematic: () => void;
  /** Freeze animation in place */
  stopCinematic: () => void;
  /** Reset cinematic state when entering a different client route */
  resetCinematic: () => void;
}

export const useCinematicStore = create<CinematicState>((set) => ({
  phase: "IDLE",
  bloomIntensity: 0.2,
  isInsideHeart: false,
  isZoomedIn: false,
  cinematicKey: 0,
  isStopped: false,
  hasStarted: false,
  isCinematicDone: false,
  setPhase: (phase) => set({ phase }),
  setBloomIntensity: (bloomIntensity) => set({ bloomIntensity }),
  setIsInsideHeart: (isInsideHeart) => set({ isInsideHeart }),
  setHasStarted: (hasStarted) => set({ hasStarted }),
  setCinematicDone: (isCinematicDone) => set({ isCinematicDone }),
  startCinematic: () => set({ phase: "ORBIT", hasStarted: true, isCinematicDone: false }),
  toggleZoom: () => set((s) => ({ isZoomedIn: !s.isZoomedIn, hasStarted: true, isCinematicDone: false })),
  restartCinematic: () =>
    set((s) => ({ cinematicKey: s.cinematicKey + 1, isZoomedIn: true, isStopped: false, hasStarted: true, isCinematicDone: false })),
  stopCinematic: () => set({ isStopped: true }),
  resetCinematic: () =>
    set((s) => ({
      phase: "IDLE",
      bloomIntensity: 0.2,
      isInsideHeart: false,
      isZoomedIn: false,
      cinematicKey: s.cinematicKey + 1,
      isStopped: false,
      hasStarted: false,
      isCinematicDone: false,
    })),
}));
