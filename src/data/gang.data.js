// The people: backgrounds, the tables men are generated from, the historical
// men who turn up in their years, gear, traits.
//
// Skills (gun, nerve, horse) run 1-4. Gear adds half a point a tier.
// Every trait is read by the engine (test/traits.test.js).

export const BACKGROUNDS = [
  { id: 'bushwhacker', name: 'Rode with Quantrill',
    text: 'You learned to rob and kill in the brush war. Men know your name already, and so does the law.',
    bonus: { gun: 1 }, legend: 15, southern: 5, reward: 300, purse: 0, companions: 3, loyalty: 0, home: 0 },
  { id: 'farmer', name: "Farmer's son",
    text: 'You know every road and every family in your county. They know you too, and like you.',
    bonus: { horse: 1 }, legend: 8, southern: 0, reward: 0, purse: 200, companions: 3, loyalty: 0, home: 10 },
  { id: 'cavalry', name: 'Confederate cavalry',
    text: 'You rode with Shelby and kept your head under fire. Men follow a soldier.',
    bonus: { nerve: 1 }, legend: 10, southern: 0, reward: 0, purse: 0, companions: 3, loyalty: 10, home: 0 },
  { id: 'drifter', name: 'Drifter',
    text: 'Back from Texas with money in your boot and no roots. Nobody owes you anything.',
    bonus: {}, legend: 8, southern: 0, reward: 0, purse: 600, companions: 4, loyalty: 0, home: -10 },
];

export const FIRST_NAMES = ['John', 'William', 'James', 'George', 'Thomas', 'Henry', 'Charles', 'Samuel', 'Robert', 'Joseph',
  'Andrew', 'Lewis', 'Wesley', 'Calvin', 'Jesse', 'Frank', 'Cole', 'Elias', 'Abner', 'Isaac', 'Jasper', 'Nathan', 'Wiley',
  'Hiram', 'Silas', 'Ambrose', 'Rufus', 'Otis', 'Lafe', 'Arch', 'Tom', 'Dick', 'Ike', 'Zeke', 'Bud', 'Clint'];
export const SURNAMES = ['Miller', 'Pence', 'Shepherd', 'Maddox', 'Hughes', 'Ballard', 'Wigginton', 'Hulse', 'Gregg', 'Todd',
  'Pool', 'Hendricks', 'Bassham', 'Ryan', 'Harper', 'Crabtree', 'Lockhart', 'Tackett', 'Purcell', 'Rutledge', 'Askew',
  'Dalton', 'Cooley', 'Bledsoe', 'Gaines', 'Holt', 'Kimbrough', 'Ledbetter', 'Mosby', 'Price'];
export const WOMEN = ['Mary', 'Sarah', 'Martha', 'Nancy', 'Elizabeth', 'Susan', 'Lucinda', 'Zerelda', 'Annie', 'Ellen', 'Josie', 'Belle'];

// Starting companions: the player picks from five of these.
export const COMPANION_KINDS = [
  { id: 'brother', rel: 'your brother', kin: true, sameName: true, stats: [2, 2, 2], loyalty: 85,
    pitch: 'Older than you, and calmer.' },
  { id: 'cousin', rel: 'your cousin', kin: true, sameName: false, stats: [2, 2, 2], loyalty: 75,
    pitch: 'Quarrelsome, but blood.' },
  { id: 'warfriend', rel: 'rode with you in the war', stats: [3, 2, 1], loyalty: 62,
    pitch: 'He has killed men and sleeps fine.' },
  { id: 'neighbour', rel: "a neighbour's son", stats: [1, 1, 3], loyalty: 60, young: true,
    pitch: 'Seventeen, the best rider in the county, and he thinks you are a hero.' },
  { id: 'hand', rel: 'a hired hand from the farm', stats: [1, 2, 2], loyalty: 55,
    pitch: 'He has nothing, and he knows you pay.' },
];

// Generated recruits come in these kinds. Weight is relative; better kinds need legend.
export const RECRUIT_KINDS = [
  { id: 'veteran', weight: 3, legend: 0, stats: [[2, 3], [1, 3], [1, 2]], loyalty: [45, 60],
    pitch: ['Rode with Shelby. Cannot find work that does not involve a Yankee boss.', 'Lost his farm to the bushwhacker taxes. Good with a pistol.'] },
  { id: 'farmhand', weight: 4, legend: 0, stats: [[1, 2], [1, 2], [1, 3]], loyalty: [45, 60],
    pitch: ['A farm boy who wants more than a mule and a plough.', 'Strong, quiet, and broke.'] },
  { id: 'horsethief', weight: 2, legend: 15, stats: [[1, 2], [1, 2], [3, 3]], loyalty: [35, 50], traits: ['drinker'],
    pitch: ['Steals horses in Kansas and sells them in Missouri. Can ride anything.'] },
  { id: 'gambler', weight: 2, legend: 20, stats: [[1, 2], [2, 3], [1, 2]], loyalty: [35, 50], traits: ['greedy'],
    pitch: ['Cool hands at a card table and at a bank counter.'] },
  { id: 'gunman', weight: 1, legend: 35, stats: [[3, 4], [2, 3], [1, 2]], loyalty: [40, 55], traits: ['hothead'],
    pitch: ['Has killed two men in Texas. Wants a name of his own.'] },
  { id: 'admirer', weight: 2, legend: 30, stats: [[1, 2], [1, 2], [1, 2]], loyalty: [40, 55], traits: ['ambitious', 'young'],
    pitch: ['Knows every story about you by heart and asks too many questions.'] },
];

