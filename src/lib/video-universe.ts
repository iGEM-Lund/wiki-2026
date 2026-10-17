import { cache } from 'react';

// iGEM's rules route every video through the iGEM Video Universe
// (video.igem.org, a PeerTube instance). Its files on static.igem.org only
// answer requests that come from video.igem.org itself (anything else gets
// a 403 saying to use its player), so a bare <video> can't play them: the
// clips are shown in Video Universe's own embedded player instead. A writer
// pastes the ordinary watch link, and it's resolved here, while rendering
// (at build time for the production export), to the video's embed address, poster, counts and
// watch page. The visitor's browser only ever talks to igem.org domains.
const VIDEO_UNIVERSE = 'video.igem.org';

export type ResolvedVideo = {
  // The embedded player's address, for Video Universe videos.
  embedSrc?: string;
  // A direct video file, for links to anything that isn't Video Universe.
  src?: string;
  poster?: string;
  // The page the video can be watched on, linked from the feed.
  href?: string;
  // Video Universe videos only: the id the feed uses to refresh the counts
  // live in the visitor's browser (allowed: iGEM's wiki rules permit
  // runtime requests to igem.org domains), and the counts as of the build,
  // shown until (or if) that refresh succeeds.
  videoUniverseId?: string;
  likes?: number;
  views?: number;
  // Set instead of a player when the link couldn't be resolved; shown in
  // place of that one clip rather than breaking the whole page or build.
  error?: string;
};

type PeerTubeVideo = { uuid: string; url?: string; likes?: number; views?: number; previewPath?: string };

// Accepts the share link (/w/<short id>), the watch URL and the embed URL.
function videoId(url: URL) {
  return url.pathname.match(/^\/(?:w|videos\/watch|videos\/embed)\/([A-Za-z0-9-]+)\/?$/)?.[1] ?? null;
}

export function videoUniverseApiUrl(id: string) {
  return `https://${VIDEO_UNIVERSE}/api/v1/videos/${id}`;
}

export const resolveVideo = cache(async (raw: string): Promise<ResolvedVideo> => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { error: `"${raw}" isn't a valid URL.` };
  }
  // Anything else is taken to be a direct video file.
  if (url.hostname !== VIDEO_UNIVERSE) return { src: raw };

  const id = videoId(url);
  if (!id) return { href: raw, error: "This Video Universe link doesn't point at a single video." };

  try {
    // No caching options on purpose: any revalidate here would turn the
    // otherwise fully static page into an ISR one. Pages are rebuilt on
    // every deploy anyway, which re-resolves the link.
    const response = await fetch(videoUniverseApiUrl(id));
    // PeerTube answers 400 (not 404) for an id that isn't a valid one.
    if (response.status === 400 || response.status === 404) throw new Error('no such video on Video Universe');
    if (!response.ok) throw new Error(`Video Universe answered ${response.status}`);
    const video = (await response.json()) as PeerTubeVideo;
    return {
      // autoplay=1: some clips (e.g. ones with a subtitle track) never load
      // their stream until the player has been told to autoplay, and then
      // ignore a later play command. The feed pauses all but the current
      // clip as soon as each player reports ready.
      embedSrc: `https://${VIDEO_UNIVERSE}/videos/embed/${video.uuid}?api=1&controls=0&loop=1&muted=1&autoplay=1&title=0&warningTitle=0&peertubeLink=0`,
      poster: video.previewPath ? `https://${VIDEO_UNIVERSE}${video.previewPath}` : undefined,
      href: video.url ?? raw,
      videoUniverseId: video.uuid,
      likes: video.likes,
      views: video.views,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { href: raw, error: `Couldn't load this video: ${message}.` };
  }
});
