'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { renderCaption } from '@/lib/caption-text';
import type { ResolvedVideo } from '@/lib/video-universe';

export type ShortVideo = ResolvedVideo & { title?: string; caption?: string };

// A phone-shaped frame showing one clip at a time, stepped with the
// buttons under it. Video Universe clips play in its own embedded player:
// iGEM's file host answers 403 to any request that doesn't come from
// video.igem.org, so the files can't be played by a <video> of ours. Only
// the clip on show has a player, so the page doesn't load one per clip.
export function ShortVideoFeedClient({ videos }: { videos: ShortVideo[] }) {
  const [active, setActive] = useState(0);
  const count = videos.length;
  const video = videos[active];

  return (
    <div className="short-feed">
      <div className="short-feed__frame">
        {video.embedSrc ? (
          <iframe
            key={video.embedSrc}
            className="short-feed__player"
            src={video.embedSrc}
            title={video.title || `Video ${active + 1} of ${count}`}
            allow="fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : video.src ? (
          <video key={video.src} className="short-feed__video" src={video.src} poster={video.poster} controls playsInline />
        ) : (
          <p className="short-feed__error">{video.error}</p>
        )}
      </div>
      {count > 1 ? (
        <div className="short-feed__nav">
          <button
            type="button"
            className="short-feed__step"
            aria-label="Previous video"
            disabled={active === 0}
            onClick={() => setActive(active - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span aria-live="polite">
            {active + 1} / {count}
          </span>
          <button
            type="button"
            className="short-feed__step"
            aria-label="Next video"
            disabled={active === count - 1}
            onClick={() => setActive(active + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      ) : null}
      {video.title || video.caption || video.href ? (
        <div className="short-feed__info">
          {video.title ? <p className="short-feed__title">{video.title}</p> : null}
          {video.caption ? <p className="short-feed__caption">{renderCaption(video.caption)}</p> : null}
          {video.href ? (
            <a className="short-feed__source" href={video.href} target="_blank" rel="noopener noreferrer">
              Watch on iGEM Video Universe ↗
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
