'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

type MoleculeViewerFormat = 'pdb' | 'cif' | 'sdf' | 'mol2' | 'xyz' | 'glb';
type MoleculeViewerStyle = 'cartoon' | 'stick' | 'sphere' | 'line';

// Zooming in past this fraction of the initial camera distance pops the
// viewer out into a dimmed, full-size dialog.
const POP_OUT_ZOOM_RATIO = 0.7;
// The dialog fills the viewport, so the zoom that triggered the pop-out
// would look far too close there. It opens at this gentler zoom instead...
const POPPED_START_ZOOM_RATIO = 0.8;
// ...and zooming back out past this closes it again. Just above the start
// zoom, so a few notches out dismisses it, and well above the opening
// threshold so it can't flicker at the boundary.
const POP_IN_ZOOM_RATIO = 0.92;
// The dialog grows out of the inline slot (and shrinks back into it) over
// this long. The backdrop's fade uses the same duration in globals.css.
const POP_ANIMATION_MS = 260;

// What a renderer hands back: teardown, a way to restore the initial framing,
// and a way to re-measure after the container's size changed. Zoom is
// reported through the `onZoom` callback as current / initial camera
// distance (1 = as framed, smaller = zoomed in).
type ViewerHandle = {
  dispose: () => void;
  resetView: () => void;
  // Move the camera along its current line of sight to this zoom ratio.
  setZoomRatio: (ratio: number) => void;
};