// The historical men, offered once each in their years if your legend has reached them.
export const KNOWN_MEN = [
  { id: 'cole', name: 'Cole Younger', short: 'Cole', from: 1866, legend: 15, kin: 'younger', gun: 3, nerve: 3, horse: 2, traits: ['greedy'], loyalty: 58,
    pitch: 'Rode with Quantrill. Big, clever, proud, and he wants a fair share.' },
  { id: 'jim', name: 'Jim Younger', short: 'Jim Y.', from: 1868, legend: 20, kin: 'younger', gun: 2, nerve: 2, horse: 2, traits: [], loyalty: 55,
    pitch: "Cole's brother. Steadier than he looks." },
  { id: 'bob', name: 'Bob Younger', short: 'Bob Y.', from: 1873, legend: 25, kin: 'younger', gun: 2, nerve: 1, horse: 3, traits: ['young'], loyalty: 58,
    pitch: "The youngest Younger. Wants to ride where his brothers ride." },
  { id: 'clell', name: 'Clell Miller', short: 'Clell', from: 1869, legend: 15, kin: 'miller', gun: 2, nerve: 2, horse: 2, traits: [], loyalty: 60,
    pitch: 'Clay County boy, rode with Bloody Bill at fifteen.' },
  { id: 'pitts', name: 'Charlie Pitts', short: 'Pitts', from: 1874, legend: 30, gun: 2, nerve: 2, horse: 1, traits: ['steady'], loyalty: 55,
    pitch: 'A hard man from the war who calls himself Sam Wells.' },
  { id: 'chadwell', name: 'Bill Chadwell', short: 'Chadwell', from: 1876, legend: 30, gun: 2, nerve: 1, horse: 2, traits: ['greedy'], loyalty: 50,
    pitch: 'Grew up in Minnesota. Says he knows banks up there fat with Yankee money.' },
  { id: 'liddil', name: 'Dick Liddil', short: 'Liddil', from: 1879, legend: 30, gun: 2, nerve: 1, horse: 3, traits: ['drinker'], loyalty: 45,
    pitch: 'A horse thief with quick hands and a loose mouth.' },
  { id: 'charley', name: 'Charley Ford', short: 'Charley', from: 1880, legend: 40, kin: 'ford', gun: 1, nerve: 1, horse: 2, traits: [], loyalty: 50,
    pitch: 'Quiet, sickly, eager to be useful. His little brother follows him everywhere.' },
  { id: 'bobford', name: 'Bob Ford', short: 'Bob Ford', from: 1880, legend: 40, kin: 'ford', gun: 2, nerve: 2, horse: 1, traits: ['ambitious', 'young'], loyalty: 48,
    pitch: 'Nineteen. Knows every story about you by heart and asks too many questions.' },
];

export const TRAITS = {
  hothead: 'Quick to shoot inside. Raises the chance a cashier or messenger is killed.',
  steady: 'Cool at the counter. Lowers the chance of a killing inside.',
  greedy: 'Counts every dollar. Shares, pay and the reward weigh half again as much with him.',
  young: 'Feels everything harder: good news and bad move his loyalty further.',
  drinker: 'Talks in saloons. Raises the chance an informer hears where you are.',
  ambitious: 'Wants to be the man who did something. If he turns, he does not just talk.',
};

// Gear: tiers 0-2 for horse and gun. Each tier adds half a skill point.
export const GEAR = {
  horse: [
    { name: 'a farm horse', cost: 0 },
    { name: 'a good saddle horse', cost: 120 },
    { name: 'a blooded Kentucky horse', cost: 350 },
  ],
  gun: [
    { name: 'an old cap-and-ball revolver', cost: 0 },
    { name: 'a brace of Navy Colts', cost: 80 },
    { name: "a Winchester '73 and a Colt", cost: 250, from: 1873 },
  ],
};

export const SAFE_HOUSE = [
  { level: 1, name: 'A safe house', cost: 400, text: 'A family paid to hide you and keep quiet.' },
  { level: 2, name: 'A hidden room and fresh horses', cost: 500, text: 'A cellar under the smokehouse and two fast horses in the barn.' },
];
