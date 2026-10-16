'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { Eye, Heart, Play, Volume2, VolumeX } from 'lucide-react';
import { renderCaption } from '@/lib/caption-text';
import { videoUniverseApiUrl, type ResolvedVideo } from '@/lib/video-universe';

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

// Two taps within this window are a double tap (like); a single tap only
// toggles play once the window has passed without a second one.
const DOUBLE_TAP_MS = 280;
// How long a double-tap heart stays on screen; matches globals.css's
// short-feed-burst animation.
const BURST_MS = 900;
// Local likes, per browser: purely "for the feel". The wiki is static and
// may only talk to igem.org domains, so there's nowhere to store a shared
// like, and liking on Video Universe itself needs a Video Universe login.
const LIKES_STORAGE_KEY = 'short-feed-likes';

const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

type Stats = { likes?: number; views?: number };
type Burst = { id: number; index: number; x: number; y: number; tilt: number };

// Storage can be missing or throw (private windows, blocked site data);
// likes then just don't persist.
function readLikes(): Set<string> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(stored) ? stored.filter((key) => typeof key === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeLikes(likes: Set<string>) {
  try {
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify([...likes]));
  } catch {
    // Not persisted; the like still shows for this visit.
  }
}

function likeKey(video: ShortVideo) {
  return video.videoUniverseId ?? video.src ?? null;
}

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
// speaker button unmutes the whole feed, and the arrow keys step between
// clips. With reduced motion the first clip doesn't start by itself on
// page load; switching to a clip is the visitor's own action, though, so
// that clip plays either way.
//
// Like Reels, each clip has a like button (double-tapping the clip also
// likes it, with a heart burst where you tapped) and shows its like and
// view counts. The counts are Video Universe's, refreshed from its API
// once the feed is first on screen; the like itself is local to the
// visitor's browser and adds 1 to the like count shown to that visitor
// only.
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
  const [liked, setLiked] = useState<Set<string>>(() => new Set());
  const [stats, setStats] = useState<Stats[]>(() => videos.map(({ likes, views }) => ({ likes, views })));
  const statsFetchedRef = useRef(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstIdRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Last double tap, so a third or fourth quick tap adds another heart
  // instead of pausing.
  const lastBurstRef = useRef(0);
  const count = videos.length;

  useEffect(() => {
    setWantPlay(!prefersReducedMotion());
    setLiked(readLikes());
    return () => clearTimeout(tapTimerRef.current);
  }, []);

  // Refresh the build-time counts from Video Universe, once, the first time
  // the feed comes on screen. A failed request just keeps the build-time
  // numbers.
  useEffect(() => {
    if (!onScreen || statsFetchedRef.current) return;
    // Deliberately not aborted on cleanup: onScreen flipping back to false
    // mid-request would otherwise cancel it for good.
    statsFetchedRef.current = true;
    videos.forEach((video, index) => {
      if (!video.videoUniverseId) return;
      fetch(videoUniverseApiUrl(video.videoUniverseId))
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
        .then(({ likes, views }: Stats) => {
          setStats((current) => current.map((stat, i) => (i === index ? { likes, views } : stat)));
        })
        .catch(() => {});
    });
  }, [onScreen, videos]);

  // Which clip is in view. A new clip starts from the top and autoplays
  // again even if the previous one had been paused, reduced motion
  // included: only a visitor's swipe, drag, wheel or key press switches
  // clips, so playing the one they switched to is their choice.
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
          setWantPlay(true);
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

  // Clips whose files have no sound of their own play from the HLS master
  // playlist instead (see resolveVideo). Safari plays HLS natively; every
  // other browser goes through hls.js, loaded only when such a clip exists.
  useEffect(() => {
    let cancelled = false;
    const players: { destroy: () => void }[] = [];
    videos.forEach((clip, index) => {
      const video = videoRefs.current[index];
      if (!clip.hlsSrc || !video) return;
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = clip.hlsSrc;
        return;
      }
      import('hls.js').then(({ default: Hls }) => {
        if (cancelled || !Hls.isSupported()) return;
        const hls = new Hls();
        hls.loadSource(clip.hlsSrc!);
        hls.attachMedia(video);
        players.push(hls);
      });
    });
    return () => {
      cancelled = true;
      players.forEach((player) => player.destroy());
    };
  }, [videos]);

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

  function setLike(index: number, value: boolean) {
    const key = likeKey(videos[index]);
    if (!key) return;
    setLiked((current) => {
      const next = new Set(current);
      if (value) next.add(key);
      else next.delete(key);
      writeLikes(next);
      return next;
    });
  }

  function togglePlay(index: number) {
    setWantPlay(videoRefs.current[index]?.paused ?? true);
  }

  // Single tap: play/pause, but only once DOUBLE_TAP_MS has passed with no
  // second tap. Double tap: like (never unlike, same as Instagram) with a
  // heart where the tap landed. Keyboard activation (detail 0) can't double
  // tap, so it toggles play straight away.
  function onTap(event: MouseEvent<HTMLButtonElement>, index: number) {
    if (event.detail === 0) {
      togglePlay(index);
      return;
    }
    const doubleTap = tapTimerRef.current !== undefined || event.timeStamp - lastBurstRef.current < DOUBLE_TAP_MS;
    clearTimeout(tapTimerRef.current);
    tapTimerRef.current = undefined;
    if (!doubleTap) {
      tapTimerRef.current = setTimeout(() => {
        tapTimerRef.current = undefined;
        togglePlay(index);
      }, DOUBLE_TAP_MS);
      return;
    }
    lastBurstRef.current = event.timeStamp;
    const rect = event.currentTarget.getBoundingClientRect();
    const burst: Burst = {
      id: burstIdRef.current++,
      index,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      tilt: Math.round(Math.random() * 30 - 15),
    };
    setBursts((current) => [...current, burst]);
    setTimeout(() => setBursts((current) => current.filter((b) => b.id !== burst.id)), BURST_MS);
    setLike(index, true);
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
  const likedHere = (index: number) => {
    const key = likeKey(videos[index]);
    return key !== null && liked.has(key);
  };

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
                    src={video.hlsSrc ? undefined : video.src}
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
                    onClick={(event) => onTap(event, index)}
                  >
                    {index === active && !playing ? (
                      <Play className="short-feed__play-icon" aria-hidden="true" fill="currentColor" />
                    ) : null}
                  </button>
                  {bursts
                    .filter((burst) => burst.index === index)
                    .map((burst) => (
                      <Heart
                        key={burst.id}
                        className="short-feed__burst"
                        style={{ left: burst.x, top: burst.y, '--tilt': `${burst.tilt}deg` } as CSSProperties}
                        fill="currentColor"
                        aria-hidden="true"
                      />
                    ))}
                </>
              ) : (
                <p className="short-feed__error">{video.error}</p>
              )}
              {video.title || video.caption || video.href ? (
                <div className="short-feed__overlay">
                  {video.title ? <p className="short-feed__title">{video.title}</p> : null}
                  {video.caption ? <p className="short-feed__caption">{renderCaption(video.caption)}</p> : null}
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
              {video.src ? (
                <div className="short-feed__actions">
                  <button
                    type="button"
                    className={`short-feed__like${likedHere(index) ? ' short-feed__like--on' : ''}`}
                    aria-label="Like"
                    aria-pressed={likedHere(index)}
                    tabIndex={index === active ? 0 : -1}
                    onClick={() => setLike(index, !likedHere(index))}
                  >
                    <Heart aria-hidden="true" fill={likedHere(index) ? 'currentColor' : 'none'} />
                  </button>
                  {stats[index]?.likes !== undefined ? (
                    <span className="short-feed__count">
                      {compactNumber.format(stats[index].likes! + (likedHere(index) ? 1 : 0))}
                      <span className="short-feed__sr-only"> likes</span>
                    </span>
                  ) : null}
                  {stats[index]?.views !== undefined ? (
                    <>
                      <Eye className="short-feed__stat-icon" aria-hidden="true" />
                      <span className="short-feed__count">
                        {compactNumber.format(stats[index].views!)}
                        <span className="short-feed__sr-only"> views</span>
                      </span>
                    </>
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
    </div>
  );
}
