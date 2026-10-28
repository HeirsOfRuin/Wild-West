// The map: the real layout of the counties around Kansas City, drawn in SVG.
//
//   Buchanan   DeKalb     Daviess
//   (Buchanan) Clinton    Caldwell
//   Platte     Clay       Ray
//              Jackson    Lafayette
//
// The Missouri River runs down the Kansas line and turns east at Kansas City,
// between Clay/Ray and Jackson/Lafayette. Railroads are drawn where they ran.
// Counties are tinted by sympathy; tap one for its details. Grey counties are
// on the map for the geography only.
//
// Scale: a county is about 22 miles across, drawn about 115 units wide.

import { COUNTIES, TARGETS } from '../data/world.data.js';

const RIVER = [[40, 0], [38, 20], [34, 60], [48, 110], [30, 160], [44, 210], [36, 260], [60, 300], [95, 322], [122, 327],
  [160, 318], [200, 326], [235, 320], [270, 330], [300, 322], [330, 330], [360, 325]];

const SHAPES = {
  buchanan: [[120, 20], [120, 215], [44, 210], [30, 160], [48, 110], [34, 60], [38, 20]],
  platte: [[44, 210], [120, 215], [122, 327], [95, 322], [60, 300], [36, 260]],
  dekalb: [[120, 20], [235, 20], [235, 130], [120, 130]],
  daviess: [[235, 20], [350, 20], [350, 130], [235, 130]],
  clinton: [[120, 130], [235, 130], [235, 215], [120, 215]],
  caldwell: [[235, 130], [350, 130], [350, 215], [235, 215]],
  clay: [[120, 215], [235, 215], [235, 320], [200, 326], [160, 318], [122, 327]],
  ray: [[235, 215], [350, 215], [350, 325], [330, 330], [300, 322], [270, 330], [235, 320]],
  jackson: [[122, 327], [160, 318], [200, 326], [235, 320], [235, 470], [120, 470]],
  lafayette: [[235, 320], [270, 330], [300, 322], [330, 330], [350, 325], [350, 470], [235, 470]],
};
const FILLERS = { platte: 'Platte', dekalb: 'DeKalb', clinton: 'Clinton', caldwell: 'Caldwell' };
// Where each county's name goes; its lines and icons stack below it.
const LABEL = { buchanan: [82, 150], platte: [82, 262], dekalb: [178, 80], daviess: [292, 80], clinton: [178, 176], caldwell: [292, 176],
  clay: [178, 240], ray: [292, 240], jackson: [178, 418], lafayette: [300, 378] };

const TOWNS = [
  { name: 'St. Joseph', x: 52, y: 104, county: 'buchanan', anchor: 'start', dx: 7 },
  { name: 'Gallatin', x: 300, y: 64, county: 'daviess' },
  { name: 'Winston', x: 258, y: 46, county: 'daviess' },
  { name: 'Cameron', x: 232, y: 130, anchor: 'end', dx: -6 },
  { name: 'Liberty', x: 162, y: 302, county: 'clay' },
  { name: 'Richmond', x: 300, y: 302, county: 'ray' },
  { name: 'Kansas City', x: 128, y: 338, county: 'jackson', anchor: 'start', dx: 7 },
  { name: 'Lexington', x: 296, y: 340, county: 'lafayette' },
  { name: 'Blue Cut', x: 196, y: 392, county: 'jackson' },
];

// The Missouri Pacific ran south-east from Kansas City through Johnson County,
// off this map, so it is not drawn.
const RAILS = [
  { name: 'Hannibal & St. Joseph', pts: [[52, 104], [120, 114], [232, 130], [360, 136]] },
  { name: 'Rock Island', pts: [[360, 56], [300, 64], [258, 46], [170, 36], [42, 30]] },
  { name: 'Chicago & Alton', pts: [[128, 338], [196, 392], [240, 430], [300, 446], [360, 450]] },
];

/** A row of small marks under a county's name: the farm, your safe house, you. */
function icons(v, id, here, cx, y) {
  const marks = [];
  if (v.home === id) marks.push((x) => `<rect x="${x - 7}" y="${y + 3}" width="14" height="9" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.3"/><path d="M${x - 9},${y + 3} l9,-7 l9,7z" fill="var(--blood)"/>`);
  const lvl = v.houses[id] || 0;
  if (lvl) marks.push((x) => `<path d="M${x - 8},${y + 4} l8,-7 l8,7 v8 h-16z" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.3"/>${lvl >= 2 ? `<rect x="${x - 2}" y="${y + 6}" width="4" height="6" fill="var(--ink)"/>` : ''}`);
  if (here === id) marks.push((x) => `<text x="${x}" y="${y + 12}" text-anchor="middle" font-size="17" style="fill:var(--blood)">★</text>`);
  const w = 22;
  return `<g pointer-events="none">${marks.map((m, i) => m(cx - ((marks.length - 1) * w) / 2 + i * w)).join('')}</g>`;
}

