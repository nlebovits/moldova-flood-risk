/**
 * Minimal point-in-polygon (ray casting) for assigning portfolio parcels to
 * raioane. No deps; handles GeoJSON Polygon and MultiPolygon. Good enough for
 * the demo's point→raion join (the PORTFOLIO stub).
 */

type Ring = [number, number][];
type Position = [number, number];

function inRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** True if [lon, lat] falls inside a Polygon (outer ring minus holes). */
function inPolygon(pt: Position, rings: Ring[]): boolean {
  if (rings.length === 0 || !inRing(pt[0], pt[1], rings[0])) return false;
  for (let h = 1; h < rings.length; h++) {
    if (inRing(pt[0], pt[1], rings[h])) return false; // inside a hole
  }
  return true;
}

interface Geometry {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coordinates: any;
}

/** True if [lon, lat] falls inside a Polygon or MultiPolygon geometry. */
export function pointInGeometry(lon: number, lat: number, geom: Geometry): boolean {
  const pt: Position = [lon, lat];
  if (geom.type === 'Polygon') {
    return inPolygon(pt, geom.coordinates as Ring[]);
  }
  if (geom.type === 'MultiPolygon') {
    return (geom.coordinates as Ring[][]).some((poly) => inPolygon(pt, poly));
  }
  return false;
}
