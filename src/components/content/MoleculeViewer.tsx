'use client';

import { useEffect, useRef, useState } from 'react';

type MoleculeViewerFormat = 'pdb' | 'cif' | 'sdf' | 'mol2' | 'xyz' | 'glb';
type MoleculeViewerStyle = 'cartoon' | 'stick' | 'sphere' | 'line';

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
  const [error, setError] = useState<string | null>(null);

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

        const cleanup = isGlb(buffer)
          ? await renderGlb(containerRef.current, buffer)
          : await renderMolecule(containerRef.current, new TextDecoder().decode(buffer), format, style);
        if (cancelled) cleanup();
        else dispose = cleanup;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load 3D model');
        }
      }
    })();

    return () => {
      cancelled = true;
      dispose?.();
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
): Promise<() => void> {
  const $3Dmol = await import('3dmol');
  const viewer = $3Dmol.createViewer(container, { backgroundColor: 'white', backgroundAlpha: 0 });
  viewer.addModel(data, format === 'glb' ? 'pdb' : format);
  viewer.setStyle({}, { [style]: {} });
  viewer.zoomTo();
  viewer.render();
  return () => viewer.clear();
}

// A GLB carries its own colors and geometry (ChimeraX bakes the ribbons,
// atoms and any labels into meshes), so `style` doesn't apply here. Renders
// on demand (camera moves, resizes) rather than in a constant loop.
async function renderGlb(container: HTMLElement, buffer: ArrayBuffer): Promise<() => void> {
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
  controls.addEventListener('change', render);

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

  return () => {
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
}
