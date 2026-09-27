import { resolveVideo } from '@/lib/video-universe';
import { ShortVideoFeedClient, type ShortVideo } from './ShortVideoFeedClient';

type ShortVideoFeedProps = {
  videos?: { url?: string; title?: string; caption?: string }[];
};

// Server half: resolves each Video Universe link to a playable file (see
// src/lib/video-universe.ts), then hands the list to the client-side player.
export async function ShortVideoFeed({ videos = [] }: ShortVideoFeedProps) {
  const resolved: ShortVideo[] = await Promise.all(
    videos
      .filter((video) => video.url)
      .map(async ({ url, title, caption }) => ({ title, caption, ...(await resolveVideo(url!)) })),
  );
  if (resolved.length === 0) return null;
  return <ShortVideoFeedClient videos={resolved} />;
}
