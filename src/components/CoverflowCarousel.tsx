"use client";

import * as React from "react";
import { useEffect, useRef, useLayoutEffect, useState, useCallback } from "react";

export interface CoverflowSlide {
  src: string;
  alt?: string;
}

export interface CoverflowCarouselProps {
  slides?: CoverflowSlide[];
  /** CSS value for card width, e.g. "clamp(148px, 22vw, 260px)" or "260px" */
  cardWidth?: string;
  /** Rotation angle of side cards in degrees */
  rotate?: number;
  /** Depth factor for 3D push-back */
  depth?: number;
  /** Perspective multiplier (perspective = lens * 300 px) */
  lens?: number;
  /** Falloff exponent for distance ramp */
  falloff?: number;
  /** Opacity fade per card step */
  fade?: number;
  /** Gap between cards as fraction of card width */
  gap?: number;
  /** Border radius of cards in px */
  radius?: number;
  /** Whether to loop infinitely */
  loop?: boolean;
  /** Show prev/next arrow buttons */
  showNavigation?: boolean;
  /** Show dot pagination */
  showPagination?: boolean;
  /** Card background color */
  cardColor?: string;
  /** Arrow button background */
  controlColor?: string;
  /** Arrow icon color */
  controlIconColor?: string;
  style?: React.CSSProperties;
  className?: string;
}

