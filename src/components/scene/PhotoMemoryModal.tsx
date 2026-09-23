"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, X, Calendar, Sparkles } from "lucide-react";
import { useGalleryStore } from "@/store/gallery-store";

export function PhotoMemoryModal() {
  const images = useGalleryStore((s) => s.images);
  const activeMemoryIndex = useGalleryStore((s) => s.activeMemoryIndex);
  const memoryOriginRect = useGalleryStore((s) => s.memoryOriginRect);
  const closeMemoryModal = useGalleryStore((s) => s.closeMemoryModal);
  const nextMemory = useGalleryStore((s) => s.nextMemory);
  const prevMemory = useGalleryStore((s) => s.prevMemory);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState<number>(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  const hasFlownInRef = useRef(false);
  const isClosingRef = useRef(false);
  const animGeometryRef = useRef<{
    deltaX: number;
    deltaY: number;
    scale: number;
    rotate: number;
  }>({ deltaX: 0, deltaY: 0, scale: 0.1, rotate: 0 });

  const isOpen = activeMemoryIndex !== null && images.length > 0;
  const currentImage = isOpen && activeMemoryIndex < images.length ? images[activeMemoryIndex] : null;

  // Handle closing with smooth reverse flight back to orbit
  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    const { deltaX, deltaY, scale, rotate } = animGeometryRef.current;

    // 1. Header & Caption fade out quickly
    if (headerRef.current) {
      headerRef.current.animate(
        [
          { opacity: "1", transform: "translateY(0px)" },
          { opacity: "0", transform: "translateY(-8px)" },
        ],
        { duration: 150, easing: "ease-out", fill: "forwards" }
      );
    }
    if (captionRef.current) {
      captionRef.current.animate(
        [
          { opacity: "1", transform: "translateY(0px)" },
          { opacity: "0", transform: "translateY(10px)" },
        ],
        { duration: 150, easing: "ease-out", fill: "forwards" }
      );
    }

    // 2. Navigation controls fade out
    if (controlsRef.current) {
      controlsRef.current.animate(
        [{ opacity: "1" }, { opacity: "0" }],
        { duration: 150, easing: "ease-out", fill: "forwards" }
      );
    }

    // 3. Backdrop fades out
    if (backdropRef.current) {
      backdropRef.current.animate(
        [
          { opacity: "1", backdropFilter: "blur(12px)" },
          { opacity: "0", backdropFilter: "blur(0px)" },
        ],
        { duration: 380, easing: "ease-out", fill: "forwards" }
      );
    }

    // 4. Card flies back and shrinks into the empty spot in the 3D orbit!
    if (cardRef.current) {
      const returnAnim = cardRef.current.animate(
        [
          {
            transform: "translate3d(0px, 0px, 0px) scale(1) rotate(0deg)",
            boxShadow: "0 25px 60px -10px rgba(0,0,0,0.85), 0 0 45px rgba(232,168,124,0.25)",
          },
          {
            transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scale}) rotate(${rotate}deg)`,
            boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
          },
        ],
        {
          duration: 420,
          easing: "cubic-bezier(0.2, 0.9, 0.3, 1)",
          fill: "forwards",
        }
      );

      returnAnim.onfinish = () => {
        closeMemoryModal();
        hasFlownInRef.current = false;
        isClosingRef.current = false;
      };
    } else {
      closeMemoryModal();
      hasFlownInRef.current = false;
      isClosingRef.current = false;
    }
  }, [closeMemoryModal]);

  // Launch opening flight animation from exact click position before first browser paint
  useLayoutEffect(() => {
    if (!isOpen || !cardRef.current) return;
    if (hasFlownInRef.current) return;

    isClosingRef.current = false;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const finalCenterX = rect.left + rect.width / 2;
    const finalCenterY = rect.top + rect.height / 2;

    const origin = memoryOriginRect ?? {
      x: typeof window !== "undefined" ? window.innerWidth / 2 : finalCenterX,
      y: typeof window !== "undefined" ? window.innerHeight / 2 : finalCenterY,
      width: 48,
      height: 64,
    };

    const deltaX = origin.x - finalCenterX;
    const deltaY = origin.y - finalCenterY;
    const cardWidth = rect.width || 420;
    const scale = Math.max(0.04, Math.min(0.25, origin.width / cardWidth));
    const rotate = Math.max(-10, Math.min(10, (deltaX / (window.innerWidth / 2)) * 7));

    animGeometryRef.current = { deltaX, deltaY, scale, rotate };

    // 1. Animate card flying from origin directly towards viewer into center!
    card.animate(
      [
        {
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scale}) rotate(${rotate}deg)`,
          boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
        },
        {
          transform: "translate3d(0px, 0px, 0px) scale(1) rotate(0deg)",
          boxShadow: "0 25px 60px -10px rgba(0,0,0,0.85), 0 0 45px rgba(232,168,124,0.25)",
        },
      ],
      {
        duration: 620,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "forwards",
      }
    );

    // 2. Animate backdrop fade & blur in
    if (backdropRef.current) {
      backdropRef.current.animate(
        [
          { opacity: "0", backdropFilter: "blur(0px)" },
          { opacity: "1", backdropFilter: "blur(12px)" },
        ],
        {
          duration: 520,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "forwards",
        }
      );
    }

    // 3. Staggered reveal for header as photo approaches center
    if (headerRef.current) {
      headerRef.current.animate(
        [
          { opacity: "0", transform: "translateY(-10px)" },
          { opacity: "1", transform: "translateY(0px)" },
        ],
        {
          duration: 380,
          delay: 240,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "forwards",
        }
      );
    }

    // 4. Staggered reveal for caption as photo approaches center
    if (captionRef.current) {
      captionRef.current.animate(
        [
          { opacity: "0", transform: "translateY(16px)" },
          { opacity: "1", transform: "translateY(0px)" },
        ],
        {
          duration: 400,
          delay: 240,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "forwards",
        }
      );
    }

    // 5. Staggered reveal for controls (close button, prev/next)
    if (controlsRef.current) {
      controlsRef.current.animate(
        [{ opacity: "0" }, { opacity: "1" }],
        {
          duration: 350,
          delay: 240,
          easing: "ease-out",
          fill: "forwards",
        }
      );
    }

    hasFlownInRef.current = true;
  }, [isOpen, memoryOriginRect]);

  // Reset state when closed externally
  useEffect(() => {
    if (!isOpen) {
      hasFlownInRef.current = false;
      isClosingRef.current = false;
    }
  }, [isOpen]);

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
    const threshold = 50;
    if (touchDeltaX > threshold) {
      prevMemory();
    } else if (touchDeltaX < -threshold) {
      nextMemory();
    }
    setTouchStartX(null);
    setTouchDeltaX(0);
  }, [touchStartX, touchDeltaX, nextMemory, prevMemory]);

  if (!isOpen || !currentImage) return null;

  const memoryNumber = activeMemoryIndex + 1;
  const totalMemories = images.length;

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
        ref={backdropRef}
        className="absolute inset-0 bg-black/85"
        style={{ opacity: 0 }}
        onClick={handleClose}
      />

      {/* Navigation and Close Controls (revealed via controlsRef) */}
      <div ref={controlsRef} className="pointer-events-none" style={{ opacity: 0 }}>
        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="Close memory modal"
          className="pointer-events-auto absolute top-4 right-4 sm:top-6 sm:right-6 z-[130] flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-[#f0c8a0] backdrop-blur-lg transition-all duration-300 hover:scale-110 hover:border-[#e8a87c] hover:bg-black/90 active:scale-95 shadow-lg"
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
            className="pointer-events-auto absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-[130] flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-[#f0c8a0] backdrop-blur-lg transition-all duration-300 hover:scale-110 hover:border-[#e8a87c] hover:bg-black/90 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
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
            className="pointer-events-auto absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-[130] flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-[#f0c8a0] backdrop-blur-lg transition-all duration-300 hover:scale-110 hover:border-[#e8a87c] hover:bg-black/90 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
          >
            <ChevronRight size={26} strokeWidth={2.2} />
          </button>
        )}
      </div>

      {/* The Flying Memory Card (Bingkai & Fotonya yang meluncur mendekat ke layar) */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="relative z-[125] flex flex-col items-center max-w-lg sm:max-w-xl md:max-w-2xl w-full max-h-[92vh] will-change-transform"
      >
        {/* Subtle decorative warm glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full bg-[#e8a87c]/20 blur-3xl" />

        {/* Header Indicator (staggered reveal via headerRef) */}
        <div ref={headerRef} className="w-full flex items-center justify-between mb-2.5 px-2" style={{ opacity: 0 }}>
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

        {/* Caption Card (staggered reveal via captionRef) */}
        <div
          ref={captionRef}
          className="w-full mt-3 text-center px-5 py-3.5 rounded-2xl bg-black/75 border border-white/15 backdrop-blur-md shadow-2xl transition-all"
          style={{ opacity: 0 }}
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
