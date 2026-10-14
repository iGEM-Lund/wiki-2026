'use client';

import { useEffect, useState, useRef, type RefObject } from 'react';

// The home page's scroll scenes (women-on-line.tsx, antigone-reveal.tsx):
// changes that play out by themselves once the scroll reaches them, and
// the scroll held still while they do.

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// Skipping to the end (see SkipToEnd): for a moment, every change jumps
// straight to where it is going, and the scroll is never held, so the
// page can go straight to the end and show it finished.
const SKIP_EVENT = 'home-scenes-skip';
let skippingUntil = 0;
const skipping = () => performance.now() < skippingUntil;
export function skipScenes() {
  skippingUntil = performance.now() + 800;
  window.dispatchEvent(new Event(SKIP_EVENT));
}

// Seconds since `active` last turned on, ticking every frame while it is.
export function useClock(active: boolean) {
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setTime((now - start) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);
  return time;
}

// The same as useTimedToggle, for a whole set of switches at once.
export function useTimedToggles(on: boolean[], ms: number) {
  const [values, setValues] = useState(() => on.map(() => 0));
  const valuesRef = useRef(values);
  const key = on.map(Number).join('');
  useEffect(() => {
    const targets = key.split('').map(Number);
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const delta = skipping() ? Infinity : (now - last) / ms;
      last = now;
      const next = valuesRef.current.map((v, i) =>
        targets[i] > v ? Math.min(targets[i], v + delta) : Math.max(targets[i], v - delta),
      );
      valuesRef.current = next;
      setValues(next);
      if (next.some((v, i) => v !== targets[i])) frame = requestAnimationFrame(step);
    };
    if (valuesRef.current.some((v, i) => v !== targets[i])) frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [key, ms]);
  return values;
}

// Eases `value` from 0 to 1 over `ms` while `on`, and back while not,
// picking up from wherever it is if it flips part way.
export function useTimedToggle(on: boolean, ms: number) {
  const [value, setValue] = useState(0);
  const valueRef = useRef(0);
  useEffect(() => {
    const target = on ? 1 : 0;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const delta = skipping() ? Infinity : (now - last) / ms;
      last = now;
      const current = valueRef.current;
      const next = target > current ? Math.min(target, current + delta) : Math.max(target, current - delta);
      valueRef.current = next;
      setValue(next);
      if (next !== target) frame = requestAnimationFrame(step);
    };
    if (valueRef.current !== target) frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [on, ms]);
  return value;
}

// A point in the scroll where an animation starts that plays by itself,
// and how long it plays for.
export type Hold = { at: number; ms: number };

// Scroll progress through the pinned stretch of `ref`: 0 as its top reaches
// the top of the screen, 1 as its bottom reaches the bottom. Scrolling down
// past one of `holds` (sorted by `at`) stops the page right on it until its
// animation has played, whatever the scroll did meanwhile (a fling, a page
// down, a dragged scrollbar), so no scene is skipped: several crossed at
// once play one after another. Scrolling back up is never held, so the
// back-to-top button and the like still work.
export function useScrollProgress(ref: RefObject<HTMLElement | null>, holds: readonly Hold[]) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    let release = 0;
    let last: number | null = null;
    // While held: the scroll position to keep, and until when.
    let heldAt: number | null = null;
    let heldUntil = 0;
    const keep = (y: number) => {
      if (Math.abs(window.scrollY - y) > 0.5) window.scrollTo({ top: y, behavior: 'instant' });
    };
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const span = rect.height - window.innerHeight;
      if (span <= 0) return setProgress(0);
      if (skipping()) heldAt = null;
      if (heldAt !== null) {
        if (performance.now() < heldUntil) return keep(heldAt);
        heldAt = null;
      }
      let p = clamp01((window.scrollY - top) / span);
      if (last !== null && p > last && !skipping()) {
        const from = last;
        const hold = holds.find(({ at }) => from < at && at <= p);
        if (hold) {
          heldAt = Math.ceil(top + hold.at * span);
          heldUntil = performance.now() + hold.ms;
          keep(heldAt);
          p = clamp01((heldAt - top) / span);
          window.clearTimeout(release);
          release = window.setTimeout(schedule, hold.ms + 20);
        }
      }
      last = p;
      setProgress(p);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // While held, the wheel, touch and scrolling keys do nothing at all,
    // rather than moving the page for it to be put back.
    const block = (event: Event) => {
      if (heldAt !== null && performance.now() < heldUntil) event.preventDefault();
    };
    const SCROLL_KEYS = new Set([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End']);
    const blockKeys = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable]')) return;
      if (SCROLL_KEYS.has(event.key)) block(event);
    };
    const skip = () => {
      heldAt = null;
      window.clearTimeout(release);
      schedule();
    };
    update();
    window.addEventListener(SKIP_EVENT, skip);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('wheel', block, { passive: false });
    window.addEventListener('touchmove', block, { passive: false });
    window.addEventListener('keydown', blockKeys);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(release);
      window.removeEventListener(SKIP_EVENT, skip);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('wheel', block);
      window.removeEventListener('touchmove', block);
      window.removeEventListener('keydown', blockKeys);
    };
  }, [ref, holds]);
  return progress;
}