function Chevron({ direction, color }: { direction: "left" | "right"; color: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "M15 18L9 12l6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

export default function CoverflowCarousel({
  slides = [],
  cardWidth = "clamp(200px, 28vw, 340px)",
  rotate = 44,
  depth = 0.6,
  lens = 3,
  falloff = 0.56,
  fade = 0.1,
  gap = 0.05,
  radius = 16,
  loop = true,
  showNavigation = false,
  showPagination = false,
  cardColor = "#F4F4F5",
  controlColor = "rgba(255,255,255,0.7)",
  controlIconColor = "#0A0A0A",
  style,
  className,
}: CoverflowCarouselProps) {
  const count = slides.length;

  const frameRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const positionRef = useRef(0);
  const targetRef = useRef(0);
  const widthRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startPosition: number;
    velocity: number;
    time: number;
  } | null>(null);
  const [selected, setSelected] = useState(0);

  const indexAt = useCallback(
    (position: number) => {
      if (!count) return 0;
      return ((Math.round(position) % count) + count) % count;
    },
    [count]
  );

  const paint = useCallback(() => {
    const width = widthRef.current;
    if (!width || !count) return;
    const pitch = width * (1 + gap);
    const position = positionRef.current;
    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      let offset = index - position;
      if (loop) {
        offset = ((offset % count) + count) % count;
        if (offset > count / 2) offset -= count;
      }
      const distance = Math.abs(offset);
      const ramp = Math.pow(distance, falloff);
      const tilt = Math.min(rotate * ramp, 82) * Math.sign(offset);
      card.style.transform = `translateX(calc(-50% + ${offset * pitch}px)) translateZ(${-depth * width * ramp}px) rotateY(${-tilt}deg)`;
      const edge = loop ? Math.min(1, Math.max(0, count / 2 - distance)) : 1;
      card.style.opacity = String(Math.max(0, 1 - fade * distance) * edge);
      card.style.zIndex = String(100 - Math.round(distance));
    });
  }, [count, depth, fade, falloff, gap, loop, rotate]);

  const clamp = useCallback(
    (position: number) => {
      if (loop) return position;
      return Math.max(0, Math.min(count - 1, position));
    },
    [count, loop]
  );

  const settle = useCallback(
    (target: number) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      setSelected(indexAt(target));
      const tick = () => {
        const remaining = target - positionRef.current;
        if (Math.abs(remaining) < 4e-4) {
          positionRef.current = target;
          paint();
          rafRef.current = null;
          return;
        }
        positionRef.current += remaining * 0.16;
        paint();
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [indexAt, paint]
  );

  const nudge = useCallback(
    (amount: number) => {
      settle(clamp(Math.round(targetRef.current) + amount));
    },
    [clamp, settle]
  );

  const goTo = useCallback(
    (index: number) => {
      const target = loop
        ? index + Math.round((targetRef.current - index) / count) * count
        : index;
      settle(clamp(target));
    },
    [clamp, count, loop, settle]
  );

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const card = cardRefs.current[0];
      if (!card) return;
      widthRef.current = card.offsetWidth;
      paint();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [paint]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (selected >= count) {
      setSelected(0);
      positionRef.current = 0;
      targetRef.current = 0;
      paint();
    }
  }, [count, paint, selected]);

  if (!count) return null;

  return (
    <div
      className={className}
      style={{ width: "100%", fontFamily: "Inter, system-ui, sans-serif", ...style }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Galería de instalaciones"
    >
      <style>{`
        .cf-frame { cursor: grab; outline: none; }
        .cf-frame:active { cursor: grabbing; }
        .cf-nav { transition: opacity 160ms ease, transform 160ms ease; }
        .cf-nav:hover { opacity: 1 !important; }
        .cf-dot { transition: opacity 200ms ease; }
        @media (prefers-reduced-motion: reduce) { .cf-nav, .cf-dot { transition: none; } }
      `}</style>

      <div style={{ position: "relative" }}>
        <div
          ref={frameRef}
          className="cf-frame"
          tabIndex={0}
          onPointerDown={(e) => {
            if (rafRef.current !== null) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = null;
            }
            e.currentTarget.setPointerCapture(e.pointerId);
            targetRef.current = positionRef.current;
            dragRef.current = {
              pointerId: e.pointerId,
              startX: e.clientX,
              startPosition: positionRef.current,
              velocity: 0,
              time: performance.now(),
            };
          }}
          onPointerMove={(e) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== e.pointerId) return;
            const pitch = widthRef.current * (1 + gap);
            if (!pitch) return;
            const now = performance.now();
            const previous = positionRef.current;
            positionRef.current = clamp(
              drag.startPosition - (e.clientX - drag.startX) / pitch
            );
            drag.velocity =
              ((positionRef.current - previous) / Math.max(now - drag.time, 1)) *
              1000;
            drag.time = now;
            const nextIndex = indexAt(positionRef.current);
            if (nextIndex !== selected) setSelected(nextIndex);
            paint();
          }}
          onPointerUp={(e) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== e.pointerId) return;
            dragRef.current = null;
            const momentum = Math.max(-2, Math.min(2, drag.velocity * 0.18));
            settle(clamp(Math.round(positionRef.current + momentum)));
          }}
          onPointerCancel={() => {
            dragRef.current = null;
            settle(clamp(Math.round(positionRef.current)));
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") { e.preventDefault(); nudge(-1); }
            if (e.key === "ArrowRight") { e.preventDefault(); nudge(1); }
          }}
          style={{
            overflow: "hidden",
            paddingTop: 40,
            paddingBottom: 40,
            perspective: `${lens * 300}px`,
            touchAction: "pan-y",
          }}
        >
          <div
            style={{
              position: "relative",
              height: cardWidth,
              transformStyle: "preserve-3d",
            }}
          >
            {slides.map((slide, index) => (
              <div
                key={index}
                ref={(node) => { cardRefs.current[index] = node; }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} de ${count}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 0,
                  width: cardWidth,
                  aspectRatio: "1 / 1",
                  overflow: "hidden",
                  borderRadius: radius,
                  background: cardColor,
                  boxShadow:
                    "0 20px 25px -5px rgba(0,0,0,0.18), 0 8px 10px -6px rgba(0,0,0,0.14)",
                  backfaceVisibility: "hidden",
                  willChange: "transform",
                }}
              >
                <img
                  src={slide.src}
                  alt={slide.alt ?? `Instalación ${index + 1}`}
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    objectFit: "cover",
                    objectPosition: "center",
                    pointerEvents: "none",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {showNavigation && (
          <>
            <button
              type="button"
              aria-label="Anterior"
              className="cf-nav"
              onClick={() => nudge(-1)}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 200,
                width: 40,
                height: 40,
                padding: 8,
                border: "none",
                borderRadius: 999,
                background: controlColor,
                backdropFilter: "blur(8px)",
                opacity: 0.85,
                cursor: "pointer",
              }}
            >
              <Chevron direction="left" color={controlIconColor} />
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              className="cf-nav"
              onClick={() => nudge(1)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 200,
                width: 40,
                height: 40,
                padding: 8,
                border: "none",
                borderRadius: 999,
                background: controlColor,
                backdropFilter: "blur(8px)",
                opacity: 0.85,
                cursor: "pointer",
              }}
            >
              <Chevron direction="right" color={controlIconColor} />
            </button>
          </>
        )}
      </div>

      {showPagination && (
        <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 8 }}>
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Ir a foto ${index + 1}`}
              aria-current={index === selected}
              onClick={() => goTo(index)}
              className="cf-dot"
              style={{
                width: 8,
                height: 8,
                padding: 0,
                border: "none",
                borderRadius: 999,
                background: "#0A0A0A",
                opacity: index === selected ? 1 : 0.3,
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

