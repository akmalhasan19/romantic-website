"use client";

import { Billboard, Text } from "@react-three/drei";
import { useGalleryStore } from "@/store/gallery-store";

export function FloatingMessage() {
  const { floating_text, target_name } = useGalleryStore((s) => s.settings);
  const displayTargetName =
    floating_text === "Only For U" && target_name === "My Love"
      ? "Pendek."
      : target_name;

  return (
    <group position={[0, 5.2, 0]}>
      <Billboard>
        <Text
          fontSize={0.62}
          color="#f0e6d3"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#e8a87c"
        >
          {floating_text}, {displayTargetName}
        </Text>
      </Billboard>
    </group>
  );
}
