'use client';

import { useState } from 'react';
import { Lightbox } from './Lightbox';

type ZoomableImageProps = {
  src: string;
  alt?: string;
  caption?: string;
};

// An image that zooms in slightly on hover and opens in the Lightbox when
// clicked. A real <button> so keyboard and screen reader users can open it
// too; its accessible name comes from the image's alt text.
export function ZoomableImage({ src, alt = '', caption }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="zoomable-image"
        aria-label={alt ? undefined : 'Enlarge figure'}
        onClick={() => setOpen(true)}
      >
        <img src={src} alt={alt} />
      </button>
      {open ? <Lightbox src={src} alt={alt} caption={caption} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
