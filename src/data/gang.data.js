// The gang: the men who rode, with the skills the engine reads.
//
// gun   1-3  street work: holding a town, a gunfight on the road
// nerve 1-3  inside work: a cashier, an express messenger, a vault
// horse 1-3  holding horses and outriding a posse
// kin        a family group. Kin read each other, share grief, and never sell
//            their own (loyalty has a floor, see CONFIG.kinFloor).
// traits     see TRAITS below; every one is read by the engine.
// joins      the first year he can be recruited. Starting members have none.
//
// Skills are a design reading of the men's reputations, not a record.

export const GANG = [
  { id: 'jesse', name: 'Jesse James', short: 'Jesse', leader: true, kin: 'james',
    gun: 3, nerve: 2, horse: 3, traits: ['hothead'], loyalty: 100 },
  { id: 'frank', name: 'Frank James', short: 'Frank', kin: 'james',
    gun: 2, nerve: 3, horse: 2, traits: ['steady'], loyalty: 85 },
  { id: 'cole', name: 'Cole Younger', short: 'Cole', kin: 'younger',
    gun: 3, nerve: 3, horse: 2, traits: ['greedy'], loyalty: 62 },
  { id: 'jim', name: 'Jim Younger', short: 'Jim', kin: 'younger',
    gun: 2, nerve: 2, horse: 2, traits: [], loyalty: 60 },
  { id: 'bob', name: 'Bob Younger', short: 'Bob Y.', kin: 'younger',
    gun: 2, nerve: 1, horse: 3, traits: ['young'], loyalty: 64 },
  { id: 'clell', name: 'Clell Miller', short: 'Clell', kin: 'miller',
    gun: 2, nerve: 2, horse: 2, traits: [], loyalty: 66 },
  { id: 'cummins', name: 'Jim Cummins', short: 'Cummins',
    gun: 1, nerve: 1, horse: 2, traits: ['drinker'], loyalty: 50 },
];

export const RECRUITS = [
  { id: 'pitts', name: 'Charlie Pitts', short: 'Pitts', joins: 1874,
    gun: 2, nerve: 2, horse: 1, traits: ['steady'], loyalty: 55,
    pitch: 'A hard man from the war who calls himself Sam Wells.' },
  { id: 'chadwell', name: 'Bill Chadwell', short: 'Chadwell', joins: 1876,
    gun: 2, nerve: 1, horse: 2, traits: ['greedy'], loyalty: 50,
    pitch: 'Grew up in Minnesota. Says he knows banks up there fat with Yankee money.' },
  { id: 'liddil', name: 'Dick Liddil', short: 'Liddil', joins: 1879,
    gun: 2, nerve: 1, horse: 3, traits: ['drinker'], loyalty: 45,
    pitch: 'A horse thief with quick hands and a loose mouth.' },
  { id: 'hite', name: 'Wood Hite', short: 'Hite', joins: 1879, kin: 'james',
    gun: 2, nerve: 2, horse: 2, traits: [], loyalty: 60,
    pitch: 'Your cousin from Kentucky. Quarrelsome, but blood.' },
  { id: 'edmiller', name: 'Ed Miller', short: 'Ed', joins: 1879, kin: 'miller',
    gun: 1, nerve: 2, horse: 2, traits: ['young'], loyalty: 50,
    pitch: "Clell's younger brother. Wants to ride where Clell rode." },
  { id: 'charley', name: 'Charley Ford', short: 'Charley', joins: 1880, kin: 'ford',
    gun: 1, nerve: 1, horse: 2, traits: [], loyalty: 50,
    pitch: 'Quiet, sickly, eager to be useful. His little brother follows him everywhere.' },
  { id: 'bobford', name: 'Bob Ford', short: 'Bob Ford', joins: 1880, kin: 'ford',
    gun: 2, nerve: 2, horse: 1, traits: ['ambitious', 'young'], loyalty: 48,
    pitch: 'Nineteen. Knows every story about you by heart and asks too many questions.' },
];

// Every trait is read by the engine (test/traits.test.js proves each one moves
// a game). A trait that only colours text would be decoration.
export const TRAITS = {
  hothead: 'Quick to shoot inside. Raises the chance a cashier or messenger is killed.',
  steady: 'Cool at the counter. Lowers the chance of a killing inside.',
  greedy: 'Counts every dollar. Shares and the reward weigh twice with him.',
  young: 'Feels everything harder: good news and bad move his loyalty further.',
  drinker: 'Talks in saloons. Raises the chance an informant hears where you are.',
  ambitious: 'Wants to be the man who did something. If he turns, he does not just talk.',
};

export const FAMILY = [
  { id: 'mother', name: 'Zerelda Samuel', rel: 'mother', from: 1866 },
  { id: 'archie', name: 'Archie Samuel', rel: 'half-brother', from: 1866, note: 'Born in 1866, your mother\'s youngest.' },
  { id: 'zee', name: 'Zee Mimms James', rel: 'wife', from: 1874, core: true },
  { id: 'jessejr', name: 'Jesse Edward James', rel: 'son', from: 1875, core: true },
  { id: 'mary', name: 'Mary James', rel: 'daughter', from: 1879, core: true },
];
