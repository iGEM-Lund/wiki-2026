// One speech bubble on a figure: where it sits (percent of the image, from
// its top left corner), whose it is, and where a click on it goes.
export type Bubble = { name: string; url: string; x: number; y: number };

const clamp = (n: number) => Math.min(100, Math.max(0, n));

export function parseBubbles(value: unknown): Bubble[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const { name, url, x, y } = item as Record<string, unknown>;
    if (typeof x !== 'number' || typeof y !== 'number') return [];
    return [
      {
        name: typeof name === 'string' ? name : '',
        url: typeof url === 'string' ? url : '',
        x: clamp(x),
        y: clamp(y),
      },
    ];
  });
}
