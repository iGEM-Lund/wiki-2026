import { feature } from 'topojson-client';
import { presimplify, quantile, simplify, filter, filterAttachedWeight } from 'topojson-simplify';
import { geoEqualEarth, geoPath } from 'd3-geo';
import type { Topology, GeometryCollection } from 'topojson-specification';
import land from 'world-atlas/land-110m.json';

// Shared by src/components/content/WorldMap.tsx (site render) and, if ever
// needed, the Keystatic editor preview; same "compute once at module
// scope, pure math, no DOM" pattern as src/lib/chemistry.ts / katex.ts.

export const WORLD_MAP_VIEWBOX = { width: 960, height: 500 };

const rawTopology = land as unknown as Topology<{ land: GeometryCollection }>;

// world-atlas's land-110m.json is already the lowest resolution the package
// ships, but its raw coastlines are still busy (dense vertex noise, dozens
// of tiny islands) for a deliberately "not too detailed" stylized map.
// Simplify further: presimplify() weights every point by how much visual
// detail removing it would lose, simplify() drops the least-significant
// 20% of points (quantile 0.2, picked by visual comparison, see the
// map-*.png trials in this feature's dev session; more aggressive values
// started producing jagged/degenerate shapes), then filterAttachedWeight
// drops landmasses smaller than 0.04 steradians (clears most small island
// clutter (e.g. Caribbean/Indonesian fragments) while keeping every
// continent and larger island intact).
const presimplified = presimplify(rawTopology);
const simplified = simplify(presimplified, quantile(presimplified, 0.2));
const topology = filter(simplified, filterAttachedWeight(simplified, 0.04)) as Topology<{
  land: GeometryCollection;
}>;

const landFeature = feature(topology, topology.objects.land);

// geoEqualEarth is a balanced whole-world projection (not optimized for
// local accuracy), a good default for a stylized global view rather than a
// projection meant for navigation or regional precision.
const projection = geoEqualEarth().fitSize(
  [WORLD_MAP_VIEWBOX.width, WORLD_MAP_VIEWBOX.height],
  landFeature,
);
const pathGenerator = geoPath(projection);

// Computed once at module load; every page rendering a WorldMap reuses the
// same precomputed path string rather than re-projecting the landmass data
// on every request.
export const worldLandPath = pathGenerator(landFeature) ?? '';

// Reuses the exact projection instance the land path was fitted with, so
// pins land in the identical coordinate space as the continents.
export function projectLatLng(lat: number, lng: number): [number, number] | null {
  return projection([lng, lat]);
}
