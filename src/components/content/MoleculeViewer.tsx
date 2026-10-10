'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type MoleculeViewerFormat = 'pdb' | 'cif' | 'sdf' | 'mol2' | 'xyz' | 'glb';
type MoleculeViewerStyle = 'cartoon' | 'stick' | 'sphere' | 'line';

// Zooming in past this fraction of the initial camera distance pops the
// viewer out into a dimmed, full-size dialog.
const POP_OUT_ZOOM_RATIO = 0.5;

// What a renderer hands back: teardown, a way to restore the initial framing,
// and a way to re-measure after the container's size changed. Zoom is
// reported through the `onZoom` callback as current / initial camera
// distance (1 = as framed, smaller = zoomed in).
type ViewerHandle = {
  dispose: () => void;
  resetView: () => void;
};

type MoleculeViewerProps = {
  modelUrl?: string;
  format?: MoleculeViewerFormat;
  style?: MoleculeViewerStyle;
  caption?: string;
};

// Interactive 3D structure viewer (proteins, ligands, small molecules).
// Unlike the rest of src/components/content, which render to static markup
// so pages ship with no client JS; a rotate/zoom viewer needs a live WebGL
// canvas and mouse-driven camera controls, so this is the one content
// component that runs client-side.
//
// Two renderers, picked by the file's actual bytes rather than the `format`
// prop: a binary glTF (.glb, e.g. a ChimeraX "Save as GLB" export) starts
// with the ASCII magic "glTF" and is an already-styled triangle mesh, so it
// goes to three.js; anything else is a molecule text format that 3Dmol.js
// parses and styles itself. Sniffing matters because iGEM's uploader only
// accepts files whose contents it can identify, which rules out plain-text
// formats like .pdb, so in practice GLB is what reaches static.igem.wiki,
// and an editor leaving the format dropdown on its PDB default must not
// break the page.
//
// Both libraries touch `document`/`window` at module load time, so they're
// dynamically imported inside the effect (browser-only) rather than at the
// top of the file; a static import would blow up prerendering during
// `next build` (both the staging SSR build and the production static export).
export function MoleculeViewer({
  modelUrl,
  format = 'pdb',
  style = 'cartoon',
  caption,
}: MoleculeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const handleRef = useRef<ViewerHandle | null>(null);
  const poppedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [popped, setPopped] = useState(false);

  const closePopOut = useCallback(() => {
    poppedRef.current = false;
    setPopped(false);
    // Back to the framed view, otherwise the next zoom event would pop the
    // viewer straight out again.
    handleRef.current?.resetView();
  }, []);

  const onZoom = useCallback((ratio: number) => {
    if (!poppedRef.current && ratio < POP_OUT_ZOOM_RATIO) {
      poppedRef.current = true;
      setPopped(true);
    }
  }, []);

  useEffect(() => {
    if (!modelUrl || !containerRef.current) return;

    let dispose: (() => void) | undefined;
    let cancelled = false;
    setError(null);

    (async () => {
      try {
        const response = await fetch(modelUrl);
        if (!response.ok) throw new Error(`Could not load model (HTTP ${response.status})`);
        const buffer = await response.arrayBuffer();
        if (cancelled || !containerRef.current) return;

        const handle = isGlb(buffer)
          ? await renderGlb(containerRef.current, buffer, onZoom)
          : await renderMolecule(
              containerRef.current,
              new TextDecoder().decode(buffer),
              format,
              style,
              onZoom,
            );
        if (cancelled) handle.dispose();
        else {
          handleRef.current = handle;
          dispose = handle.dispose;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load 3D model');
        }
      }
    })();

    return () => {
      cancelled = true;
      handleRef.current = null;
      dispose?.();
    };
  }, [modelUrl, format, style, onZoom]);

  // While popped out: Escape closes, the page behind doesn't scroll, and
  // focus moves to the close button then returns to where it was.
  useEffect(() => {
    if (!popped) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePopOut();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [popped, closePopOut]);

  return (
    <figure className="molecule-viewer">
      {!modelUrl ? (
        <div className="molecule-viewer__error">No model file provided</div>
      ) : error ? (
        <div className="molecule-viewer__error">{error}</div>
      ) : (
        // The stage keeps the inline slot's height while the frame inside
        // is lifted out of flow as a dialog, so the page doesn't jump.
        <div className="molecule-viewer__stage">
          {popped ? (
            <div className="molecule-viewer__backdrop" onClick={closePopOut} aria-hidden="true" />
          ) : null}
          <div
            ref={frameRef}
            className={
              popped ? 'molecule-viewer__frame molecule-viewer__frame--popped' : 'molecule-viewer__frame'
            }
            {...(popped
              ? { role: 'dialog', 'aria-modal': true, 'aria-label': caption || '3D molecule viewer' }
              : {})}
          >
            <div className="molecule-viewer__canvas" ref={containerRef} />
            {popped ? (
              <button
                type="button"
                ref={closeButtonRef}
                className="molecule-viewer__close"
                onClick={closePopOut}
                aria-label="Close enlarged viewer"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
      )}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

function isGlb(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const magic = new Uint8Array(buffer, 0, 4);
  return String.fromCharCode(...magic) === 'glTF';
}

// 3Dmol wires drag-to-rotate, scroll-to-zoom, and right-drag-to-pan onto the
// viewer automatically, so no extra control wiring is needed here.
async function renderMolecule(
  container: HTMLElement,
  data: string,
  format: MoleculeViewerFormat,
  style: MoleculeViewerStyle,
  onZoom: (ratio: number) => void,
): Promise<ViewerHandle> {
  const $3Dmol = await import('3dmol');
  const viewer = $3Dmol.createViewer(container, { backgroundColor: 'white', backgroundAlpha: 0 });
  viewer.addModel(data, format === 'glb' ? 'pdb' : format);
  viewer.setStyle({}, { [style]: {} });
  viewer.zoomTo();
  viewer.render();

  const initialDistance = viewer.getPerceivedDistance();
  const initialView = viewer.getView();
  viewer.setViewChangeCallback(() => {
    if (initialDistance > 0) onZoom(viewer.getPerceivedDistance() / initialDistance);
  });

  // The container changes size when the viewer pops in and out of the dialog.
  const observer = new ResizeObserver(() => {
    viewer.resize();
    viewer.render();
  });
  observer.observe(container);

  return {
    dispose: () => {
      observer.disconnect();
      viewer.setViewChangeCallback(null);
      viewer.clear();
    },
    resetView: () => {
      viewer.setView(initialView);
      viewer.render();
    },
  };
}

// A GLB carries its own colors and geometry (ChimeraX bakes the ribbons,
// atoms and any labels into meshes), so `style` doesn't apply here. Renders
// on demand (camera moves, resizes) rather than in a constant loop.
async function renderGlb(
  container: HTMLElement,
  buffer: ArrayBuffer,
  onZoom: (ratio: number) => void,
): Promise<ViewerHandle> {
  const [THREE, { GLTFLoader }, { OrbitControls }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/controls/OrbitControls.js'),
  ]);

  const gltf = await new GLTFLoader().parseAsync(buffer, '');

  const scene = new THREE.Scene();
  scene.add(gltf.scene);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 2));

  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
  // Light rides along with the camera so the side facing the viewer is
  // always lit, however the model is rotated.
  const headlight = new THREE.DirectionalLight(0xffffff, 1.5);
  headlight.position.set(1, 1, 2);
  camera.add(headlight);
  scene.add(camera);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  const render = () => renderer.render(scene, camera);
  controls.addEventListener('change', () => {
    render();
    onZoom(camera.position.distanceTo(controls.target) / distance);
  });

  // Frame the whole model: center the orbit on it and back the camera off
  // until its bounding box fills the view, whichever of width or height is
  // the tighter fit for the container's shape.
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const aspect = container.clientWidth / container.clientHeight || 1;
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const distance =
    Math.max(size.y / 2 / tanHalfFov, size.x / 2 / (tanHalfFov * aspect)) * 1.15 + size.z / 2;
  controls.target.copy(center);
  camera.position.copy(center).add(new THREE.Vector3(0, 0, distance));
  camera.near = distance / 100;
  camera.far = distance * 10;
  controls.update();
  controls.saveState();

  const resize = () => {
    const { clientWidth, clientHeight } = container;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const dispose = () => {
    observer.disconnect();
    controls.dispose();
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) value.dispose();
          }
          material.dispose();
        }
      }
    });
    renderer.dispose();
    renderer.domElement.remove();
  };

  return { dispose, resetView: () => controls.reset() };
}