type MoleculeViewerProps = {
  modelUrl?: string;
  format?: MoleculeViewerFormat;
  style?: MoleculeViewerStyle;
  caption?: string;
  // GLB only. When set, ChimeraX's baked-in text labels are dropped and
  // hovering any region colored differently from the rest of the model
  // (e.g. a highlighted mutation site) shows this text as a tooltip instead.
  highlightLabel?: string;
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
  highlightLabel,
}: MoleculeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const handleRef = useRef<ViewerHandle | null>(null);
  const poppedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  // `popped` means the dialog is mounted; `closing` is the short window after
  // a close request where it plays its exit animation before unmounting.
  const [popped, setPopped] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const frameAnimationRef = useRef<Animation | null>(null);

  // Animates the dialog frame's box between two viewport rects (null = the
  // full viewport, its resting position). The canvas follows the frame's size
  // through the renderer's ResizeObserver, so the molecule visibly grows and
  // shrinks with it rather than fading.
  const flyFrame = useCallback((from: DOMRect | null, to: DOMRect | null) => {
    const frame = frameRef.current;
    if (!frame || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const { clientWidth, clientHeight } = document.documentElement;
    const box = (rect: DOMRect | null) => ({
      top: `${rect?.top ?? 0}px`,
      left: `${rect?.left ?? 0}px`,
      right: `${rect ? clientWidth - rect.right : 0}px`,
      bottom: `${rect ? clientHeight - rect.bottom : 0}px`,
    });
    frameAnimationRef.current?.cancel();
    frameAnimationRef.current = frame.animate([box(from), box(to)], {
      duration: POP_ANIMATION_MS,
      easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)',
      fill: 'forwards',
    });
  }, []);

  const closePopOut = useCallback(() => {
    if (!poppedRef.current) return;
    poppedRef.current = false;
    setClosing(true);
    flyFrame(frameRef.current?.getBoundingClientRect() ?? null, stageRef.current?.getBoundingClientRect() ?? null);
    const finish = () => {
      closeTimerRef.current = undefined;
      setPopped(false);
      setClosing(false);
      // Back to the framed view, otherwise the next zoom event would pop the
      // viewer straight out again.
      handleRef.current?.resetView();
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else closeTimerRef.current = window.setTimeout(finish, POP_ANIMATION_MS);
  }, [flyFrame]);

  const onZoom = useCallback(
    (ratio: number) => {
      if (!poppedRef.current && ratio < POP_OUT_ZOOM_RATIO) {
        // Zoomed back in mid-exit: cancel the pending unmount and reopen.
        const wasClosing = closeTimerRef.current !== undefined;
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = undefined;
        poppedRef.current = true;
        setClosing(false);
        setPopped(true);
        if (wasClosing) flyFrame(frameRef.current?.getBoundingClientRect() ?? null, null);
        // Deferred: this runs inside the renderer's own change/render
        // callback, which must not be re-entered with a camera move.
        requestAnimationFrame(() => handleRef.current?.setZoomRatio(POPPED_START_ZOOM_RATIO));
      } else if (poppedRef.current && ratio > POP_IN_ZOOM_RATIO) {
        closePopOut();
      }
    },
    [closePopOut, flyFrame],
  );

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
          ? await renderGlb(containerRef.current, buffer, onZoom, highlightLabel)
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
  }, [modelUrl, format, style, highlightLabel, onZoom]);

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

  // Grow the dialog out of the inline slot as it mounts.
  useLayoutEffect(() => {
    if (popped) flyFrame(stageRef.current?.getBoundingClientRect() ?? null, null);
    else frameAnimationRef.current?.cancel();
  }, [popped, flyFrame]);

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
        <div className="molecule-viewer__stage" ref={stageRef}>
          {popped ? (
            <div
              className={
                closing
                  ? 'molecule-viewer__backdrop molecule-viewer__backdrop--closing'
                  : 'molecule-viewer__backdrop'
              }
              onClick={closePopOut}
              aria-hidden="true"
            />
          ) : null}
          <div
            ref={frameRef}
            className={
              popped
                ? `molecule-viewer__frame molecule-viewer__frame--popped${
                    closing ? ' molecule-viewer__frame--closing' : ''
                  }`
                : 'molecule-viewer__frame'
            }
            {...(popped
              ? { role: 'dialog', 'aria-modal': true, 'aria-label': caption || '3D molecule viewer' }
              : {})}
          >
            <div className="molecule-viewer__canvas" ref={containerRef} />
            <ul className="molecule-viewer__legend" aria-label="Viewer controls">
              <li>
                <span className="molecule-viewer__legend-key">Drag</span> rotate
              </li>
              <li>
                <span className="molecule-viewer__legend-key molecule-viewer__legend-pointer">
                  Scroll
                </span>
                <span className="molecule-viewer__legend-key molecule-viewer__legend-touch">
                  Pinch
                </span>{' '}
                zoom
              </li>
              <li>
                <span className="molecule-viewer__legend-key molecule-viewer__legend-pointer">
                  Right-drag
                </span>
                <span className="molecule-viewer__legend-key molecule-viewer__legend-touch">
                  Two fingers
                </span>{' '}
                pan
              </li>
              {popped ? (
                <li className="molecule-viewer__legend-pointer">
                  <span className="molecule-viewer__legend-key">Esc</span> close
                </li>
              ) : null}
            </ul>
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
    setZoomRatio: (ratio) => {
      viewer.setPerceivedDistance(initialDistance * ratio);
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
  highlightLabel?: string,
): Promise<ViewerHandle> {
  const [THREE, { GLTFLoader }, { OrbitControls }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/controls/OrbitControls.js'),
  ]);

  const gltf = await new GLTFLoader().parseAsync(buffer, '');

  // ChimeraX exports its 2D labels as textured quads; with a tooltip label
  // configured they're redundant, so drop them before framing the model.
  if (highlightLabel) {
    const labels: import('three').Object3D[] = [];
    gltf.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.some((material) => 'map' in material && material.map)) labels.push(object);
    });
    for (const label of labels) label.removeFromParent();
  }

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
  // Assigned below once the tooltip exists; the first controls.update()
  // already fires 'change', before that.
  let scheduleHover = () => {};
  const render = () => renderer.render(scene, camera);
  controls.addEventListener('change', () => {
    render();
    onZoom(camera.position.distanceTo(controls.target) / distance);
    scheduleHover();
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

  const hover = highlightLabel ? createHighlightHover(THREE, gltf.scene) : null;
  let tooltip: HTMLDivElement | null = null;
  let hoverFrame = 0;
  let lastPointer: { x: number; y: number } | null = null;
  // Re-run on every camera move too, not just pointer moves: zooming or
  // rotating under a stationary cursor changes what's beneath it.
  const updateHover = () => {
    if (!hover || !tooltip || !lastPointer) return;
    const { x, y } = lastPointer;
    const bounds = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((x - bounds.left) / bounds.width) * 2 - 1,
      -((y - bounds.top) / bounds.height) * 2 + 1,
    );
    const over = hover.isOverHighlight(pointer, camera);
    tooltip.style.display = over ? 'block' : 'none';
    renderer.domElement.style.cursor = over ? 'help' : '';
    if (over) {
      tooltip.style.left = `${x - bounds.left + 14}px`;
      tooltip.style.top = `${y - bounds.top + 14}px`;
    }
  };
  scheduleHover = () => {
    cancelAnimationFrame(hoverFrame);
    hoverFrame = requestAnimationFrame(updateHover);
  };
  const onPointerMove = (event: PointerEvent) => {
    lastPointer = { x: event.clientX, y: event.clientY };
    scheduleHover();
  };
  const onPointerLeave = () => {
    lastPointer = null;
    cancelAnimationFrame(hoverFrame);
    if (tooltip) tooltip.style.display = 'none';
    renderer.domElement.style.cursor = '';
  };
  if (hover && highlightLabel) {
    tooltip = document.createElement('div');
    tooltip.className = 'molecule-viewer__tooltip';
    tooltip.textContent = highlightLabel;
    tooltip.style.display = 'none';
    container.appendChild(tooltip);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
  }

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
    cancelAnimationFrame(hoverFrame);
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
    tooltip?.remove();
    hover?.dispose();
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

  const setZoomRatio = (ratio: number) => {
    const offset = camera.position.clone().sub(controls.target);
    camera.position.copy(controls.target).add(offset.setLength(distance * ratio));
    controls.update();
    render();
  };

  return { dispose, resetView: () => controls.reset(), setZoomRatio };
}

