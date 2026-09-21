'use client';

import { useEffect, useRef, useState } from 'react';
import type { GLViewer } from '3dmol';

type MoleculeViewerFormat = 'pdb' | 'cif' | 'sdf' | 'mol2' | 'xyz';
type MoleculeViewerStyle = 'cartoon' | 'stick' | 'sphere' | 'line';

type MoleculeViewerProps = {
  modelUrl?: string;
  format?: MoleculeViewerFormat;
  style?: MoleculeViewerStyle;
  caption?: string;
};

// Interactive 3D structure viewer (proteins, ligands, small molecules) built
// on 3Dmol.js. Unlike the rest of src/components/content, which render to
// static markup so pages ship with no client JS; a rotate/zoom viewer needs
// a live WebGL canvas and mouse-driven camera controls, so this is the one
// content component that runs client-side.
//
// 3Dmol itself touches `document` at module load time, so it's dynamically
// imported inside the effect (browser-only) rather than at the top of the
// file; a static import would blow up prerendering during `next build`
// (both the staging SSR build and the production static export).
// 3Dmol wires drag-to-rotate, scroll-to-zoom, and right-drag-to-pan onto the
// viewer automatically, so no extra control wiring is needed here.
export function MoleculeViewer({
  modelUrl,
  format = 'pdb',
  style = 'cartoon',
  caption,
}: MoleculeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!modelUrl || !containerRef.current) return;

    let viewer: GLViewer | undefined;
    let cancelled = false;
    setError(null);

    (async () => {
      try {
        const [$3Dmol, response] = await Promise.all([import('3dmol'), fetch(modelUrl)]);
        if (cancelled) return;
        if (!response.ok) throw new Error(`Could not load model (HTTP ${response.status})`);
        const data = await response.text();
        if (cancelled || !containerRef.current) return;

        viewer = $3Dmol.createViewer(containerRef.current, { backgroundColor: 'white' });
        viewer.addModel(data, format);
        viewer.setStyle({}, { [style]: {} });
        viewer.zoomTo();
        viewer.render();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load 3D model');
        }
      }
    })();

    return () => {
      cancelled = true;
      viewer?.clear();
    };
  }, [modelUrl, format, style]);

  return (
    <figure className="molecule-viewer">
      {!modelUrl ? (
        <div className="molecule-viewer__error">No model file provided</div>
      ) : error ? (
        <div className="molecule-viewer__error">{error}</div>
      ) : (
        <div className="molecule-viewer__canvas" ref={containerRef} />
      )}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
