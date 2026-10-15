import { feature } from 'topojson-client';
import { presimplify, quantile, simplify, filter, filterAttachedWeight } from 'topojson-simplify';
import { geoBounds, geoEqualEarth, geoPath } from 'd3-geo';
import type { Topology, GeometryCollection } from 'topojson-specification';
import land from 'world-atlas/land-110m.json';

// Shared by src/components/content/WorldMap.tsx (site render) and, if ever
// needed, the Keystatic editor preview; same "compute once at module
// scope, pure math, no DOM" pattern as src/lib/chemistry.ts / katex.ts.

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

const fullLand = feature(topology, topology.objects.land);

// Antarctica and the open Pacific only take space away from the places the
// map is for. Drop every polygon lying wholly south of 60°S (Antarctica and
// the ice shelves/islands around it) and the scraps of land near the date
// line (Fiji) that would otherwise stretch the map's right edge out over
// empty ocean, so the fitted bounds below hug the inhabited continents.
const landFeature: GeoJSON.Feature<GeoJSON.MultiPolygon> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'MultiPolygon',
    coordinates: fullLand.features.flatMap((landmass) => {
      const geometry = landmass.geometry;
      const polygons =
        geometry.type === 'MultiPolygon' ? geometry.coordinates : geometry.type === 'Polygon' ? [geometry.coordinates] : [];
      return polygons.filter((polygon) => {
        const [[west, south], [east, north]] = geoBounds({ type: 'Polygon', coordinates: polygon });
        if (north < -60) return false;
        // A polygon whose bounds cross the date line has west > east.
        if (west > east && north - south < 10) return false;
        return true;
      });
    }),
  },
};

// geoEqualEarth is a balanced whole-world projection (not optimized for
// local accuracy), a good default for a stylized global view rather than a
// projection meant for navigation or regional precision. Rotated to centre
// on 11°E so its seam falls in the Bering Strait, between Chukotka and
// Alaska, instead of cutting the tip of Russia off onto the far left; with
// that and the trimming above, the Pacific is left only as a margin at both
// edges.
const WIDTH = 960;
// Room for the patch's stitched edge (WorldMapClient's STITCH_INSET) plus
// a little cloth, so no coastline runs under the stitching.
const PADDING = 30;
const projection = geoEqualEarth().rotate([-11, 0]).fitWidth(WIDTH - 2 * PADDING, landFeature);
const [[, top], [, bottom]] = geoPath(projection).bounds(landFeature);

// The height follows from the trimmed land's own shape rather than being
// fixed, so no empty band is left above or below it.
export const WORLD_MAP_VIEWBOX = { width: WIDTH, height: Math.ceil(bottom - top) + 2 * PADDING };
projection.fitExtent(
  [
    [PADDING, PADDING],
    [WIDTH - PADDING, WORLD_MAP_VIEWBOX.height - PADDING],
  ],
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
