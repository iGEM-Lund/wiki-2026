'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { ChevronDown, ChevronUp, Play, Volume2, VolumeX } from 'lucide-react';
import type { ResolvedVideo } from '@/lib/video-universe';

export type ShortVideo = ResolvedVideo & { title?: string; caption?: string };

// Share of a slide that must be inside the frame for it to count as the
// current one (and start playing).
const ACTIVE_THRESHOLD = 0.6;
// Share of the whole feed that must be on screen for anything to play.
const ON_SCREEN_THRESHOLD = 0.5;
// Mouse drags: how far the pointer must move before a press counts as a
// drag rather than a click, how far (as a share of the frame's height) a
// drag must go to switch clips, and how fast a shorter flick must be
// (px/ms) to switch anyway.
const DRAG_START_PX = 6;
const DRAG_SWITCH_SHARE = 0.2;
const FLICK_VELOCITY = 0.5;
// A flick only counts if the pointer was still moving this recently.
const FLICK_WINDOW_MS = 100;
// Fallback for browsers without the scrollend event.
const SETTLE_FALLBACK_MS = 600;

type Drag = {
  pointerId: number;
  startY: number;
  startTop: number;
  lastY: number;
  lastTime: number;
  velocity: number;
  moved: boolean;
};

// Same check as FigureCarousel.tsx: the OS setting, or the accessibility
// menu's data-motion attribute.
function prefersReducedMotion() {
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.getAttribute('data-motion') === 'reduce'
  );
}

