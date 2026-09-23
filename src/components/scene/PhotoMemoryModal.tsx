"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback, type TouchEvent } from "react";
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
  const [loadedRatios, setLoadedRatios] = useState<Record<string, number>>({});

  const cardRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
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

  // Preload and detect image aspect ratio if not already provided in metadata
  useEffect(() => {
    if (!currentImage?.url) return;
    if (currentImage.width && currentImage.height && currentImage.height > 0) return;

    const img = new Image();
    img.src = currentImage.url;
    if (img.complete && img.naturalWidth && img.naturalHeight > 0) {
      const r = img.naturalWidth / img.naturalHeight;
      setLoadedRatios((prev) => (prev[currentImage.id] === r ? prev : { ...prev, [currentImage.id]: r }));
    } else {
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight > 0) {
          const r = img.naturalWidth / img.naturalHeight;
          setLoadedRatios((prev) => (prev[currentImage.id] === r ? prev : { ...prev, [currentImage.id]: r }));
        }
      };
    }
  }, [currentImage]);

  // Compute active ratio: metadata > loaded texture > origin rect > 3D base aspect (~0.746)
  const activeRatio = useMemo(() => {
    if (currentImage?.width && currentImage?.height && currentImage.height > 0) {
      return currentImage.width / currentImage.height;
    }
    if (currentImage && loadedRatios[currentImage.id]) {
      return loadedRatios[currentImage.id];
    }
    if (memoryOriginRect && memoryOriginRect.height > 0) {
      return memoryOriginRect.width / memoryOriginRect.height;
    }
    return 0.5 / 0.67; // default 3D aspect ratio
  }, [currentImage, loadedRatios, memoryOriginRect]);

  // Handle closing with smooth reverse flight back to the dynamically rotating orbit position
  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    // Calculate current destination where the empty slot has rotated to right now!
    const { hiddenInstanceId, getCurrentInstanceOrigin } = useGalleryStore.getState();
    let destOrigin: MemoryModalOrigin | null = null;
    if (hiddenInstanceId !== null && getCurrentInstanceOrigin) {
      destOrigin = getCurrentInstanceOrigin(hiddenInstanceId);
    }
    if (!destOrigin) {
      destOrigin = memoryOriginRect;
    }

    let deltaX = animGeometryRef.current.deltaX;
    let deltaY = animGeometryRef.current.deltaY;
    let scale = animGeometryRef.current.scale;
    let rotate = animGeometryRef.current.rotate;

    if (cardRef.current && destOrigin) {
      const rect = cardRef.current.getBoundingClientRect();
      const finalCenterX = rect.left + rect.width / 2;
      const finalCenterY = rect.top + rect.height / 2;
      deltaX = destOrigin.x - finalCenterX;
      deltaY = destOrigin.y - finalCenterY;
      const cardWidth = rect.width || 320;
      scale = Math.max(0.04, Math.min(0.28, destOrigin.width / cardWidth));
      rotate = Math.max(-10, Math.min(10, (deltaX / (window.innerWidth / 2)) * 7));
    }

    // 1. Caption inside the frame fades out quickly
    if (captionRef.current) {
      captionRef.current.animate(
        [
          { opacity: "1", transform: "translateY(0px)" },
          { opacity: "0", transform: "translateY(6px)" },
        ],
        { duration: 140, easing: "ease-out", fill: "forwards" }
      );
    }

    // 2. Navigation controls fade out
    if (controlsRef.current) {
      controlsRef.current.animate(
        [{ opacity: "1" }, { opacity: "0" }],
        { duration: 140, easing: "ease-out", fill: "forwards" }
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

    // 4. Card flies back and shrinks into the new rotated spot in the 3D orbit!
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
          duration: 440,
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
  }, [closeMemoryModal, memoryOriginRect]);

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
    const cardWidth = rect.width || 320;
    const scale = Math.max(0.04, Math.min(0.28, origin.width / cardWidth));
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

    // 3. Staggered reveal for caption inside the white chin as photo approaches center
    if (captionRef.current) {
      captionRef.current.animate(
        [
          { opacity: "0", transform: "translateY(12px)" },
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

    // 4. Staggered reveal for controls (close button, prev/next)
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

      {/* The Flying Memory Card (Bingkai Foto Persis Seperti yang Diclick) */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="relative z-[125] flex flex-col items-center will-change-transform"
        style={{
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 48px)",
        }}
      >
        {/* Subtle decorative warm glow */}
        <div className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl bg-[#e8a87c]/20 blur-3xl opacity-60" />

        {/* Unified Authentic Polaroid / Photo Frame with Dynamic Aspect Ratio */}
        <div className="relative flex flex-col items-center rounded-2xl bg-[#ffffff] p-3 sm:p-4 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85),0_10px_30px_rgba(0,0,0,0.4),0_0_40px_rgba(232,168,124,0.18)] border border-white/80 transition-all duration-300 ease-out select-none min-w-[260px] sm:min-w-[280px]">
          {/* Photo Container matching exact photo aspect ratio */}
          <div
            className="relative overflow-hidden rounded-xl bg-black/5 shadow-inner transition-all duration-300"
            style={{
              aspectRatio: activeRatio,
              maxHeight: "min(52vh, 480px)",
              maxWidth: activeRatio >= 1 ? "min(88vw, 540px)" : "min(86vw, 460px)",
              width: activeRatio >= 1 ? "min(88vw, 540px)" : "auto",
              height: activeRatio < 1 ? "min(52vh, 480px)" : "auto",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={currentImage.id}
              src={currentImage.url}
              alt={currentImage.caption || `Kenangan ${memoryNumber}`}
              className="w-full h-full object-cover select-none transition-opacity duration-300 animate-in fade-in"
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight > 0) {
                  const r = img.naturalWidth / img.naturalHeight;
                  setLoadedRatios((prev) =>
                    prev[currentImage.id] === r ? prev : { ...prev, [currentImage.id]: r }
                  );
                }
              }}
            />
          </div>

          {/* Extended Bottom Margin (Polaroid Chin) containing Captions & Meta */}
          <div
            ref={captionRef}
            className="w-full flex flex-col items-center text-center pt-3 pb-1 px-1 transition-opacity duration-200"
            style={{ opacity: 0 }}
          >
            {/* Top Meta: Memory Count & Memory Date */}
            <div className="flex items-center justify-center gap-2 mb-2 text-xs font-medium tracking-wide text-[#7d7063]">
              <span className="flex items-center gap-1 text-[#b5652e] font-semibold">
                <Sparkles size={12} className="text-[#b5652e]" />
                <span>Momen {memoryNumber} / {totalMemories}</span>
              </span>
              {currentImage.memory_date && (
                <>
                  <span className="text-[#d0c2b2]">•</span>
                  <span className="flex items-center gap-1 text-[#7d7063]">
                    <Calendar size={12} className="text-[#968270]" />
                    <span>{currentImage.memory_date}</span>
                  </span>
                </>
              )}
            </div>

            {/* Romantic Caption in Editorial Serif */}
            {currentImage.caption ? (
              <p className="font-serif italic text-base sm:text-lg leading-relaxed text-[#231e1a] text-balance max-h-[16vh] overflow-y-auto px-2">
                &ldquo;{currentImage.caption}&rdquo;
              </p>
            ) : (
              <p className="font-serif italic text-sm sm:text-base text-[#7d7063] text-balance px-2">
                Momen indah yang tak lekang oleh waktu bersamamu.
              </p>
            )}

            {/* Discreet Navigation Tip */}
            <p className="mt-2.5 text-[10px] sm:text-[11px] text-[#9e9082] tracking-wider select-none">
              ◀ geser layar atau gunakan tombol panah ▶
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