// Finds "colored regions" in a vertex-colored mesh: the dominant vertex color
// is the base look of the model, and any triangle whose vertices differ from
// it is a highlight. Only those triangles go into a small proxy mesh, so a
// hover test is one cheap raycast against the proxy; the (expensive) full
// mesh is only raycast on a proxy hit, to make sure the highlight isn't
// hidden behind other geometry.
function createHighlightHover(THREE: typeof import('three'), root: import('three').Object3D) {
  const raycaster = new THREE.Raycaster();
  const proxies: import('three').Mesh[] = [];
  const sources: import('three').Mesh[] = [];

  root.updateWorldMatrix(true, true);
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry as import('three').BufferGeometry;
    const color = geometry.getAttribute('color');
    const position = geometry.getAttribute('position');
    if (!color || !position) return;

    const key = (i: number) =>
      `${Math.round(color.getX(i) * 31)},${Math.round(color.getY(i) * 31)},${Math.round(color.getZ(i) * 31)}`;
    const counts = new Map<string, number>();
    for (let i = 0; i < color.count; i++) counts.set(key(i), (counts.get(key(i)) ?? 0) + 1);
    let base = '';
    let best = -1;
    for (const [candidate, n] of counts) if (n > best) [base, best] = [candidate, n];
    if (counts.size < 2) return;

    const index = geometry.getIndex();
    const triangleCount = (index ? index.count : position.count) / 3;
    const vertexAt = (t: number, corner: number) => (index ? index.getX(t * 3 + corner) : t * 3 + corner);
    const highlighted: number[] = [];
    for (let t = 0; t < triangleCount; t++) {
      for (let corner = 0; corner < 3; corner++) {
        const v = vertexAt(t, corner);
        if (key(v) !== base) {
          highlighted.push(t);
          break;
        }
      }
    }
    if (!highlighted.length) return;

    const positions = new Float32Array(highlighted.length * 9);
    highlighted.forEach((t, n) => {
      for (let corner = 0; corner < 3; corner++) {
        const v = vertexAt(t, corner);
        positions.set([position.getX(v), position.getY(v), position.getZ(v)], n * 9 + corner * 3);
      }
    });
    const proxyGeometry = new THREE.BufferGeometry();
    proxyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const proxy = new THREE.Mesh(
      proxyGeometry,
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    );
    proxy.matrixAutoUpdate = false;
    proxy.matrix.copy(object.matrixWorld);
    proxy.matrixWorld.copy(object.matrixWorld);
    proxies.push(proxy);
    sources.push(object);
  });

  return {
    isOverHighlight(pointer: import('three').Vector2, camera: import('three').Camera): boolean {
      if (!proxies.length) return false;
      raycaster.setFromCamera(pointer, camera);
      const proxyHit = raycaster.intersectObjects(proxies, false)[0];
      if (!proxyHit) return false;
      const sceneHit = raycaster.intersectObjects(sources, false)[0];
      // Within a small tolerance of the nearest surface = actually visible.
      return !sceneHit || proxyHit.distance <= sceneHit.distance + 1e-3 * (sceneHit.distance || 1);
    },
    dispose() {
      for (const proxy of proxies) {
        proxy.geometry.dispose();
        (proxy.material as import('three').Material).dispose();
      }
    },
  };
}
