#!/usr/bin/env node
// Turn a country or region from a GeoJSON file into the OUTLINE and PLACES of the map-story template.
//   node <skill>/scripts/geo-outline.mjs area.geojson [--places places.json] [--feature "Name"] [--box 1000x700]
// area.geojson: a Feature, FeatureCollection or geometry (Polygon or MultiPolygon), lon/lat in degrees, as in Natural
// Earth (public domain: naturalearthdata.com, "Admin 0 – Countries" or "Admin 1 – States, provinces"). With a
// FeatureCollection, --feature picks one feature by any of its property values (its name or ISO code).
// places.json: [{ "name": "Calden", "lat": 9.5, "lon": -13.7, "n": 214 }, …]; n is the real count, 0 for not live.
// Prints the two constants to paste into the template. Runs offline: download the GeoJSON yourself.
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const get = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const file = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!file) { console.error('usage: geo-outline.mjs area.geojson [--places places.json] [--feature "Name"] [--box 1000x700]'); process.exit(1); }
const [W, H] = (get('box') || '1000x700').split('x').map(Number), PAD = 30;

let g = JSON.parse(readFileSync(file, 'utf8'));
if (g.type === 'FeatureCollection') {
  const want = get('feature');
  const f = want ? g.features.find((x) => Object.values(x.properties || {}).some((v) => String(v).toLowerCase() === want.toLowerCase())) : g.features.length === 1 ? g.features[0] : null;
  if (!f) { console.error(want ? `no feature matches "${want}"` : `${g.features.length} features: pick one with --feature "Name"`); process.exit(1); }
  g = f;
}
if (g.type === 'Feature') g = g.geometry;
const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : null;
if (!polys) { console.error(`unsupported geometry: ${g.type}`); process.exit(1); }

// equirectangular, corrected for latitude at the middle of the area, fitted into the box with a margin
const outer = polys.map((p) => p[0]);
const all = outer.flat();
const lat0 = (Math.min(...all.map((c) => c[1])) + Math.max(...all.map((c) => c[1]))) / 2, kx = Math.cos((lat0 * Math.PI) / 180);
const raw = ([lon, lat]) => [lon * kx, -lat];
const xs = all.map((c) => raw(c)[0]), ys = all.map((c) => raw(c)[1]);
const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
const s = Math.min((W - 2 * PAD) / (x1 - x0), (H - 2 * PAD) / (y1 - y0));
const ox = (W - (x1 - x0) * s) / 2, oy = (H - (y1 - y0) * s) / 2;
const proj = (c) => { const [x, y] = raw(c); return [ox + (x - x0) * s, oy + (y - y0) * s]; };

// Douglas–Peucker to about 1.5 px, so the path stays light and draws evenly
const simplify = (pts, eps = 1.5) => {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]]; let dmax = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const d = Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / len; if (d > dmax) { dmax = d; idx = i; }
  }
  return dmax > eps ? [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)] : [a, b];
};
const area = (pts) => Math.abs(pts.reduce((sum, [x, y], i) => { const [u, v] = pts[(i + 1) % pts.length]; return sum + x * v - u * y; }, 0) / 2);
// a closed ring starts and ends on the same point: simplify its two halves, split at the point farthest from the start
const simplifyRing = (pts) => { let far = 0; pts.forEach(([x, y], i) => { if (Math.hypot(x - pts[0][0], y - pts[0][1]) > Math.hypot(pts[far][0] - pts[0][0], pts[far][1] - pts[0][1])) far = i; });
  return [...simplify(pts.slice(0, far + 1)).slice(0, -1), ...simplify(pts.slice(far)).slice(0, -1)]; };
const rings = outer.map((r) => simplifyRing(r.map(proj))).filter((r) => r.length > 3 && area(r) > 40);   // drops specks of islands
const d = rings.map((r) => 'M' + r.map(([x, y]) => `${x.toFixed(0)},${y.toFixed(0)}`).join(' L') + ' Z').join(' ');

console.log(`  const OUTLINE = '${d}';`);
const pf = get('places');
if (pf) {
  const places = JSON.parse(readFileSync(pf, 'utf8')).sort((a, b) => (b.n || 0) - (a.n || 0));
  const rows = places.map((p) => { const [x, y] = proj([p.lon, p.lat]); return `{ name: ${JSON.stringify(p.name)}, x: ${x.toFixed(0)}, y: ${y.toFixed(0)}${p.n ? `, n: ${p.n}, lab: [30, -20]` : ''} }`; });
  console.log(`  const PLACES = [\n    ${rows.join(',\n    ')},\n  ];`);
  console.error('Place each label (lab: [dx, dy] in px) so none covers another, then look at a still of the live beat.');
}
console.error(`path: ${rings.length} ring(s), ${rings.reduce((n, r) => n + r.length, 0)} points. The stroke-dasharray in .land must be longer than the path; raise it if the outline stops short.`);
