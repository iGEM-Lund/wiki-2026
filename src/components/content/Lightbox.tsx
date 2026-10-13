'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { captionPlainText, renderCaption } from '@/lib/caption-text';

type LightboxProps = {
  src: string;
  alt?: string;
  caption?: string;
  onClose: () => void;
};

// Full-screen view of one figure. A native <dialog> opened with showModal()
// renders in the browser's top layer, so it escapes any overflow: hidden or
// stacking context of whatever opened it (the carousel clips its own
// contents), and it comes with focus trapping, Esc to close and an inert
// page behind it for free. Mounted only while open; unmounting closes it.
export function Lightbox({ src, alt = '', caption, onClose }: LightboxProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // No cleanup that calls close(): that fires the dialog's close event, i.e.
  // onClose, which in dev (Strict Mode runs effects twice) would unmount the
  // lightbox immediately. Removing an open dialog from the page is enough to
  // take it out of the top layer.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label={alt || (caption && captionPlainText(caption)) || 'Figure'}
      onClose={onClose}
      // A click anywhere closes it (the image fills most of the screen, so
      // "outside the image" would be a thin margin), except on the caption,
      // so its text can still be selected.
      onClick={(event) => {
        if (!(event.target as Element).closest('figcaption')) onClose();
      }}
    >
      <button type="button" className="lightbox__close" aria-label="Close" onClick={onClose}>
        <X size={22} />
      </button>
      <figure className="lightbox__figure">
        <img src={src} alt={alt} />
        {caption ? <figcaption>{renderCaption(caption)}</figcaption> : null}
      </figure>
    </dialog>
  );
}
