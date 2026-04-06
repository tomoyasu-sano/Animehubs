"use client";

import Image from "next/image";
import { useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: string[];
  alt: string;
  /** モバイルでフルブリード表示（ヘッダー裏まで広がる） */
  fullBleed?: boolean;
}

export default function ProductGallery({ images, alt, fullBleed }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const displayImages = images.length > 0 ? images : ["/placeholder/no-image.svg"];
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const goToPrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  }, [displayImages.length]);

  const goToNext = useCallback(() => {
    setSelectedIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  }, [displayImages.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;

    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div className="space-y-4">
      {/* メイン画像 */}
      <div
        className={cn(
          "relative overflow-hidden bg-card",
          fullBleed
            ? "aspect-[3/4] md:aspect-square md:rounded-lg md:border md:border-border"
            : "aspect-square rounded-lg border border-border"
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          src={displayImages[selectedIndex]}
          alt={`${alt} - ${selectedIndex + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />

        {/* ナビゲーション矢印（デスクトップ + タブレット） */}
        {displayImages.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="cursor-pointer absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-all hover:scale-110 hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToNext}
              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-all hover:scale-110 hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* ページインジケーター（モバイル・fullBleed時は数字スタイル） */}
        {displayImages.length > 1 && fullBleed && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white sm:hidden">
            {selectedIndex + 1} / {displayImages.length}
          </div>
        )}

        {/* ドットインジケーター（モバイル・通常時） */}
        {displayImages.length > 1 && !fullBleed && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 sm:hidden">
            {displayImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "cursor-pointer h-2 w-2 rounded-full transition-all",
                  selectedIndex === index
                    ? "w-4 bg-white"
                    : "bg-white/50"
                )}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* fullBleed時もデスクトップではドットの代わりに数字インジケーター表示 */}
        {displayImages.length > 1 && fullBleed && (
          <div className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white sm:block md:hidden">
            {selectedIndex + 1} / {displayImages.length}
          </div>
        )}
      </div>

      {/* サムネイル（タブレット以上のみ表示） */}
      {displayImages.length > 1 && (
        <div className={cn(
          "gap-2 overflow-x-auto",
          fullBleed ? "hidden md:flex" : "hidden sm:flex"
        )}>
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "cursor-pointer relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-foreground",
                selectedIndex === index
                  ? "ring-2 ring-foreground"
                  : "opacity-60 hover:opacity-100"
              )}
            >
              <Image src={image} alt={`${alt} thumbnail ${index + 1}`} fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
