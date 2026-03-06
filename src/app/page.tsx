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
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);

  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    function check() {
      setIsMobilePortrait(isMobile && window.innerHeight > window.innerWidth);
    }
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const audio = new Audio("/message-in-a-bottle-taylor-swift.mp3");
    audio.loop = false;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioCtxRef.current?.close();
    };
  }, []);

  /** Wire audio element through a GainNode (once, on first play) */
  function ensureAudioContext() {
    if (audioCtxRef.current) return;
    const ctx    = new AudioContext();
    const source = ctx.createMediaElementSource(audioRef.current!);
    const gain   = ctx.createGain();
    source.connect(gain);
    gain.connect(ctx.destination);
    audioCtxRef.current = ctx;
    gainNodeRef.current = gain;
  }

  /** Fade the gain from 0 → 1 over 1 second, then play */
  function playWithFadeIn() {
    if (!audioRef.current) return;
    ensureAudioContext();
    const ctx  = audioCtxRef.current!;
    const gain = gainNodeRef.current!;
    if (ctx.state === "suspended") ctx.resume();
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1);
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }

  function handleStart() {
    setHasStarted(true);
    toggleZoom();
    playWithFadeIn();
  }

  function handleStartOver() {
    restartCinematic();
    playWithFadeIn();
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

      {/* Click-anywhere overlay — shown before first Start, fades out on click */}
      <div
        onClick={!isMobilePortrait ? handleStart : undefined}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.52)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.6rem",
          zIndex: 45,
          cursor: isMobilePortrait ? "default" : "pointer",
          opacity: hasStarted ? 0 : 1,
          pointerEvents: hasStarted ? "none" : "auto",
          transition: "opacity 0.6s ease",
        }}
      >
        {isMobilePortrait ? (
          <>
            <style>{`
              @keyframes tilt-phone {
                0%   { transform: rotate(0deg); }
                30%  { transform: rotate(-90deg); }
                70%  { transform: rotate(-90deg); }
                100% { transform: rotate(0deg); }
              }
            `}</style>
            {/* Phone icon with tilt animation */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f0c8a0"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                width: "clamp(3rem, 12vw, 4.5rem)",
                height: "clamp(3rem, 12vw, 4.5rem)",
                filter: "drop-shadow(0 0 12px rgba(232,168,124,0.5))",
                animation: "tilt-phone 2.4s ease-in-out infinite",
                pointerEvents: "none",
              }}
            >
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <circle cx="12" cy="18" r="1" fill="#f0c8a0" stroke="none" />
            </svg>
            <p
              style={{
                color: "#f0c8a0",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "clamp(1rem, 4.5vw, 1.3rem)",
                fontStyle: "italic",
                letterSpacing: "0.06em",
                textAlign: "center",
                textShadow: "0 0 24px rgba(232,168,124,0.55), 0 2px 8px rgba(0,0,0,0.8)",
                userSelect: "none",
                pointerEvents: "none",
                margin: 0,
              }}
            >
              miringin hpmu dulu, cantik
            </p>
            <p
              style={{
                color: "#f0c8a0",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "clamp(0.85rem, 3.5vw, 1.1rem)",
                fontStyle: "italic",
                letterSpacing: "0.06em",
                textAlign: "center",
                textShadow: "0 0 24px rgba(232,168,124,0.55), 0 2px 8px rgba(0,0,0,0.8)",
                userSelect: "none",
                pointerEvents: "none",
                margin: 0,
                marginTop: "0.5rem",
                opacity: 0.85,
              }}
            >
              jangan lupa gedein suaranya 🔊
            </p>
          </>
        ) : (
          <p
            style={{
              color: "#f0c8a0",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(1rem, 2.5vw, 1.4rem)",
              fontStyle: "italic",
              letterSpacing: "0.06em",
              textAlign: "center",
              textShadow: "0 0 24px rgba(232,168,124,0.55), 0 2px 8px rgba(0,0,0,0.8)",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            kamu bisa click dimana aja
          </p>
        )}
      </div>

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

