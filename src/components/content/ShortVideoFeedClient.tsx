'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, ChevronUp, Play, Volume2, VolumeX } from 'lucide-react';
import type { ResolvedVideo } from '@/lib/video-universe';

export type ShortVideo = ResolvedVideo & { title?: string; caption?: string };

// Share of a slide that must be inside the frame for it to count as the
// current one (and start playing).
const ACTIVE_THRESHOLD = 0.6;
// Share of the whole feed that must be on screen for anything to play.
const ON_SCREEN_THRESHOLD = 0.5;

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
// looping; the rest are paused and rewound. Tapping a clip pauses it, the
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
          className="short-feed__viewport"
          ref={viewportRef}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label="Short videos. Use the up and down arrow keys to switch video, space to pause and M to unmute."
          onKeyDown={onKeyDown}
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
