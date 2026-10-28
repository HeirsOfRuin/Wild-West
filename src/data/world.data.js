// The map: six western Missouri counties, their towns and what can be robbed in
// them. Logic-free tables; the engine reads them, the UI reads them through the
// engine.
//
// Sympathy bases follow the war: Clay, Lafayette and Jackson were bushwhacker
// country ("Little Dixie" runs east along the river through Lafayette); Daviess
// and Buchanan had more Union men and more railroad money. The numbers are a
// design reading of that, not a measured history.

export const COUNTIES = [
  { id: 'clay', name: 'Clay', town: 'Liberty', base: 72, southern: true,
    note: 'Home. The family farm is near Kearney. Old bushwhacker country.' },
  { id: 'jackson', name: 'Jackson', town: 'Kansas City', base: 52, southern: true,
    note: 'A growing city with a big bank, a police force and the railroads.' },
  { id: 'ray', name: 'Ray', town: 'Richmond', base: 55, southern: true,
    note: 'River farms and kin of the war. A country bank on the square.' },
  { id: 'lafayette', name: 'Lafayette', town: 'Lexington', base: 64, southern: true,
    note: 'Little Dixie. Hemp money and long memories.' },
  { id: 'daviess', name: 'Daviess', town: 'Gallatin', base: 36, southern: false,
    note: 'Union men, the Rock Island line, and Samuel Cox, who killed Bloody Bill Anderson.' },
  { id: 'buchanan', name: 'Buchanan', town: 'St. Joseph', base: 30, southern: false,
    note: 'A river city on the Hannibal & St. Joseph. Lawmen, telegraph and strangers.' },
];

// Who borders whom for an escape ride. A ride to a non-neighbour is a long ride.
export const LINKS = [
  ['clay', 'jackson'], ['clay', 'ray'], ['clay', 'buchanan'], ['clay', 'daviess'],
  ['ray', 'daviess'], ['ray', 'lafayette'], ['jackson', 'lafayette'], ['buchanan', 'daviess'],
];

// Schematic map positions (col, row) on a 3x3 grid. Fillers are the counties in
// between that are not playable, drawn grey so the geography still reads.
export const MAP = {
  cells: [
    { id: 'buchanan', c: 0, r: 0 }, { id: 'clinton', c: 1, r: 0, filler: 'Clinton' }, { id: 'daviess', c: 2, r: 0 },
    { id: 'platte', c: 0, r: 1, filler: 'Platte' }, { id: 'clay', c: 1, r: 1 }, { id: 'ray', c: 2, r: 1 },
    { id: 'jackson', c: 1, r: 2 }, { id: 'lafayette', c: 2, r: 2 },
  ],
};

// Target kinds. Cash ranges are 1866-1882 dollars. Real takes were smaller than
// legend says: Gallatin 1869 about $700, Adair 1873 about $3,000, Otterville 1876
// about $15,000, Northfield 1876 $26, Glendale 1879 about $6,000.
export const KINDS = {
  bank: { name: 'Bank', verb: 'rob the bank', guardExtra: 0, reward: 300, pink: 4 },
  train: { name: 'Train', verb: 'stop the train', guardExtra: 1, reward: 600, pink: 15 },
  stage: { name: 'Stagecoach', verb: 'stop the stage', guardExtra: 0, reward: 150, pink: 1 },
};

// guard: armed men at the money (cashier's pistol, express messengers, a time lock).
// fight: how hard the town or the passengers fight back once they know.
// cash: [low, high] in dollars. from: first year it can be robbed.
export const TARGETS = [
  { id: 'liberty-bank', county: 'clay', kind: 'bank', name: 'Clay County Savings Association, Liberty',
    cash: [2000, 7000], guard: 0, fight: 1 },
  { id: 'liberty-stage', county: 'clay', kind: 'stage', name: 'Liberty to Kansas City stage',
    cash: [200, 1000], guard: 0, fight: 0 },
  { id: 'kc-bank', county: 'jackson', kind: 'bank', name: 'First National Bank, Kansas City',
    cash: [6000, 16000], guard: 3, fight: 3 },
  { id: 'blue-cut', county: 'jackson', kind: 'train', name: 'Chicago & Alton at Blue Cut',
    cash: [1500, 8000], guard: 1, fight: 0, from: 1873 },
  { id: 'richmond-bank', county: 'ray', kind: 'bank', name: 'Hughes & Mason Bank, Richmond',
    cash: [1500, 6000], guard: 1, fight: 1 },
  { id: 'richmond-stage', county: 'ray', kind: 'stage', name: 'Richmond to Lexington stage',
    cash: [200, 1000], guard: 0, fight: 0 },
  { id: 'lexington-bank', county: 'lafayette', kind: 'bank', name: 'Alexander Mitchell & Co., Lexington',
    cash: [2000, 6000], guard: 1, fight: 1 },
  { id: 'lexington-stage', county: 'lafayette', kind: 'stage', name: 'Lexington river-road stage',
    cash: [200, 900], guard: 0, fight: 0 },
  { id: 'gallatin-bank', county: 'daviess', kind: 'bank', name: 'Daviess County Savings, Gallatin',
    cash: [500, 3000], guard: 0, fight: 2 },
  { id: 'winston', county: 'daviess', kind: 'train', name: 'Rock Island line at Winston',
    cash: [1000, 6000], guard: 1, fight: 0, from: 1873 },
  { id: 'stjoe-bank', county: 'buchanan', kind: 'bank', name: 'State Savings Bank, St. Joseph',
    cash: [6000, 14000], guard: 3, fight: 3 },
  { id: 'hannibal', county: 'buchanan', kind: 'train', name: 'Hannibal & St. Joseph express',
    cash: [2000, 9000], guard: 2, fight: 0, from: 1873 },
];

// Northfield, Minnesota: offered once, in late summer 1876, by Bill Chadwell.
// The rumour is what the gang heard; the truth is what the town was.
export const NORTHFIELD = {
  id: 'northfield', county: 'minnesota', kind: 'bank', name: 'First National Bank, Northfield, Minnesota',
  cash: [12000, 18000], guard: 3, fight: 3,
  rumour: { guard: 0, fight: 0, note: 'Chadwell says it is a sleepy Yankee town holding a carpetbagger general\'s money.' },
  far: true,
};

export const CASH_BAND = (lo, hi) => `$${lo.toLocaleString('en-US')}–$${hi.toLocaleString('en-US')}`;
