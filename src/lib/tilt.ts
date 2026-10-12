// A small rotation for an object "stuck on" the page (taped figures, pinned
// quotes), derived from a stable seed such as the image URL or quote text
// rather than Math.random(), so the server render, the hydrated client and
// every rebuild of the static export agree. Never closer to straight than
// MIN_DEG, so it reads as deliberate rather than as a rendering glitch, and
// never past MAX_DEG, so text inside stays comfortable to read.
const MIN_DEG = 0.5;
const MAX_DEG = 1.2;

export function tiltFor(seed: string): string {
  // FNV-1a: tiny, and spreads similar URLs (ig-1, ig-2, ...) well apart.
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const sign = hash & 1 ? 1 : -1;
  const magnitude = MIN_DEG + (((hash >>> 1) % 1000) / 999) * (MAX_DEG - MIN_DEG);
  return `${(sign * magnitude).toFixed(2)}deg`;
}
