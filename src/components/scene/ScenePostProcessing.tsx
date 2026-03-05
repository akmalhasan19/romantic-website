"use client";

import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useCinematicStore } from "@/store/cinematic-store";

export function ScenePostProcessing() {
  const bloomIntensity = useCinematicStore((s) => s.bloomIntensity);

  return (
    <EffectComposer enableNormalPass={false}>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={0.35}
        luminanceSmoothing={0.7}
        mipmapBlur
        blendFunction={BlendFunction.ADD}
      />
    </EffectComposer>
  );
}
