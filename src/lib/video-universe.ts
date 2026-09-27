import { cache } from 'react';

// iGEM's rules route every video through the iGEM Video Universe
// (video.igem.org, a PeerTube instance), whose own player is an <iframe>
// that can't be driven for a Reels-style feed. PeerTube's public API does
// expose the plain MP4 renditions it serves from static.igem.org, though,
// so a writer pastes the ordinary watch link and it's resolved here to a
// file a bare <video> can play. This runs while rendering (at build time
// for the production export), never in the visitor's browser, so the
// published site makes no backend calls of its own.
const VIDEO_UNIVERSE = 'video.igem.org';
// Smallest rendition at or above this is picked: sharp enough for a
// phone-sized frame without pulling a 1080p file per clip.
const PREFERRED_RESOLUTION = 720;

export type ResolvedVideo = {
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
  // Set instead of src when the link couldn't be resolved; shown in place
  // of that one clip rather than breaking the whole page or build.
  error?: string;
};

type PeerTubeFile = { resolution: { id: number }; fileUrl: string };
type PeerTubeVideo = {
  uuid: string;
  url?: string;
  likes?: number;
  views?: number;
  previewPath?: string;
  files?: PeerTubeFile[];
  streamingPlaylists?: { files?: PeerTubeFile[] }[];
};

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
    // Plain web-video files first, so they win ties over HLS fragments
    // (the sort is stable); resolution 0 is the audio-only track.
    const files = [...(video.files ?? []), ...(video.streamingPlaylists ?? []).flatMap((p) => p.files ?? [])]
      .filter((file) => file.resolution.id > 0)
      .sort((a, b) => a.resolution.id - b.resolution.id);
    const file = files.find((f) => f.resolution.id >= PREFERRED_RESOLUTION) ?? files.at(-1);
    if (!file) throw new Error('it has no playable file yet (still processing?)');
    return {
      src: file.fileUrl,
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
