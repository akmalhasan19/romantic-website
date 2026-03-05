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
  setPhase: (phase: CameraPhase) => void;
  setBloomIntensity: (v: number) => void;
  setIsInsideHeart: (v: boolean) => void;
  /** Transition from IDLE → ORBIT and start the experience */
  startCinematic: () => void;
  /** Toggle slow cinematic zoom-in / zoom-out */
  toggleZoom: () => void;
  /** Teleport camera back to start and replay the animation from scratch */
  restartCinematic: () => void;
  /** Freeze animation in place */
  stopCinematic: () => void;
}

export const useCinematicStore = create<CinematicState>((set) => ({
  phase: "IDLE",
  bloomIntensity: 0.2,
  isInsideHeart: false,
  isZoomedIn: false,
  cinematicKey: 0,
  isStopped: false,
  setPhase: (phase) => set({ phase }),
  setBloomIntensity: (bloomIntensity) => set({ bloomIntensity }),
  setIsInsideHeart: (isInsideHeart) => set({ isInsideHeart }),
  startCinematic: () => set({ phase: "ORBIT" }),
  toggleZoom: () => set((s) => ({ isZoomedIn: !s.isZoomedIn })),
  restartCinematic: () =>
    set((s) => ({ cinematicKey: s.cinematicKey + 1, isZoomedIn: true, isStopped: false })),
  stopCinematic: () => set({ isStopped: true }),
}));
