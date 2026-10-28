// The schematic map: six counties on a 3x3 grid, coloured by sympathy, with
// posse heat as triangles. Drawn as SVG so one string serves every size.

import { COUNTIES, MAP } from '../data/world.data.js';

const W = 120, H = 92;

export function mapSvg(v, where) {
  const here = where === 'farm' ? 'clay' : where;
  const cells = MAP.cells.map((c) => {
    const x = c.c * W, y = c.r * H;
    if (c.filler) {
      return `<g class="filler"><rect x="${x + 2}" y="${y + 2}" width="${W - 4}" height="${H - 4}" fill="var(--filler)" rx="3"/>
        <text x="${x + W / 2}" y="${y + H / 2 + 4}" text-anchor="middle" font-size="12">${c.filler}</text></g>`;
    }
    const county = COUNTIES.find((k) => k.id === c.id);
    const sym = v.sym[c.id];
    const fill = sym >= 55 ? 'var(--sym-hi)' : sym >= 35 ? 'var(--sym-mid)' : 'var(--sym-lo)';
    const heat = Math.ceil(v.heat[c.id] / 25);
    const tri = Array.from({ length: heat }, (_, i) => `<path d="M${x + 12 + i * 14},${y + H - 10} l6,-11 l6,11z" fill="var(--blood)"/>`).join('');
    return `<g><rect x="${x + 2}" y="${y + 2}" width="${W - 4}" height="${H - 4}" fill="${fill}" fill-opacity=".55" stroke="var(--ink-2)" rx="3"/>
      <text x="${x + W / 2}" y="${y + 26}" text-anchor="middle" font-size="15" font-weight="600">${county.name}</text>
      <text x="${x + W / 2}" y="${y + 44}" text-anchor="middle" font-size="12">${county.town}</text>
      <text x="${x + W / 2}" y="${y + 62}" text-anchor="middle" font-size="12">sympathy ${sym}</text>
      ${tri}${here === c.id ? `<text x="${x + W - 16}" y="${y + 22}" text-anchor="middle" font-size="18" fill="var(--blood)">★</text>` : ''}</g>`;
  }).join('');
  // The Missouri River: along the south of Platte, Clay and Ray, north of Jackson and Lafayette.
  const river = `<path d="M10,${2 * H - 4} C${W},${2 * H + 8} ${1.6 * W},${2 * H - 14} ${2 * W},${2 * H - 2} S${3 * W - 10},${2 * H + 6} ${3 * W},${2 * H - 6}" fill="none" stroke="var(--river)" stroke-width="4" stroke-linecap="round"/>`;
  return `<svg class="map" viewBox="0 0 ${3 * W} ${3 * H}" role="img" aria-label="Map of the six counties">${cells}${river}</svg>`;
}
