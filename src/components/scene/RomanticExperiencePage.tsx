"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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

const DEFAULT_AUDIO_SOURCE = "/message-in-a-bottle-taylor-swift.mp3";
const INVALID_SLUG_MESSAGE = "Halaman Tidak Ditemukan / QR Tidak Valid";

interface RomanticExperiencePageProps {
  slug: string;
}

export function RomanticExperiencePage({ slug }: RomanticExperiencePageProps) {
  const status = useGalleryStore((s) => s.status);
  const error = useGalleryStore((s) => s.error);
  const client = useGalleryStore((s) => s.client);
  const fetchPublicData = useGalleryStore((s) => s.fetchPublicData);
  const toggleZoom = useCinematicStore((s) => s.toggleZoom);
  const restartCinematic = useCinematicStore((s) => s.restartCinematic);
  const isStopped = useCinematicStore((s) => s.isStopped);
  const stopCinematic = useCinematicStore((s) => s.stopCinematic);
  const resetCinematic = useCinematicStore((s) => s.resetCinematic);

  const [hasStarted, setHasStarted] = useState(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const [isClosingEyes, setIsClosingEyes] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const musicUrl = useMemo(
    () => client?.music_url?.trim() || DEFAULT_AUDIO_SOURCE,
    [client?.music_url]
  );

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

  useEffect(() => {
    setHasStarted(false);
    setIsClosingEyes(false);
    audioRef.current?.pause();
    resetCinematic();
    void fetchPublicData(slug);
  }, [fetchPublicData, resetCinematic, slug]);

  useEffect(() => {
    const audio = new Audio(musicUrl);
    audio.loop = false;
    audioRef.current = audio;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let hasClosedInThisPlay = false;

    const handleTimeUpdate = () => {
      if (
        audio.duration &&
        audio.duration - audio.currentTime <= 2.2 &&
        !hasClosedInThisPlay
      ) {
        hasClosedInThisPlay = true;
        setIsClosingEyes(true);
        timeoutId = setTimeout(() => {
          setIsClosingEyes(false);
        }, 3700);
      }
    };

    const handleEnded = () => {
      hasClosedInThisPlay = false;
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      if (timeoutId) clearTimeout(timeoutId);
      audio.pause();
      gainNodeRef.current = null;
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [musicUrl]);

  function ensureAudioContext() {
    if (!audioRef.current) return;
    if (audioCtxRef.current) return;

    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audioRef.current);
    const gain = ctx.createGain();
    source.connect(gain);
    gain.connect(ctx.destination);
    audioCtxRef.current = ctx;
    gainNodeRef.current = gain;
  }

  function playWithFadeIn() {
    if (!audioRef.current) return;
    ensureAudioContext();
    if (!audioCtxRef.current || !gainNodeRef.current) return;

    const ctx = audioCtxRef.current;
    const gain = gainNodeRef.current;
    if (ctx.state === "suspended") void ctx.resume();
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1);
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }

  function handleStart() {
    setHasStarted(true);
    setIsClosingEyes(false);
    toggleZoom();
    playWithFadeIn();
  }

  function handleStartOver() {
    setIsClosingEyes(false);
    restartCinematic();
    playWithFadeIn();
  }

  function handleStop() {
    setIsClosingEyes(false);
    stopCinematic();
    audioRef.current?.pause();
  }

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-muted">Lagi bikin gallery untuk `{slug}`...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    const isInvalidSlug = error === INVALID_SLUG_MESSAGE;

    return (
      <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black px-6 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(232,168,124,0.18),transparent_40%),radial-gradient(circle_at_bottom,rgba(255,122,89,0.12),transparent_35%)]" />
        <div className="relative z-10 flex max-w-xl flex-col items-center gap-5 rounded-3xl border border-white/10 bg-white/5 px-8 py-10 backdrop-blur-xl">
          <span className="rounded-full border border-[#e8a87c]/40 px-4 py-1 text-xs uppercase tracking-[0.32em] text-[#f0c8a0]">
            Romantic Route
          </span>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            {isInvalidSlug ? INVALID_SLUG_MESSAGE : "Terjadi Masalah Saat Membuka Halaman"}
          </h1>
          <p className="max-w-md text-sm leading-7 text-white/70 sm:text-base">
            {isInvalidSlug
              ? `URL /${slug} tidak terdaftar di database, jadi QR code ini belum valid atau sudah tidak aktif.`
              : error}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => void fetchPublicData(slug)}
              className="rounded-full bg-[#e8a87c] px-5 py-2.5 text-sm font-medium text-black transition hover:bg-[#f3c299]"
            >
              Coba lagi
            </button>
            <Link
              href="/"
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/85 transition hover:border-[#e8a87c]/60 hover:text-white"
            >
              Kembali ke halaman utama
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-black"
      style={{
        filter: isClosingEyes ? "blur(12px)" : "blur(0px)",
        transition: "filter 2.2s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <Scene3D />
      <InstructionOverlay />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: "-25vw",
          width: "150vw",
          height: "55vh",
          backgroundColor: "#000",
          borderBottomLeftRadius: "50%",
          borderBottomRightRadius: "50%",
          transform: isClosingEyes ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 2.2s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 90,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "-25vw",
          width: "150vw",
          height: "55vh",
          backgroundColor: "#000",
          borderTopLeftRadius: "50%",
          borderTopRightRadius: "50%",
          transform: isClosingEyes ? "translateY(0)" : "translateY(100%)",
          transition: "transform 2.2s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 90,
          pointerEvents: "none",
        }}
      />

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
            {client?.name ? `kamu bisa click dimana aja, ${client.name}` : "kamu bisa click dimana aja"}
          </p>
        )}
      </div>

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
            e.currentTarget.style.borderColor = "rgba(232,168,124,0.75)";
            e.currentTarget.style.background = "rgba(5,5,5,0.85)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(232,168,124,0.35)";
            e.currentTarget.style.background = "rgba(5,5,5,0.65)";
          }}
        >
          <Square size={13} strokeWidth={1.8} />
          <span>Stop</span>
        </button>
      )}

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
          e.currentTarget.style.borderColor = "rgba(232,168,124,0.75)";
          e.currentTarget.style.background = "rgba(5,5,5,0.85)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(232,168,124,0.35)";
          e.currentTarget.style.background = "rgba(5,5,5,0.65)";
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