// Instagram Reels style: a phone-shaped frame that scrolls vertically one
// clip at a time (CSS scroll snapping, so touch swipes, wheels and
// trackpads all work natively). Whichever clip is in view plays muted and
// looping; the rest are paused and rewound. Touch swipes are the
// browser's own snapped scrolling; mouse (and pen) drags are handled here,
// since desktop browsers don't scroll on a drag: the clip follows the
// pointer, then settles on the next/previous clip or springs back. Tapping
// a clip pauses it, the
// speaker button unmutes the whole feed, and the arrow buttons / arrow keys
// step between clips. With reduced motion nothing autoplays: each clip
// waits for a tap.
export function ShortVideoFeedClient({ videos }: { videos: ShortVideo[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  // Whether the current clip should be playing (while the feed is on
  // screen). Starts false so the server render never claims to autoplay.
  const [wantPlay, setWantPlay] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  // Scroll snapping is switched off while a mouse drag moves the clips
  // (it would fight every scrollTop write) and until the release has
  // settled.
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<Drag | null>(null);
  const suppressClickRef = useRef(false);
  const count = videos.length;

  useEffect(() => {
    setWantPlay(!prefersReducedMotion());
  }, []);

  // Which clip is in view. A new clip starts from the top and autoplays
  // again even if the previous one had been paused.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = slideRefs.current.indexOf(entry.target as HTMLDivElement);
          if (!entry.isIntersecting || index === -1 || index === activeRef.current) continue;
          activeRef.current = index;
          setActive(index);
          setWantPlay(!prefersReducedMotion());
        }
      },
      { root: viewport, threshold: ACTIVE_THRESHOLD },
    );
    slideRefs.current.slice(0, count).forEach((slide) => slide && observer.observe(slide));
    return () => observer.disconnect();
  }, [count]);

  // Nothing plays while the feed is scrolled out of the page's view.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      threshold: ON_SCREEN_THRESHOLD,
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    videoRefs.current.slice(0, count).forEach((video, index) => {
      if (!video) return;
      if (index === active && wantPlay && onScreen) {
        video.play().catch((error: unknown) => {
          // Blocked by the browser's autoplay policy: fall back to a tap to
          // play. (An AbortError just means a pause() overtook this play().)
          if (error instanceof DOMException && error.name === 'NotAllowedError') setWantPlay(false);
        });
      } else {
        video.pause();
        if (index !== active && video.currentTime !== 0) video.currentTime = 0;
      }
    });
  }, [active, wantPlay, onScreen, count]);

  useEffect(() => {
    videoRefs.current.forEach((video) => {
      if (video) video.muted = muted;
    });
  }, [muted]);

  // Progress bar, written straight to the DOM every frame while playing.
  useEffect(() => {
    const video = videoRefs.current[active];
    const bar = barRef.current;
    if (!bar) return;
    let frame = 0;
    const draw = () => {
      const progress = video && video.duration ? video.currentTime / video.duration : 0;
      bar.style.transform = `scaleX(${progress})`;
      if (playing) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [active, playing]);

  function goTo(index: number) {
    const viewport = viewportRef.current;
    if (!viewport || index < 0 || index >= count) return;
    viewport.scrollTo({
      top: index * viewport.clientHeight,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;
    if (!viewport || event.pointerType === 'touch' || event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startTop: viewport.scrollTop,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
      moved: false,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || !viewport || event.pointerId !== drag.pointerId) return;
    const dy = event.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.abs(dy) < DRAG_START_PX) return;
      drag.moved = true;
      viewport.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    const dt = event.timeStamp - drag.lastTime;
    if (dt > 0) drag.velocity = (event.clientY - drag.lastY) / dt;
    drag.lastY = event.clientY;
    drag.lastTime = event.timeStamp;
    viewport.scrollTop = drag.startTop - dy;
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    if (!drag.moved || !viewport) return;
    // The click that follows this release must not also toggle play.
    suppressClickRef.current = true;
    setTimeout(() => {
      suppressClickRef.current = false;
    });

    const height = viewport.clientHeight;
    const from = Math.round(drag.startTop / height);
    const dy = event.clientY - drag.startY;
    const velocity = event.timeStamp - drag.lastTime < FLICK_WINDOW_MS ? drag.velocity : 0;
    let target = from;
    if (event.type === 'pointerup') {
      // Dragging up (negative dy) brings in the next clip, like a swipe.
      if (dy < -height * DRAG_SWITCH_SHARE || velocity < -FLICK_VELOCITY) target = from + 1;
      else if (dy > height * DRAG_SWITCH_SHARE || velocity > FLICK_VELOCITY) target = from - 1;
    }
    target = Math.min(count - 1, Math.max(0, target));

    // Snapping comes back on only once the settle scroll has finished, or
    // it would jump straight to the nearest clip mid-animation.
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      viewport.removeEventListener('scrollend', settle);
      // Finish exactly on the clip even if the smooth scroll was cut short
      // (another scroll, or a backgrounded tab that never animated it).
      viewport.scrollTo({ top: target * height });
      setDragging(false);
    };
    viewport.addEventListener('scrollend', settle);
    setTimeout(settle, SETTLE_FALLBACK_MS);
    viewport.scrollTo({ top: target * height, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const actions: Record<string, () => void> = {
      ArrowDown: () => goTo(active + 1),
      PageDown: () => goTo(active + 1),
      ArrowUp: () => goTo(active - 1),
      PageUp: () => goTo(active - 1),
      ' ': () => setWantPlay((want) => !want),
      k: () => setWantPlay((want) => !want),
      m: () => setMuted((mute) => !mute),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }

  const current = videos[active];

  return (
    <div className="short-feed">
      <div className="short-feed__frame">
        <div
          className={`short-feed__viewport${dragging ? ' short-feed__viewport--dragging' : ''}`}
          ref={viewportRef}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label="Short videos. Use the up and down arrow keys to switch video, space to pause and M to unmute."
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onClickCapture={onClickCapture}
          // Stops the source link (or anything else draggable) from starting
          // a native drag-and-drop instead of moving the clips.
          onDragStart={(event) => event.preventDefault()}
        >
          {videos.map((video, index) => (
            <div
              key={index}
              className="short-feed__slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}${video.title ? `: ${video.title}` : ''}`}
              ref={(el) => {
                slideRefs.current[index] = el;
              }}
            >
              {video.src ? (
                <>
                  <video
                    className="short-feed__video"
                    ref={(el) => {
                      videoRefs.current[index] = el;
                    }}
                    src={video.src}
                    poster={video.poster}
                    // Only the clips next to the current one fetch anything
                    // beyond their metadata.
                    preload={Math.abs(index - active) <= 1 ? 'auto' : 'metadata'}
                    muted
                    loop
                    playsInline
                    onPlay={() => index === activeRef.current && setPlaying(true)}
                    onPause={() => index === activeRef.current && setPlaying(false)}
                  />
                  <button
                    type="button"
                    className="short-feed__tap"
                    aria-label={index === active && playing ? 'Pause video' : 'Play video'}
                    tabIndex={index === active ? 0 : -1}
                    onClick={() => setWantPlay(!(index === active && playing))}
                  >
                    {index === active && !playing ? (
                      <Play className="short-feed__play-icon" aria-hidden="true" fill="currentColor" />
                    ) : null}
                  </button>
                </>
              ) : (
                <p className="short-feed__error">{video.error}</p>
              )}
              {video.title || video.caption || video.href ? (
                <div className="short-feed__overlay">
                  {video.title ? <p className="short-feed__title">{video.title}</p> : null}
                  {video.caption ? <p className="short-feed__caption">{video.caption}</p> : null}
                  {video.href ? (
                    <a
                      className="short-feed__source"
                      href={video.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={index === active ? 0 : -1}
                    >
                      Watch on iGEM Video Universe ↗
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <span className="short-feed__counter" aria-hidden="true">
          {active + 1} / {count}
        </span>
        {current.src ? (
          <button
            type="button"
            className="short-feed__mute"
            aria-label={muted ? 'Unmute' : 'Mute'}
            aria-pressed={!muted}
            onClick={() => setMuted(!muted)}
          >
            {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          </button>
        ) : null}
        <div className="short-feed__progress" aria-hidden="true">
          <div className="short-feed__progress-bar" ref={barRef} />
        </div>
      </div>
      {count > 1 ? (
        <div className="short-feed__nav">
          <button type="button" aria-label="Previous video" disabled={active === 0} onClick={() => goTo(active - 1)}>
            <ChevronUp aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next video"
            disabled={active === count - 1}
            onClick={() => goTo(active + 1)}
          >
            <ChevronDown aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
