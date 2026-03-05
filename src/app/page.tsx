"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Play, RotateCcw, Square } from "lucide-react";
import { useGalleryStore } from "@/store/gallery-store";
import { useCinematicStore } from "@/store/cinematic-store";
import { Spinner } from "@/components/ui";
import { InstructionOverlay } from "@/components/scene";

const Scene3D = dynamic(
  () =>
    import("@/components/scene/Scene3D").then((m) => ({
      default: m.Scene3D,
    })),
  { ssr: false }
);

export default function Home() {
  const status = useGalleryStore((s) => s.status);
  const error = useGalleryStore((s) => s.error);
  const fetchPublicData = useGalleryStore((s) => s.fetchPublicData);
  const isZoomedIn         = useCinematicStore((s) => s.isZoomedIn);
  const toggleZoom         = useCinematicStore((s) => s.toggleZoom);
  const restartCinematic   = useCinematicStore((s) => s.restartCinematic);
  const isStopped          = useCinematicStore((s) => s.isStopped);
  const stopCinematic      = useCinematicStore((s) => s.stopCinematic);

  const [hasStarted, setHasStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/message-in-a-bottle-taylor-swift.mp3");
    audioRef.current.loop = false;
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  function handleStart() {
    setHasStarted(true);
    toggleZoom();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }

  function handleStartOver() {
    restartCinematic();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }

  function handleStop() {
    stopCinematic();
    audioRef.current?.pause();
  }

  useEffect(() => {
    fetchPublicData();
  }, [fetchPublicData]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-muted">Lagi bikin gallery...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={fetchPublicData}
            className="rounded bg-accent px-4 py-2 text-sm text-background hover:bg-accent-soft"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen">
      <Scene3D />
      <InstructionOverlay />

      {/* Stop button — visible only while animation is running */}
      {hasStarted && !isStopped && (
        <button
          onClick={handleStop}
          aria-label="Stop"
          style={{
            position: "absolute",
            bottom: "1.5rem",
            right: "8.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.55rem 0.9rem",
            borderRadius: "999px",
            background: "rgba(5,5,5,0.65)",
            border: "1px solid rgba(232,168,124,0.35)",
            color: "#e8a87c",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
            fontSize: "0.75rem",
            fontFamily: "inherit",
            letterSpacing: "0.04em",
            transition: "border-color 0.3s, background 0.3s",
            zIndex: 50,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(232,168,124,0.75)";
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(5,5,5,0.85)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(232,168,124,0.35)";
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(5,5,5,0.65)";
          }}
        >
          <Square size={13} strokeWidth={1.8} />
          <span>Stop</span>
        </button>
      )}

      {/* Cinematic trigger button — bottom right */}
      <button
        onClick={hasStarted ? handleStartOver : handleStart}
        aria-label={hasStarted ? "Start Over" : "Start"}
        style={{
          position: "absolute",
          bottom: "1.5rem",
          right: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.55rem 0.9rem",
          borderRadius: "999px",
          background: "rgba(5,5,5,0.65)",
          border: "1px solid rgba(232,168,124,0.35)",
          color: "#e8a87c",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          fontSize: "0.75rem",
          fontFamily: "inherit",
          letterSpacing: "0.04em",
          transition: "border-color 0.3s, background 0.3s",
          zIndex: 50,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(232,168,124,0.75)";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(5,5,5,0.85)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(232,168,124,0.35)";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(5,5,5,0.65)";
        }}
      >
        {hasStarted ? (
          <RotateCcw size={15} strokeWidth={1.8} />
        ) : (
          <Play size={15} strokeWidth={1.8} />
        )}
        <span>{hasStarted ? "Start Over" : "Start"}</span>
      </button>
    </div>
  );
}