const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
const poly = (pts) => `${path(pts)} Z`;
const symFill = (v) => (v >= 55 ? 'var(--sym-hi)' : v >= 35 ? 'var(--sym-mid)' : 'var(--sym-lo)');

export function mapSvg(v, selected) {
  const here = v.where === 'farm' ? v.home : v.where;
  const kansas = `<path d="M0,0 ${RIVER.slice(0, 10).map((p) => `L${p[0]},${p[1]}`).join(' ')} L120,470 L0,470 Z" fill="url(#hatch)"/>
    <text x="14" y="390" font-size="11" letter-spacing="3" style="fill:var(--ink-3)" transform="rotate(-90 14 390)">KANSAS</text>`;
  const counties = Object.entries(SHAPES).map(([id, pts]) => {
    if (FILLERS[id]) {
      return `<path d="${poly(pts)}" fill="var(--filler)" stroke="var(--rule-2)" stroke-width="1"/>
        <text x="${LABEL[id][0]}" y="${LABEL[id][1]}" text-anchor="middle" font-size="11" style="fill:var(--ink-3)" font-style="italic">${FILLERS[id]}</text>`;
    }
    const c = COUNTIES.find((k) => k.id === id);
    const sel = selected === id;
    const [x, y] = LABEL[id];
    return `<path d="${poly(pts)}" fill="${symFill(v.sym[id])}" fill-opacity=".42" stroke="${sel ? 'var(--ink)' : 'var(--rule-2)'}" stroke-width="${sel ? 3 : 1}" data-act="county" data-id="${id}" style="cursor:pointer"/>
      <text x="${x}" y="${y}" text-anchor="middle" font-size="13" font-weight="600" pointer-events="none">${c.name.toUpperCase()}</text>
      <text x="${x}" y="${y + 13}" text-anchor="middle" font-size="10" style="fill:var(--ink-2)" pointer-events="none">sympathy ${v.sym[id]}</text>
      ${v.heat[id] >= 5 ? `<text x="${x}" y="${y + 25}" text-anchor="middle" font-size="10" font-weight="600" style="fill:var(--blood)" pointer-events="none">▲ posse heat ${v.heat[id]}</text>` : ''}
      ${icons(v, id, here, x, y + 31)}`;
  }).join('');
  const river = `<path d="${path(RIVER)}" fill="none" stroke="var(--river)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="250" y="316" font-size="9" style="fill:var(--river)" font-style="italic" pointer-events="none">Missouri River</text>`;
  const rails = RAILS.map((r) => `<path d="${path(r.pts)}" fill="none" stroke="var(--ink-2)" stroke-width="1.5"/>
    <path d="${path(r.pts)}" fill="none" stroke="var(--ink-2)" stroke-width="5" stroke-dasharray="1 6"/>`).join('');
  const towns = TOWNS.map((t) => `<circle cx="${t.x}" cy="${t.y}" r="3" fill="var(--ink)"/>
    <text x="${t.x + (t.dx ?? 0)}" y="${t.y + (t.dx ? 4 : -6)}" text-anchor="${t.anchor || 'middle'}" font-size="10" pointer-events="none">${t.name}</text>`).join('');
  const compass = `<g transform="translate(336,496)" pointer-events="none"><path d="M0,-14 l5,12 l-5,-3 l-5,3z" fill="var(--ink)"/><text y="9" text-anchor="middle" font-size="10">N</text></g>`;
  const scale = `<g transform="translate(150,492)" pointer-events="none"><path d="M0,0 h105" stroke="var(--ink)" stroke-width="2"/><path d="M0,-4 v8 M52,-3 v6 M105,-4 v8" stroke="var(--ink)" stroke-width="1.5"/>
    <text x="52" y="14" text-anchor="middle" font-size="10">20 miles</text></g>`;
  return `<svg class="map" viewBox="0 0 360 512" role="img" aria-label="Map of the counties around Kansas City">
    <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="var(--surface-2)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--rule)" stroke-width="2"/></pattern></defs>
    <rect width="360" height="512" fill="var(--surface)"/>
    ${kansas}${counties}${rails}${river}${towns}${compass}${scale}
  </svg>`;
}

/** What can be robbed in a county, for the county panel. */
export const targetsIn = (county) => TARGETS.filter((t) => t.county === county);
