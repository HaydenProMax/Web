"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

type CarouselImage = {
  src: string;
  alt: string;
  caption?: string;
};

type WritingImageCarouselProps = {
  images: CarouselImage[];
  title?: string;
};

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function canUseNextImage(value?: string) {
  if (!value) {
    return false;
  }

  if (value.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

function renderImage(src: string, alt: string, className: string) {
  if (canUseNextImage(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        sizes="100vw"
        unoptimized={src.startsWith("/")}
      />
    );
  }

  return <img src={src} alt={alt} className={`h-full w-full ${className}`} />;
}

export function WritingImageCarousel({ images, title }: WritingImageCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const safeImages = useMemo(() => images.filter((image) => Boolean(image.src)), [images]);

  if (safeImages.length === 0) {
    return null;
  }

  function scrollToIndex(index: number) {
    const container = scrollerRef.current;
    const clampedIndex = Math.max(0, Math.min(index, safeImages.length - 1));

    if (!container) {
      setActiveIndex(clampedIndex);
      return;
    }

    const slide = container.children.item(clampedIndex) as HTMLElement | null;
    slide?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setActiveIndex(clampedIndex);
  }

  function handleScroll() {
    const container = scrollerRef.current;
    if (!container) {
      return;
    }

    const slides = Array.from(container.children) as HTMLElement[];
    if (slides.length === 0) {
      return;
    }

    const containerLeft = container.getBoundingClientRect().left;
    const nextIndex = slides.reduce((bestIndex, slide, index) => {
      const distance = Math.abs(slide.getBoundingClientRect().left - containerLeft);
      const bestDistance = Math.abs(slides[bestIndex].getBoundingClientRect().left - containerLeft);
      return distance < bestDistance ? index : bestIndex;
    }, 0);

    setActiveIndex(nextIndex);
  }

  return (
    <section className="space-y-3">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-surface-container-low shadow-ambient">
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {safeImages.map((image, index) => (
            <figure key={image.src} className="min-w-full snap-center space-y-3 p-3">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.35rem] bg-surface-container md:aspect-[5/4]">
                {renderImage(image.src, image.alt || title || "Post image", "object-contain")}
                <span className="absolute bottom-3 right-3 rounded-full bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  {index + 1}/{safeImages.length}
                </span>
              </div>
              {image.caption ? <figcaption className="px-1 text-sm text-foreground/60">{image.caption}</figcaption> : null}
            </figure>
          ))}
        </div>

        {safeImages.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => scrollToIndex(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-foreground shadow-ambient backdrop-blur disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              onClick={() => scrollToIndex(activeIndex + 1)}
              disabled={activeIndex === safeImages.length - 1}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-foreground shadow-ambient backdrop-blur disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRightIcon />
            </button>
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
              {safeImages.map((image, index) => (
                <button
                  key={image.src}
                  type="button"
                  aria-label={`Go to image ${index + 1}`}
                  onClick={() => scrollToIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === activeIndex ? "w-6 bg-primary" : "w-2 bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
