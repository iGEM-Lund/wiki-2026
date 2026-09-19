'use client';

import { useState } from 'react';

type FigureCarouselImage = { src: string; alt?: string };

type FigureCarouselProps = {
  images?: FigureCarouselImage[];
  intervalSeconds?: number;
};

// One photo slides left-to-right along the string over `intervalSeconds`;
// `key={index}` remounts the sliding element each rotation so its CSS
// animation (globals.css's figure-carousel-slide keyframes) restarts from
// the left edge, and onAnimationEnd — which fires when that slide finishes —
// is what actually advances to the next photo. No setInterval: the
// animation's own duration IS the rotation timer, so the slide speed and the
// rotation cadence can never drift apart.
export function FigureCarousel({ images = [], intervalSeconds = 5 }: FigureCarouselProps) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) return null;
  const current = images[index % images.length];

  return (
    <div className="figure-carousel">
      <div className="figure-carousel__string" />
      <div className="figure-carousel__track">
        <div
          key={index}
          className="figure-carousel__photo"
          style={{ animationDuration: `${intervalSeconds}s` }}
          onAnimationEnd={() => setIndex((i) => (i + 1) % images.length)}
        >
          <img src={current.src} alt={current.alt ?? ''} />
        </div>
      </div>
    </div>
  );
}
