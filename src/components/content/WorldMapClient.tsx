'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

export type WorldMapClientPin = {
  id: string;
  title: string;
  x: number;
  y: number;
  // A heading on this page ('#slug') the pin jumps to instead of opening
  // a popup.
  href?: string;
  body: ReactNode;
};

type WorldMapClientProps = {
  landPath: string;
  viewBox: { width: number; height: number };
  pins: WorldMapClientPin[];
};

type Transform = { x: number; y: number; k: number };

// A pin head's place in the container, in CSS pixels: its centre and
// radius, which the hover sign and the open card hang below.
type Anchor = { left: number; top: number; radius: number };
// The open card's left edge, and where along its top its string is tied.
type CardPlacement = { left: number; stringX: number };

// A pin as drawn: one place, or several places too close together at the
// current zoom to tell apart, merged into one numbered pin.
type PinGroup = {
  id: string;
  x: number;
  y: number;
  members: WorldMapClientPin[];
};

// Two pins whose heads would sit closer than this (in on-screen viewBox
// units, i.e. before the zoom) are drawn as one group. A little under two
// head widths, so neighbours never overlap into an unreadable clump.
const GROUP_DISTANCE = 22;
const ZOOM_DURATION_MS = 350;

// Kept between the card and the edge of the window, in CSS pixels; and
// the room left at the top for the site's fixed header when scrolling a
// card into view.
const CARD_MARGIN = 12;
const HEADER_ROOM = 80;

// The patch's edge, in viewBox units: the slice wheel's overlock and running
// stitch (see SliceWheel.tsx), scaled up to come out the same size on
// screen at the map's usual width.
const OVERLOCK_WIDTH = 14;
const STITCH_INSET = 22;
const CORNER_RADIUS = 18;

// Agglomerative: keep merging the two closest groups until none are within
// GROUP_DISTANCE of each other at zoom k. Quadratic per merge, which is
// nothing for the handful of pins a wiki map holds, and unlike a greedy
// one-pass sweep it doesn't depend on the order the pins were written in.
function groupPins(pins: WorldMapClientPin[], k: number): PinGroup[] {
  const groups: PinGroup[] = pins.map((pin) => ({
    id: pin.id,
    x: pin.x,
    y: pin.y,
    members: [pin],
  }));
  const limit = GROUP_DISTANCE / k;
  for (;;) {
    let best: [number, number] | null = null;
    let bestDistance = limit;
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const distance = Math.hypot(groups[i].x - groups[j].x, groups[i].y - groups[j].y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = [i, j];
        }
      }
    }
    if (!best) return groups;
    const [a, b] = [groups[best[0]], groups[best[1]]];
    const members = [...a.members, ...b.members];
    groups.splice(best[1], 1);
    groups[best[0]] = {
      id: members.map((member) => member.id).join('+'),
      x: members.reduce((sum, member) => sum + member.x, 0) / members.length,
      y: members.reduce((sum, member) => sum + member.y, 0) / members.length,
      members,
    };
  }
}

// The zoom at which a group's members would all be drawn apart, or
// Infinity for pins at (practically) the same spot, which never separate.
function separatingScale(group: PinGroup): number {
  let spread = 0;
  for (const a of group.members) {
    for (const b of group.members) spread = Math.max(spread, Math.hypot(a.x - b.x, a.y - b.y));
  }
  return spread === 0 ? Infinity : (GROUP_DISTANCE / spread) * 1.6;
}

// The heading a link pin points at, if it is on the page; a pin whose
// heading was renamed or deleted falls back to its popup.
function linkTarget(pin: WorldMapClientPin): HTMLElement | null {
  return pin.href ? document.getElementById(decodeURIComponent(pin.href.slice(1))) : null;
}

// Which way the page runs from the map to a heading, for the sign's arrow.
function directionTo(target: HTMLElement | null, map: HTMLElement | null): 'up' | 'down' {
  if (!target || !map) return 'down';
  return target.getBoundingClientRect().top < map.getBoundingClientRect().top ? 'up' : 'down';
}

