import { compileMdxSnippet } from './compile-mdx-snippet';
import { WorldMapClient, type WorldMapClientPin } from './WorldMapClient';
import { WORLD_MAP_VIEWBOX, projectLatLng, worldLandPath } from '@/lib/world-map';

// lat/lng arrive as strings, not numbers; see the WorldMap schema comment
// in src/lib/keystatic/content-components.tsx for why (Keystatic's MDX
// deserializer can't round-trip a negative fields.number value).
type WorldMapPin = { title: string; lat: string; lng: string; body: string };
type WorldMapProps = {
  pins?: WorldMapPin[];
  // Injected by src/lib/mdx/render.ts, the same way it injects Citation's
  // lookup; pin bodies are raw MDX and may themselves embed <Citation>,
  // which needs the page's resolved bibliography short forms.
  referenceLookup?: Record<string, { shortForm: string }>;
};

export async function WorldMap({ pins = [], referenceLookup = {} }: WorldMapProps) {
  const projected: WorldMapClientPin[] = [];
  for (const [index, pin] of pins.entries()) {
    const lat = Number.parseFloat(pin.lat);
    const lng = Number.parseFloat(pin.lng);
    // Pins with unparsable/out-of-range/undefined coordinates project to
    // NaN/null (see GeoProjection's own documented behavior for the latter)
    // skip them rather than rendering a pin nobody can see or breaking the
    // whole map.
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    const point = projectLatLng(lat, lng);
    if (!point) continue;
    const Body = await compileMdxSnippet(pin.body, referenceLookup, 'world-map__popup-error', 'pin');
    projected.push({
      id: `pin-${index}`,
      title: pin.title,
      x: point[0],
      y: point[1],
      body: <Body />,
    });
  }

  return <WorldMapClient landPath={worldLandPath} viewBox={WORLD_MAP_VIEWBOX} pins={projected} />;
}
