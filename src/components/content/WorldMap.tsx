import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import type { ComponentType } from 'react';
import { embeddableComponents } from './embeddable-components';
import { Citation } from './Citation';
import { WorldMapClient, type WorldMapClientPin } from './WorldMapClient';
import { WORLD_MAP_VIEWBOX, projectLatLng, worldLandPath } from '@/lib/world-map';

// lat/lng arrive as strings, not numbers — see the WorldMap schema comment
// in src/lib/keystatic/content-components.tsx for why (Keystatic's MDX
// deserializer can't round-trip a negative fields.number value).
type WorldMapPin = { title: string; lat: string; lng: string; body: string };
type WorldMapProps = {
  pins?: WorldMapPin[];
  // Injected by src/lib/mdx/render.ts, the same way it injects Citation's
  // lookup — pin bodies are raw MDX and may themselves embed <Citation>,
  // which needs the page's resolved bibliography short forms.
  referenceLookup?: Record<string, { shortForm: string }>;
};

// Pin bodies are raw MDX source text (fields.text, not fields.mdx — see the
// comment on the WorldMap schema in src/lib/keystatic/content-components.tsx
// for why), compiled here with the same @mdx-js/mdx primitive
// src/lib/mdx/render.ts uses for page content, so a pin popup can embed the
// same content components (Citation, FigureWithCaption, Formula, ...) a page
// can. A bad pin never breaks the whole page: a compile error renders as an
// inline message in that pin's popup instead of throwing, the same
// never-break-the-build rule src/lib/chemistry.ts follows for bad SMILES.
async function compilePinBody(
  body: string,
  referenceLookup: Record<string, { shortForm: string }>,
): Promise<ComponentType> {
  try {
    const { default: MDXContent } = await evaluate(body, {
      ...runtime,
      baseUrl: import.meta.url,
    });
    const components = {
      ...embeddableComponents,
      Citation: (props: { reference?: string | null }) => Citation({ ...props, lookup: referenceLookup }),
    };
    return () => MDXContent({ components });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return () => <p className="world-map__popup-error">Couldn&apos;t render this pin: {message}</p>;
  }
}

export async function WorldMap({ pins = [], referenceLookup = {} }: WorldMapProps) {
  const projected: WorldMapClientPin[] = [];
  for (const [index, pin] of pins.entries()) {
    const lat = Number.parseFloat(pin.lat);
    const lng = Number.parseFloat(pin.lng);
    // Pins with unparsable/out-of-range/undefined coordinates project to
    // NaN/null (see GeoProjection's own documented behavior for the latter)
    // — skip them rather than rendering a pin nobody can see or breaking the
    // whole map.
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    const point = projectLatLng(lat, lng);
    if (!point) continue;
    const Body = await compilePinBody(pin.body, referenceLookup);
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
