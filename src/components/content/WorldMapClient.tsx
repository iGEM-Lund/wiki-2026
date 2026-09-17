'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

export type WorldMapClientPin = {
  id: string;
  title: string;
  x: number;
  y: number;
  body: ReactNode;
};

type WorldMapClientProps = {
  landPath: string;
  viewBox: { width: number; height: number };
  pins: WorldMapClientPin[];
};

type Transform = { x: number; y: number; k: number };

const MIN_SCALE = 1;
const MAX_SCALE = 8;
// Pixels of pointer movement below which a press+release is still treated
// as a click rather than a drag — distinguishes "pan-release" from
// "click empty map to close the open popup".
const DRAG_CLICK_THRESHOLD = 5;

// No pan/zoom library — see src/lib/keystatic/content-components.tsx's
// WorldMap comment and the repo's minimal, single-purpose-dependency style
// (3dmol/openchemlib/katex are each a narrow direct import, no wrapper
// frameworks) for why this is hand-rolled instead of d3-zoom.
export function WorldMapClient({ landPath, viewBox, pins }: WorldMapClientProps) {
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [openPinId, setOpenPinId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const justDraggedRef = useRef(false);
  // Which pin (if any) the current press started on, and its DOM element —
  // captured at pointerdown, BEFORE setPointerCapture below retargets every
  // later event (including the eventual click) to the <svg> itself. Pin
  // activation is decided entirely from this + the drag threshold on
  // pointerup, rather than from a per-pin onClick, because a captured
  // pointer's click never actually reaches the pin element to fire it.
  const pressedPinRef = useRef<{ id: string; element: SVGGElement } | null>(null);

  const openPin = pins.find((pin) => pin.id === openPinId) ?? null;
  const hoveredPin =
    hoveredPinId && hoveredPinId !== openPinId ? (pins.find((pin) => pin.id === hoveredPinId) ?? null) : null;

  function clampTransform(next: Transform): Transform {
    // The transformed content spans [x, x + width*k] x [y, y + height*k] in
    // viewBox space. Constraining x to [width*(1-k), 0] (and y likewise)
    // keeps that span always fully covering the viewBox — the map can be
    // panned within its own zoomed-in bounds, but never dragged far enough
    // to show empty space past its edge. At k=1 this collapses to exactly
    // x=0, y=0 (nothing to pan when not zoomed in, which is correct).
    const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next.k));
    const minX = viewBox.width * (1 - k);
    const minY = viewBox.height * (1 - k);
    return {
      k,
      x: Math.min(0, Math.max(minX, next.x)),
      y: Math.min(0, Math.max(minY, next.y)),
    };
  }

  function screenToViewBox(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((clientX - rect.left) * viewBox.width) / rect.width,
      y: ((clientY - rect.top) * viewBox.height) / rect.height,
    };
  }

  function computeAnchor(element: Element): { left: number; top: number } | null {
    const container = containerRef.current;
    if (!container) return null;
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return {
      left: elementRect.left - containerRect.left + elementRect.width / 2,
      top: elementRect.top - containerRect.top + elementRect.height / 2,
    };
  }

  // Native (non-passive) wheel listener: React's onWheel prop can't reliably
  // preventDefault in every browser, and zooming the map must stop the page
  // itself from scrolling under the pointer.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      setOpenPinId(null);
      setHoveredPinId(null);
      const point = screenToViewBox(event.clientX, event.clientY);
      if (!point) return;
      setTransform((prev) => {
        const factor = Math.exp(-event.deltaY * 0.0015);
        const nextK = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.k * factor));
        if (nextK === prev.k) return prev;
        const worldX = (point.x - prev.x) / prev.k;
        const worldY = (point.y - prev.y) / prev.k;
        return clampTransform({ k: nextK, x: point.x - worldX * nextK, y: point.y - worldY * nextK });
      });
    }
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewBox.width, viewBox.height]);

  // Closing on a pointerdown outside the whole map (not just the popup) —
  // clicks on pins/background/the popup itself are handled by their own,
  // more precise handlers below; this is only for "clicked elsewhere on
  // the page while a popup was open."
  useEffect(() => {
    if (!openPinId) return;
    function onPointerDownOutside(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenPinId(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenPinId(null);
    }
    document.addEventListener('pointerdown', onPointerDownOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDownOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openPinId]);

  useEffect(() => {
    if (openPinId) popupRef.current?.focus();
  }, [openPinId]);

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const pinElement = (event.target as Element).closest<SVGGElement>('.world-map__pin');
    pressedPinRef.current = pinElement ? { id: pinElement.dataset.pinId!, element: pinElement } : null;
    event.currentTarget.setPointerCapture(event.pointerId);
    justDraggedRef.current = false;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    setIsDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!lastPointerRef.current || !pointerStartRef.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const totalMoved = Math.hypot(
      event.clientX - pointerStartRef.current.x,
      event.clientY - pointerStartRef.current.y,
    );
    if (totalMoved > DRAG_CLICK_THRESHOLD && !justDraggedRef.current) {
      justDraggedRef.current = true;
      setOpenPinId(null);
      setHoveredPinId(null);
    }

    const dx = ((event.clientX - lastPointerRef.current.x) * viewBox.width) / rect.width;
    const dy = ((event.clientY - lastPointerRef.current.y) * viewBox.height) / rect.height;
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    setTransform((prev) => clampTransform({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }

  function handlePointerUp() {
    const wasDrag = justDraggedRef.current;
    const pressedPin = pressedPinRef.current;
    pointerStartRef.current = null;
    lastPointerRef.current = null;
    pressedPinRef.current = null;
    setIsDragging(false);
    if (wasDrag) return; // a drag-release, not a click — leave state as-is
    if (pressedPin) {
      handlePinActivate(pressedPin.id, pressedPin.element);
    } else {
      // A genuine click on empty sea/land closes any open popup.
      setOpenPinId(null);
    }
  }

  function handlePinHover(id: string, element: Element) {
    setHoveredPinId(id);
    setAnchor(computeAnchor(element));
  }

  function handlePinHoverEnd(id: string) {
    setHoveredPinId((current) => (current === id ? null : current));
  }

  function handlePinActivate(id: string, element: Element) {
    setAnchor(computeAnchor(element));
    setOpenPinId((current) => (current === id ? null : id));
    setHoveredPinId(null);
  }

  return (
    <div className={`world-map${isDragging ? ' world-map--dragging' : ''}`} ref={containerRef}>
      <svg
        ref={svgRef}
        className="world-map__viewport"
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        role="group"
        aria-label="World map"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <rect className="world-map__sea" x={0} y={0} width={viewBox.width} height={viewBox.height} />
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          <path className="world-map__land" d={landPath} />
          {pins.map((pin) => (
            <g
              key={pin.id}
              className="world-map__pin"
              data-pin-id={pin.id}
              transform={`translate(${pin.x} ${pin.y}) scale(${1 / transform.k})`}
              tabIndex={0}
              role="button"
              aria-label={pin.title}
              aria-expanded={pin.id === openPinId}
              onMouseEnter={(event) => handlePinHover(pin.id, event.currentTarget)}
              onMouseLeave={() => handlePinHoverEnd(pin.id)}
              onFocus={(event) => handlePinHover(pin.id, event.currentTarget)}
              onBlur={() => handlePinHoverEnd(pin.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handlePinActivate(pin.id, event.currentTarget);
                }
              }}
            >
              {/* Physical pin: a thin needle from the local origin (the
                  exact projected lat/lng point) up to a round head — drawn
                  as a line then a circle on top, so the circle naturally
                  covers the needle's upper end. */}
              <line className="world-map__pin-needle" x1={0} y1={0} x2={0} y2={-13} />
              <circle className="world-map__pin-dot" cx={0} cy={-13} r={3.5} />
            </g>
          ))}
        </g>
      </svg>

      {hoveredPin && anchor && !isDragging ? (
        <div className="world-map__tooltip" role="tooltip" style={{ left: anchor.left, top: anchor.top }}>
          {hoveredPin.title}
        </div>
      ) : null}

      {openPin && anchor ? (
        <div
          ref={popupRef}
          className="world-map__popup"
          role="dialog"
          aria-label={openPin.title}
          tabIndex={-1}
          style={{ left: anchor.left, top: anchor.top }}
        >
          <button type="button" className="world-map__popup-close" aria-label="Close" onClick={() => setOpenPinId(null)}>
            &times;
          </button>
          <h3 className="world-map__popup-title">{openPin.title}</h3>
          <div className="world-map__popup-body">{openPin.body}</div>
        </div>
      ) : null}
    </div>
  );
}
