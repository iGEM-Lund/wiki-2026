'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Lightbox } from './Lightbox';

type ZoomableImageProps = {
  src: string;
  alt?: string;
  caption?: string;
  // false renders the bare image without the button and lightbox, for when an
  // ancestor link makes the whole figure the click target.
  enlargeable?: boolean;
};

// An image that zooms in slightly on hover and opens in the Lightbox when
// clicked. A real <button> so keyboard and screen reader users can open it
// too; its accessible name comes from the image's alt text.
//
// An image that fails to load (most often a static.igem.wiki URL whose file
// was never uploaded there, or was since removed) would otherwise collapse
// to nothing and leave writers no clue anything is wrong; it shows a
// labelled placeholder instead.
export function ZoomableImage({ src, alt = '', caption, enlargeable = true }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // The prerendered <img> can fail before hydration attaches onError, so
  // also check where it already stands once mounted.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth === 0) setBroken(true);
  }, [src]);

  if (broken) {
    return (
      <span className="zoomable-image zoomable-image--broken" role="img" aria-label={alt || 'Image not found'}>
        <ImageOff aria-hidden size={22} />
        <span>Image not found</span>
      </span>
    );
  }

  if (!enlargeable) {
    return (
      <span className="zoomable-image zoomable-image--static">
        <img ref={imgRef} src={src} alt={alt} onError={() => setBroken(true)} />
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        className="zoomable-image"
        aria-label={alt ? undefined : 'Enlarge figure'}
        onClick={() => setOpen(true)}
      >
        <img ref={imgRef} src={src} alt={alt} onError={() => setBroken(true)} />
      </button>
      {open ? <Lightbox src={src} alt={alt} caption={caption} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
