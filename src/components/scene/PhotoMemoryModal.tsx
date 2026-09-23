"use client";

import { useEffect, useRef, useState, useCallback, useMemo, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, X, Calendar, Sparkles } from "lucide-react";
import { useGalleryStore, type MemoryModalOrigin } from "@/store/gallery-store";

export function PhotoMemoryModal() {
  const images = useGalleryStore((s) => s.images);
  const activeMemoryIndex = useGalleryStore((s) => s.activeMemoryIndex);
  const memoryOriginRect = useGalleryStore((s) => s.memoryOriginRect);
  const closeMemoryModal = useGalleryStore((s) => s.closeMemoryModal);
  const nextMemory = useGalleryStore((s) => s.nextMemory);
  const prevMemory = useGalleryStore((s) => s.prevMemory);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState<number>(0);
  const [isClosing, setIsClosing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState<MemoryModalOrigin | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFlownInRef = useRef(false);

  const isOpen = activeMemoryIndex !== null && images.length > 0;
  const currentImage = isOpen && activeMemoryIndex < images.length ? images[activeMemoryIndex] : null;

  // Handle closing with smooth reverse flight
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);

    if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
    closingTimerRef.current = setTimeout(() => {
      closeMemoryModal();
      setIsClosing(false);
      setIsReady(false);
      hasFlownInRef.current = false;
      setCurrentOrigin(null);
    }, 420);
  }, [closeMemoryModal, isClosing]);

  // When modal opens, initialize flight origin and trigger entrance
  useEffect(() => {
    if (isOpen) {
      if (!hasFlownInRef.current) {
        setIsClosing(false);
        setIsReady(false);
        const origin = memoryOriginRect ?? {
          x: typeof window !== "undefined" ? window.innerWidth / 2 : 500,
          y: typeof window !== "undefined" ? window.innerHeight / 2 : 400,
          width: 60,
          height: 80,
        };
        setCurrentOrigin(origin);

        // Wait for next animation frames to measure and start transition smoothly
        const raf1 = requestAnimationFrame(() => {
          const raf2 = requestAnimationFrame(() => {
            setIsReady(true);
            hasFlownInRef.current = true;
          });
          return () => cancelAnimationFrame(raf2);
        });

        return () => cancelAnimationFrame(raf1);
      }
    } else {
      setIsReady(false);
      setIsClosing(false);
      hasFlownInRef.current = false;
      setCurrentOrigin(null);
      if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
    }
  }, [isOpen, memoryOriginRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowRight") {
        nextMemory();
      } else if (e.key === "ArrowLeft") {
        prevMemory();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose, nextMemory, prevMemory]);

  // Touch handlers for mobile swipe
  const handleTouchStart = useCallback((e: TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchDeltaX(0);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (touchStartX === null) return;
    setTouchDeltaX(e.touches[0].clientX - touchStartX);
  }, [touchStartX]);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX === null) return;
    const threshold = 50; // pixels to trigger swipe
    if (touchDeltaX > threshold) {
      prevMemory();
    } else if (touchDeltaX < -threshold) {
      nextMemory();
    }
    setTouchStartX(null);
    setTouchDeltaX(0);
  }, [touchStartX, touchDeltaX, nextMemory, prevMemory]);

  // Calculate transform delta from origin
  const transformStyle = useMemo(() => {
    if (typeof window === "undefined") return {};

    const origin = currentOrigin ?? {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      width: 60,
      height: 80,
    };

    const targetCenterX = window.innerWidth / 2;
    const targetCenterY = window.innerHeight / 2;

    const deltaX = origin.x - targetCenterX;
    const deltaY = origin.y - targetCenterY;

    // Approximate target width on screen (~480px on desktop, ~340px on mobile)
    const approxTargetWidth = Math.min(window.innerWidth * 0.85, 480);
    const initialScale = Math.max(0.08, Math.min(0.25, origin.width / approxTargetWidth));
    const initialRotate = Math.max(-10, Math.min(10, (deltaX / (window.innerWidth / 2)) * 7));

    const startTransform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${initialScale}) rotate(${initialRotate}deg)`;
    const finalTransform = `translate3d(0px, 0px, 0px) scale(1) rotate(0deg)`;

    const shouldBeAtFinal = isReady && !isClosing;

    return {
      transform: shouldBeAtFinal ? finalTransform : startTransform,
      transition: isClosing
        ? "transform 420ms cubic-bezier(0.25, 0.9, 0.3, 1), opacity 380ms ease"
        : "transform 650ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 650ms ease",
    };
  }, [currentOrigin, isReady, isClosing]);

  if (!isOpen || !currentImage) return null;

  const memoryNumber = activeMemoryIndex + 1;
  const totalMemories = images.length;
  const isFullyOpen = isReady && !isClosing;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo Memory Lightbox"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dark romantic backdrop with smooth fade */}
      <div
        className="absolute inset-0 bg-black/85 transition-all"
        style={{
          opacity: isFullyOpen ? 1 : 0,
          backdropFilter: isFullyOpen ? "blur(12px)" : "blur(0px)",
          WebkitBackdropFilter: isFullyOpen ? "blur(12px)" : "blur(0px)",
          transitionDuration: isClosing ? "380ms" : "550ms",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={handleClose}
      />

      {/* Close button with staggered fade */}
      <button
        onClick={handleClose}
        aria-label="Close memory modal"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[130] flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-[#f0c8a0] backdrop-blur-lg transition-all duration-300 hover:scale-110 hover:border-[#e8a87c] hover:bg-black/90 active:scale-95 shadow-lg"
        style={{
          opacity: isFullyOpen ? 1 : 0,
          transform: isFullyOpen ? "translateY(0)" : "translateY(-10px)",
          transition: isClosing
            ? "opacity 150ms ease, transform 150ms ease"
            : "opacity 400ms ease 250ms, transform 400ms ease 250ms",
        }}
      >
        <X size={20} strokeWidth={2.2} />
      </button>

      {/* Prev button */}
      {totalMemories > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            prevMemory();
          }}
          aria-label="Previous photo memory"
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-[130] flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-[#f0c8a0] backdrop-blur-lg transition-all duration-300 hover:scale-110 hover:border-[#e8a87c] hover:bg-black/90 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
          style={{
            opacity: isFullyOpen ? 1 : 0,
            transform: isFullyOpen
              ? "translateY(-50%) translateX(0)"
              : "translateY(-50%) translateX(-15px)",
            transition: isClosing
              ? "opacity 150ms ease, transform 150ms ease"
              : "opacity 400ms ease 250ms, transform 400ms ease 250ms",
          }}
        >
          <ChevronLeft size={26} strokeWidth={2.2} />
        </button>
      )}

      {/* Next button */}
      {totalMemories > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            nextMemory();
          }}
          aria-label="Next photo memory"
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-[130] flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-[#f0c8a0] backdrop-blur-lg transition-all duration-300 hover:scale-110 hover:border-[#e8a87c] hover:bg-black/90 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
          style={{
            opacity: isFullyOpen ? 1 : 0,
            transform: isFullyOpen
              ? "translateY(-50%) translateX(0)"
              : "translateY(-50%) translateX(15px)",
            transition: isClosing
              ? "opacity 150ms ease, transform 150ms ease"
              : "opacity 400ms ease 250ms, transform 400ms ease 250ms",
          }}
        >
          <ChevronRight size={26} strokeWidth={2.2} />
        </button>
      )}

      {/* The Flying Memory Card (Bingkai & Fotonya yang meluncur mendekat ke layar) */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="relative z-[125] flex flex-col items-center max-w-lg sm:max-w-xl md:max-w-2xl w-full max-h-[92vh] will-change-transform"
        style={transformStyle}
      >
        {/* Subtle decorative warm glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full bg-[#e8a87c]/20 blur-3xl" />

        {/* Header Indicator (staggered reveal) */}
        <div
          className="flex items-center justify-between w-full mb-2.5 px-2 transition-all duration-300"
          style={{
            opacity: isFullyOpen ? 1 : 0,
            transform: isFullyOpen ? "translateY(0)" : "translateY(-8px)",
            transition: isClosing
              ? "opacity 150ms ease"
              : "opacity 400ms ease 280ms, transform 400ms ease 280ms",
          }}
        >
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-[#e8a87c] font-medium drop-shadow">
            <Sparkles size={13} className="text-[#e8a87c]" />
            <span>
              Momen Kenangan {memoryNumber} / {totalMemories}
            </span>
          </div>

          {currentImage.memory_date && (
            <div className="flex items-center gap-1.5 text-xs text-white/80 bg-white/10 border border-white/15 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">
              <Calendar size={12} className="text-[#e8a87c]" />
              <span>{currentImage.memory_date}</span>
            </div>
          )}
        </div>

        {/* The Authentic Photo Frame (Bingkai Putih Presisi & Foto di Dalamnya) */}
        <div className="relative flex flex-col items-center w-full rounded-2xl sm:rounded-3xl bg-[#fdfbf7] p-2.5 sm:p-3.5 pb-3.5 sm:pb-4 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85),0_0_45px_rgba(232,168,124,0.25)] border border-white/40">
          <div className="relative flex items-center justify-center w-full max-h-[52vh] sm:max-h-[58vh] overflow-hidden rounded-xl sm:rounded-2xl bg-black/95 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={currentImage.id}
              src={currentImage.url}
              alt={currentImage.caption || `Kenangan ${memoryNumber}`}
              className="max-h-[52vh] sm:max-h-[58vh] max-w-full w-auto object-contain select-none transition-all duration-300 animate-in fade-in"
              draggable={false}
            />
          </div>
        </div>

        {/* Caption Card (staggered reveal when photo arrives) */}
        <div
          className="w-full mt-3 text-center px-5 py-3.5 rounded-2xl bg-black/75 border border-white/15 backdrop-blur-md shadow-2xl transition-all"
          style={{
            opacity: isFullyOpen ? 1 : 0,
            transform: isFullyOpen ? "translateY(0)" : "translateY(12px)",
            transition: isClosing
              ? "opacity 150ms ease"
              : "opacity 400ms ease 320ms, transform 400ms ease 320ms",
          }}
        >
          {currentImage.caption ? (
            <p className="font-serif italic text-base sm:text-lg leading-relaxed text-[#f0e6d3] text-balance">
              &ldquo;{currentImage.caption}&rdquo;
            </p>
          ) : (
            <p className="font-serif italic text-sm sm:text-base text-white/50">
              Momen indah yang tak lekang oleh waktu bersamamu.
            </p>
          )}

          {/* Footer tip */}
          <p className="mt-2 text-[10px] sm:text-[11px] text-white/40 tracking-wider">
            Gunakan tombol panah ◀ ▶ atau geser layar untuk berpindah foto
          </p>
        </div>
      </div>
    </div>
  );
}