const MIN_SCALE = 1;
const MAX_SCALE = 8;
// Pixels of pointer movement below which a press+release is still treated
// as a click rather than a drag; distinguishes "pan-release" from
// "click empty map to close the open popup".
const DRAG_CLICK_THRESHOLD = 5;

// No pan/zoom library; see src/lib/keystatic/content-components.tsx's
// WorldMap comment and the repo's minimal, single-purpose-dependency style
// (3dmol/openchemlib/katex are each a narrow direct import, no wrapper
// frameworks) for why this is hand-rolled instead of d3-zoom.
export function WorldMapClient({ landPath, viewBox, pins }: WorldMapClientProps) {
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [openPinId, setOpenPinId] = useState<string | null>(null);
  const pinGradientId = `${useId()}pin-gradient`;
  const pinShadowId = `${useId()}pin-shadow`;
  const twillId = `${useId()}twill`;
  const overlockId = `${useId()}overlock`;
  const clothClipId = `${useId()}cloth`;
  const [hoverAnchor, setHoverAnchor] = useState<Anchor | null>(null);
  const [openAnchor, setOpenAnchor] = useState<Anchor | null>(null);
  const [cardPlacement, setCardPlacement] = useState<CardPlacement | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const justDraggedRef = useRef(false);
  // Which pin (if any) the current press started on, and its DOM element,
  // captured at pointerdown, BEFORE setPointerCapture below retargets every
  // later event (including the eventual click) to the <svg> itself. Pin
  // activation is decided entirely from this + the drag threshold on
  // pointerup, rather than from a per-pin onClick, because a captured
  // pointer's click never actually reaches the pin element to fire it.
  const pressedPinRef = useRef<{ id: string; element: SVGGElement } | null>(null);

  const zoomAnimationRef = useRef<number | null>(null);

  const groups = useMemo(() => groupPins(pins, transform.k), [pins, transform.k]);
  const openGroup = groups.find((group) => group.id === openPinId) ?? null;
  const hoveredGroup =
    hoveredPinId && hoveredPinId !== openPinId ? (groups.find((group) => group.id === hoveredPinId) ?? null) : null;

  useEffect(() => () => cancelZoomAnimation(), []);

  function clampTransform(next: Transform): Transform {
    // The transformed content spans [x, x + width*k] x [y, y + height*k] in
    // viewBox space. Constraining x to [width*(1-k), 0] (and y likewise)
    // keeps that span always fully covering the viewBox; the map can be
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

  function cancelZoomAnimation() {
    if (zoomAnimationRef.current !== null) cancelAnimationFrame(zoomAnimationRef.current);
    zoomAnimationRef.current = null;
  }

  // Eases from the current view to one at scale k centred on (x, y) in map
  // space, or jumps straight there for readers who asked for less motion.
  function zoomTo(x: number, y: number, k: number) {
    cancelZoomAnimation();
    const target = clampTransform({
      k,
      x: viewBox.width / 2 - x * k,
      y: viewBox.height / 2 - y * k,
    });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTransform(target);
      return;
    }
    const from = transform;
    const start = performance.now();
    function step(now: number) {
      const t = Math.min(1, (now - start) / ZOOM_DURATION_MS);
      const eased = 1 - (1 - t) ** 3;
      // Interpolating the scale geometrically keeps the zoom feeling even
      // rather than rushing at the start.
      const nextK = from.k * (target.k / from.k) ** eased;
      setTransform(
        clampTransform({
          k: nextK,
          x: from.x + (target.x - from.x) * eased,
          y: from.y + (target.y - from.y) * eased,
        }),
      );
      zoomAnimationRef.current = t < 1 ? requestAnimationFrame(step) : null;
    }
    zoomAnimationRef.current = requestAnimationFrame(step);
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

  function computeAnchor(element: Element): Anchor | null {
    const container = containerRef.current;
    if (!container) return null;
    // Anchor on the pin's head (what the eye reads as "the pin"), not the
    // whole group with its slanted needle.
    const elementRect = (element.querySelector('.world-map__pin-head') ?? element).getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return {
      left: elementRect.left - containerRect.left + elementRect.width / 2,
      top: elementRect.top - containerRect.top + elementRect.height / 2,
      radius: elementRect.width / 2,
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
      cancelZoomAnimation();
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

  // Closing on a pointerdown outside the whole map (not just the popup);
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
    // preventScroll: the card isn't placed yet, and bringing it into view
    // is the scroll effect's job.
    if (openPinId) popupRef.current?.focus({ preventScroll: true });
  }, [openPinId]);

  // The open card hangs centred under its pin like the hover sign, free to
  // reach past the map's edges (it's on the top-layer overlay below), but
  // slid sideways to stay inside the window, its string still tied above
  // the pin. Measured before paint, so it never shows at a wrong spot
  // first, and again when the page reflows it.
  useLayoutEffect(() => {
    setCardPlacement(null);
    const card = popupRef.current;
    const container = containerRef.current;
    if (!openPinId || !openAnchor || !card || !container) return;
    function place() {
      const mapLeft = container!.getBoundingClientRect().left;
      const width = card!.offsetWidth;
      const centred = openAnchor!.left - width / 2;
      const minLeft = CARD_MARGIN - mapLeft;
      const maxLeft = document.documentElement.clientWidth - CARD_MARGIN - mapLeft - width;
      const left = Math.max(minLeft, Math.min(maxLeft, centred));
      setCardPlacement({ left, stringX: openAnchor!.left - left });
    }
    place();
    const observer = new ResizeObserver(place);
    observer.observe(card);
    return () => observer.disconnect();
  }, [openPinId, openAnchor]);

  // Once placed, an open card running off the bottom of the window scrolls
  // the page just enough to show it whole, but never so far that its pin
  // goes up under the header (a card taller than the window shows from its
  // top instead).
  const cardPlaced = cardPlacement !== null;
  useEffect(() => {
    const card = popupRef.current;
    if (!cardPlaced || !card || !openAnchor || !containerRef.current) return;
    const pinTop = containerRef.current.getBoundingClientRect().top + openAnchor.top;
    const overflow = card.getBoundingClientRect().bottom + CARD_MARGIN - window.innerHeight;
    const distance = Math.min(overflow, pinTop - HEADER_ROOM);
    if (distance <= 0) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollBy({ top: distance, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [cardPlaced, openAnchor]);

  const hoveredPin = hoveredGroup?.members.length === 1 ? hoveredGroup.members[0] : null;
  const hoveredTarget = hoveredPin && !isDragging ? linkTarget(hoveredPin) : null;
  const hoveredLink = hoveredTarget !== null;
  const hoveredDirection = directionTo(hoveredTarget, containerRef.current);
  const showSign = Boolean(hoveredGroup && hoverAnchor && !isDragging);
  const showCard = Boolean(openGroup && openAnchor);
  const layerShown = showSign || showCard;

  // The sign and card are drawn on a layer laid exactly over the
  // map, opened as a popover in the top layer so no card or section the
  // map sits in can clip them (as useHangingPopover does for Tooltip), and
  // kept over the map as the page scrolls. Where popovers aren't supported
  // the layer is just an absolutely positioned overlay inside the map.
  useLayoutEffect(() => {
    const layer = layerRef.current;
    const container = containerRef.current;
    if (!layerShown || !layer || !container || typeof layer.showPopover !== 'function') return;
    function follow() {
      const box = container!.getBoundingClientRect();
      layer!.style.left = `${box.left}px`;
      layer!.style.top = `${box.top}px`;
      layer!.style.width = `${box.width}px`;
      layer!.style.height = `${box.height}px`;
    }
    follow();
    layer.showPopover();
    window.addEventListener('scroll', follow, { capture: true, passive: true });
    window.addEventListener('resize', follow, { passive: true });
    return () => {
      window.removeEventListener('scroll', follow, { capture: true });
      window.removeEventListener('resize', follow);
      if (layer.matches(':popover-open')) layer.hidePopover();
    };
  }, [layerShown]);

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const pinElement = (event.target as Element).closest<SVGGElement>('.world-map__pin');
    pressedPinRef.current = pinElement ? { id: pinElement.dataset.pinId!, element: pinElement } : null;
    cancelZoomAnimation();
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
    if (wasDrag) return; // a drag-release, not a click; leave state as-is
    if (pressedPin) {
      handlePinActivate(pressedPin.id, pressedPin.element);
    } else {
      // A genuine click on empty sea/land closes any open popup.
      setOpenPinId(null);
    }
  }

  function handlePinHover(id: string, element: Element) {
    setHoveredPinId(id);
    setHoverAnchor(computeAnchor(element));
  }

  function handlePinHoverEnd(id: string) {
    setHoveredPinId((current) => (current === id ? null : current));
  }

  function handlePinActivate(id: string, element: Element) {
    // A group that zooming in can still split is opened up that way; one
    // that can't (pins at the same spot, or already at full zoom) opens a
    // popup listing every member instead.
    const group = groups.find((candidate) => candidate.id === id);
    if (group && group.members.length > 1) {
      const needed = separatingScale(group);
      if (transform.k < MAX_SCALE && needed <= MAX_SCALE) {
        setOpenPinId(null);
        setHoveredPinId(null);
        zoomTo(group.x, group.y, Math.min(MAX_SCALE, Math.max(needed, transform.k * 2.5)));
        return;
      }
    }
    // A lone pin with a heading to go to jumps there, no popup. Setting the
    // hash, as a link would, keeps the history entry and :target highlight.
    if (group && group.members.length === 1 && linkTarget(group.members[0])) {
      setOpenPinId(null);
      setHoveredPinId(null);
      window.location.hash = group.members[0].href!;
      return;
    }
    setOpenAnchor(computeAnchor(element));
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
        <defs>
          <radialGradient id={pinGradientId}>
            <stop offset="55%" className="world-map__pin-stop" />
            <stop offset="100%" className="world-map__pin-stop world-map__pin-stop--edge" />
          </radialGradient>
          {/* Same lift as the page's pins: a soft shadow cast down and to
                the right. An SVG filter rather than CSS drop-shadow, which
                Safari ignores on SVG children. */}
          <filter id={pinShadowId} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx={2} dy={3} stdDeviation={1.4} floodColor="#000" floodOpacity={0.35} />
          </filter>
          {/* The pillars' twill and overlocked edge, as on the slice
                wheel, at the map's scale. */}
          <pattern id={twillId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect className="world-map__weave-light" width="1.4" height="6" />
            <rect className="world-map__weave-dark" width="6" height="1.4" />
          </pattern>
          <pattern id={overlockId} width="4.4" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(60)">
            <rect className="world-map__overlock-stitch" width="3" height="30" />
            <rect className="world-map__overlock-shade" x="3" width="1.4" height="30" />
          </pattern>
          {/* Land and pins are cut off at the patch's edge as they pan
                past it, rather than spilling over the overlock. */}
          <clipPath id={clothClipId}>
            <rect
              x={OVERLOCK_WIDTH}
              y={OVERLOCK_WIDTH}
              width={viewBox.width - 2 * OVERLOCK_WIDTH}
              height={viewBox.height - 2 * OVERLOCK_WIDTH}
              rx={CORNER_RADIUS - OVERLOCK_WIDTH / 2}
            />
          </clipPath>
        </defs>
        {/* The cloth the map is embroidered on: the sea. */}
        <g aria-hidden="true">
          <rect className="world-map__sea" width={viewBox.width} height={viewBox.height} rx={CORNER_RADIUS} />
          <rect width={viewBox.width} height={viewBox.height} rx={CORNER_RADIUS} fill={`url(#${twillId})`} />
        </g>
        <g clipPath={`url(#${clothClipId})`}>
          <path
            className="world-map__land"
            d={landPath}
            transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}
          />
        </g>
        <g aria-hidden="true">
          <rect
            className="world-map__overlock"
            x={OVERLOCK_WIDTH / 2}
            y={OVERLOCK_WIDTH / 2}
            width={viewBox.width - OVERLOCK_WIDTH}
            height={viewBox.height - OVERLOCK_WIDTH}
            rx={CORNER_RADIUS - OVERLOCK_WIDTH / 4}
            stroke={`url(#${overlockId})`}
            strokeWidth={OVERLOCK_WIDTH}
          />
          <rect
            className="world-map__stitch"
            x={STITCH_INSET}
            y={STITCH_INSET}
            width={viewBox.width - 2 * STITCH_INSET}
            height={viewBox.height - 2 * STITCH_INSET}
            rx={CORNER_RADIUS - STITCH_INSET / 3}
          />
        </g>
        <g clipPath={`url(#${clothClipId})`}>
          <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
            {groups.map((group) => {
              const isGroup = group.members.length > 1;
              const label = isGroup
                ? `${group.members.length} pins: ${group.members.map((member) => member.title).join('; ')}`
                : group.members[0].title;
              return (
                <g
                  key={group.id}
                  className={`world-map__pin${isGroup ? ' world-map__pin--group' : ''}`}
                  data-pin-id={group.id}
                  transform={`translate(${group.x} ${group.y}) scale(${1 / transform.k})`}
                  tabIndex={0}
                  role="button"
                  aria-label={label}
                  aria-expanded={group.id === openPinId}
                  onMouseEnter={(event) => handlePinHover(group.id, event.currentTarget)}
                  onMouseLeave={() => handlePinHoverEnd(group.id)}
                  onFocus={(event) => handlePinHover(group.id, event.currentTarget)}
                  onBlur={() => handlePinHoverEnd(group.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handlePinActivate(group.id, event.currentTarget);
                    }
                  }}
                >
                  {/* A pushpin like the ones holding up the quotes, cards
                      and tables around the wiki (see "Pinboard" in
                      globals.css), stuck into the map at a slant: the
                      needle runs from the local origin (the exact projected
                      lat/lng point, or a group's centre) up to the shaded
                      round head. A group's head is larger and carries its
                      count. */}
                  <line className="world-map__pin-needle" x1={0} y1={0} x2={5} y2={-15} />
                  <g className="world-map__pin-head" filter={`url(#${pinShadowId})`}>
                    <circle cx={5} cy={-15} r={isGroup ? 11.5 : 9} fill={`url(#${pinGradientId})`} />
                    {isGroup ? (
                      <text className="world-map__pin-count" x={5} y={-15}>
                        {group.members.length}
                      </text>
                    ) : (
                      <circle className="world-map__pin-shine" cx={2.2} cy={-18.6} r={2.3} />
                    )}
                  </g>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      <div ref={layerRef} className="world-map__layer" popover="manual">
        {showSign && hoveredGroup && hoverAnchor ? (
          <div
            className="world-map__sign"
            role="tooltip"
            style={{ left: hoverAnchor.left, top: hoverAnchor.top + hoverAnchor.radius }}
          >
            {hoveredGroup.members.length > 1 ? (
              `${hoveredGroup.members.length} places, click to zoom in`
            ) : (
              <>
                {hoveredGroup.members[0].title}
                {hoveredLink ? (
                  <span className="world-map__sign-go">
                    {hoveredDirection === 'up' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    Go to section
                  </span>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {showCard && openGroup ? (
          <div
            ref={popupRef}
            className="world-map__popup"
            role="dialog"
            aria-label={openGroup.members.length > 1 ? `${openGroup.members.length} pins` : openGroup.members[0].title}
            tabIndex={-1}
            data-placed={cardPlacement ? '' : undefined}
            style={
              cardPlacement
                ? ({
                    left: cardPlacement.left,
                    top: openAnchor!.top + openAnchor!.radius,
                    '--string-x': `${cardPlacement.stringX}px`,
                  } as CSSProperties)
                : { left: 0, top: 0 }
            }
          >
            <button type="button" className="world-map__popup-close" aria-label="Close" onClick={() => setOpenPinId(null)}>
              &times;
            </button>
            {openGroup.members.map((member) => {
              const target = linkTarget(member);
              return (
                <section key={member.id} className="world-map__popup-entry">
                  <h3 className="world-map__popup-title">{member.title}</h3>
                  {target ? (
                    <a className="world-map__popup-go" href={member.href} onClick={() => setOpenPinId(null)}>
                      {directionTo(target, containerRef.current) === 'up' ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                      Go to section
                    </a>
                  ) : (
                    <div className="world-map__popup-body">{member.body}</div>
                  )}
                </section>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
