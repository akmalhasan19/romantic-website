"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Calendar, Sparkles } from "lucide-react";
import { useGalleryStore } from "@/store/gallery-store";

export function PhotoMemoryModal() {
  const images = useGalleryStore((s) => s.images);
  const activeMemoryIndex = useGalleryStore((s) => s.activeMemoryIndex);
  const closeMemoryModal = useGalleryStore((s) => s.closeMemoryModal);
  const nextMemory = useGalleryStore((s) => s.nextMemory);
  const prevMemory = useGalleryStore((s) => s.prevMemory);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState<number>(0);
  const modalRef = useRef<HTMLDivElement>(null);

  const isOpen = activeMemoryIndex !== null && images.length > 0;
  const currentImage = isOpen && activeMemoryIndex < images.length ? images[activeMemoryIndex] : null;

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMemoryModal();
      } else if (e.key === "ArrowRight") {
        nextMemory();
      } else if (e.key === "ArrowLeft") {
        prevMemory();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeMemoryModal, nextMemory, prevMemory]);

  // Touch handlers for mobile swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchDeltaX(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
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

  if (!isOpen || !currentImage) return null;

  const memoryNumber = activeMemoryIndex + 1;
  const totalMemories = images.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo Memory Lightbox"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 transition-all duration-300 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeMemoryModal();
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={closeMemoryModal}
        aria-label="Close memory modal"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[130] flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-[#f0c8a0] backdrop-blur-lg transition-all duration-200 hover:scale-110 hover:border-[#e8a87c] hover:bg-black/90 active:scale-95"
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
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-[130] flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-[#f0c8a0] backdrop-blur-lg transition-all duration-200 hover:scale-110 hover:border-[#e8a87c] hover:bg-black/90 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
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
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-[130] flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-[#f0c8a0] backdrop-blur-lg transition-all duration-200 hover:scale-110 hover:border-[#e8a87c] hover:bg-black/90 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
        >
          <ChevronRight size={26} strokeWidth={2.2} />
        </button>
      )}

      {/* Modal Container */}
      <div
        ref={modalRef}
        className="relative flex flex-col items-center max-w-4xl max-h-[92vh] w-full rounded-3xl border border-white/15 bg-gradient-to-b from-[#141210]/95 via-[#0c0a09]/95 to-black/95 p-4 sm:p-6 shadow-[0_0_60px_rgba(232,168,124,0.15)] overflow-hidden"
      >
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full bg-[#e8a87c]/15 blur-3xl" />

        {/* Header Indicator */}
        <div className="flex items-center justify-between w-full mb-3 px-2">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-[#e8a87c]">
            <Sparkles size={13} className="text-[#e8a87c]" />
            <span>Momen Kenangan {memoryNumber} / {totalMemories}</span>
          </div>

          {currentImage.memory_date && (
            <div className="flex items-center gap-1.5 text-xs text-white/70 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              <Calendar size={12} className="text-[#e8a87c]" />
              <span>{currentImage.memory_date}</span>
            </div>
          )}
        </div>

        {/* Photo Box */}
        <div className="relative flex items-center justify-center w-full flex-1 min-h-0 overflow-hidden my-auto rounded-2xl bg-black/60 border border-white/10 shadow-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImage.url}
            alt={currentImage.caption || `Kenangan ${memoryNumber}`}
            className="max-h-[55vh] sm:max-h-[60vh] max-w-full w-auto object-contain rounded-xl select-none transition-transform duration-300"
            draggable={false}
          />
        </div>

        {/* Caption Card */}
        <div className="w-full mt-4 text-center px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
          {currentImage.caption ? (
            <p className="font-serif italic text-base sm:text-lg leading-relaxed text-[#f0e6d3] text-balance">
              &ldquo;{currentImage.caption}&rdquo;
            </p>
          ) : (
            <p className="font-serif italic text-sm sm:text-base text-white/50">
              Momen indah yang tak lekang oleh waktu bersamamu.
            </p>
          )}
        </div>

        {/* Footer tip for desktop/mobile */}
        <p className="mt-2.5 text-[11px] text-white/40 tracking-wider">
          Gunakan tombol panah ◀ ▶ atau geser layar untuk berpindah foto
        </p>
      </div>
    </div>
  );
}
