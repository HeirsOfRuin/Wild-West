// Incidents: things that happen to you and ask a question. At most one waits at
// a time; it must be answered before the season's action.
//
// when(s, ctx) decides whether it can happen now and binds who and where:
//   return null, or { who: [ids], county, target }.  ctx gives helpers.
// Options carry effects as data; src/engine/incidents.js reads every key and
// refuses unknown ones, so nothing here can be decoration.
//
// Effect keys:
//   purse           dollars (negative = cost; the option is locked if you cannot pay)
//   sym             { here | all | south | <county>: n }   'here' = the bound county
//   heat            { here | <county>: n }
//   legend, reward, pinkerton, cover          numbers
//   loyalty         { who: n, other: n, all: n }   who = first bound man, other = second
//   leaveIn         seasons until the bound man goes home with your blessing
//   offer           'stranger' adds a man looking for you
//   tip             a tip-target id, open this season
//   intel           'train': a train target scouted for you this year
//   reveal          'approached': men the Pinkertons have approached become suspected
//   ride            true: you leave the quiet life (retirement ends)
//   restart         true: the quiet years start again
//   exposed         true: recognition this season is doubled
//   childRisk       chance a sick child dies
//   chance          { p, win: {effects}, lose: {effects}, winText, loseText }
//   bot             the reference bot's preference (higher first); not an effect

export const INCIDENTS = [
  // ---- while riding --------------------------------------------------------
  {
    id: 'widow', title: 'A widow and the bank', weight: 3,
    when: (s, c) => (c.hideCounty ? { county: c.hideCounty } : null),
    text: (b) => `A widow near your hideout in ${b.countyName} County will lose her farm to the bank on Monday. Everyone knows you are in the county.`,
    options: [
      { id: 'pay', label: 'Pay off her mortgage', effects: { purse: -200, sym: { here: 8 } }, bot: 2 },
      { id: 'no', label: 'It is not your affair', effects: { sym: { here: -2 } }, bot: 1 },
    ],
  },
  {
    id: 'sheriff', title: 'The sheriff wants a cut', weight: 2,
    when: (s, c) => { const k = c.hottest(20); return k ? { county: k } : null; },
    text: (b) => `The sheriff of ${b.countyName} County sends word through a cousin: for $150 his posse will search the wrong creeks.`,
    options: [
      { id: 'pay', label: 'Pay him', effects: { purse: -150, heat: { here: -30 } }, bot: 3 },
      { id: 'threaten', label: 'Send word back that he has a family too', effects: { heat: { here: 15 }, legend: 3, sym: { here: -3 } }, bot: 0 },
      { id: 'no', label: 'Ignore him', effects: {}, bot: 1 },
    ],
  },
  {
    id: 'interview', title: 'A newspaperman', weight: 2, minLegend: 25,
    when: () => ({}),
    text: () => 'A reporter from the St. Louis Dispatch wants to meet you in a barn and write you up. He promises not to say which barn.',
    options: [
      { id: 'yes', label: 'Talk to him', effects: { legend: 6, reward: 400, sym: { south: 2 } }, bot: 1 },
      { id: 'no', label: 'Send him away', effects: {}, bot: 2 },
    ],
  },
  {
    id: 'quarrel', title: 'Two of your men quarrel', weight: 3,
    when: (s, c) => { const two = c.twoFollowers(); return two ? { who: two } : null; },
    text: (b) => `${b.names[0]} and ${b.names[1]} came to blows over a horse, a girl or a hand of cards. Each wants you to say he was right.`,
    options: [
      { id: 'first', label: (b) => `Side with ${b.shorts[0]}`, effects: { loyalty: { who: 10, other: -12 } }, bot: 1 },
      { id: 'second', label: (b) => `Side with ${b.shorts[1]}`, effects: { loyalty: { who: -12, other: 10 } }, bot: 1 },
      { id: 'shake', label: 'Make them shake hands', effects: { loyalty: { who: -3, other: -3 } }, bot: 2 },
    ],
  },
  {
    id: 'races', title: 'Races at the county fair', weight: 2, season: [1, 2],
    when: (s, c) => ({ county: c.homeCounty }),
    text: (b) => `There are horse races at the ${b.countyName} County fair. Half the county will be there, and your horse is faster than theirs.`,
    options: [
      { id: 'bet', label: 'Race and bet $100', effects: { legend: 2, chance: { p: 0.5, win: { purse: 200 }, lose: { purse: -100 }, winText: 'You win by a length. The county cheers.', loseText: 'A Kentucky horse from Liberty beats you by a nose.' } }, bot: 1 },
      { id: 'no', label: 'Stay away from crowds', effects: {}, bot: 2 },
    ],
  },
  {
    id: 'veteran', title: 'A Union veteran knows your face', weight: 2, minLegend: 20,
    when: (s, c) => (c.hideCounty ? { county: c.hideCounty } : null),
    text: (b) => `In a store in ${b.countyName} County a man with a Grand Army badge looks at you a long time. He fought at Centralia.`,
    options: [
      { id: 'pay', label: 'Buy his silence ($100)', effects: { purse: -100 }, bot: 2 },
      { id: 'threaten', label: 'Tell him what happens to men who talk', effects: { heat: { here: 20 }, legend: 2 }, bot: 0 },
      { id: 'ride', label: 'Ride on and hope', effects: { reward: 300, heat: { here: 10 } }, bot: 1 },
    ],
  },
  {
    id: 'pinkspy', title: 'A Pinkerton man for sale', weight: 2, needPink: true,
    when: () => ({}),
    text: () => 'A Pinkerton operative who drinks too much says he will sell you the names of the men his agency has talked to.',
    options: [
      { id: 'pay', label: 'Pay him $200', effects: { purse: -200, reveal: 'approached' }, bot: 2 },
      { id: 'no', label: 'It is a trap', effects: {}, bot: 1 },
    ],
  },
  {
    id: 'stranger', title: 'A wounded stranger', weight: 2,
    when: () => ({}),
    text: () => 'A man with a bullet in his shoulder turns up at your hideout. He rode with Bloody Bill and says he has nowhere else to go.',
    options: [
      { id: 'take', label: 'Take him in', effects: { purse: -50, offer: 'stranger' }, bot: 2 },
      { id: 'send', label: 'Send him on', effects: {}, bot: 1 },
    ],
  },
  {
    id: 'girl', title: 'A girl from home', weight: 2,
    when: (s, c) => { const m = c.oneFollower((x) => !x.kin); return m ? { who: [m] } : null; },
    text: (b) => `${b.names[0]} wants to marry a girl from home. She wants him to give up the life within the year.`,
    options: [
      { id: 'bless', label: 'Give your blessing', effects: { loyalty: { who: 15 }, leaveIn: 4 }, bot: 1 },
      { id: 'forbid', label: 'Tell him the gang comes first', effects: { loyalty: { who: -10 } }, bot: 2 },
    ],
  },
  {
    id: 'preacher', title: 'A preacher speaks against you', weight: 2, minLegend: 20,
    when: (s, c) => ({ county: c.homeCounty }),
    text: (b) => `The Methodist preacher in ${b.countyName} County preached against "the bandits among us" on Sunday. People listened.`,
    options: [
      { id: 'give', label: 'Give $100 to his church', effects: { purse: -100, sym: { here: 5 } }, bot: 2 },
      { id: 'ignore', label: 'Ignore him', effects: { sym: { here: -3 } }, bot: 1 },
    ],
  },
  {
    id: 'agent', title: 'A railroad agent', weight: 2, from: 1873,
    when: () => ({}),
    text: () => 'An express agent at Cameron, behind on his debts, will tell you which train carries a full safe this year.',
    options: [
      { id: 'pay', label: 'Pay him $300', effects: { purse: -300, intel: 'train' }, bot: 2 },
      { id: 'no', label: 'Do not trust him', effects: {}, bot: 1 },
    ],
  },
  {
    id: 'tip-paymaster', title: 'The paymaster', weight: 2, to: 1876,
    when: () => ({}),
    text: () => 'A sutler says the army paymaster from Fort Leavenworth crosses Clay County next week with the garrison\'s pay and a small escort.',
    options: [
      { id: 'pay', label: 'Pay him $50 for the day and the road', effects: { purse: -50, tip: 'paymaster' }, bot: 2 },
      { id: 'no', label: 'Soldiers shoot back', effects: {}, bot: 1 },
    ],
  },
  {
    id: 'tip-tax', title: 'The tax collector', weight: 2,
    when: () => ({}),
    text: () => 'The Daviess County collector rides to Gallatin with the railroad-bond taxes this season. Nobody in the county will weep for him.',
    options: [
      { id: 'take', label: 'Mark the day', effects: { tip: 'taxman' }, bot: 2 },
      { id: 'no', label: 'Leave it', effects: {}, bot: 1 },
    ],
  },
  {
    id: 'tip-boat', title: 'A steamboat at Lexington', weight: 2,
    when: () => ({}),
    text: () => 'A packet bound for St. Louis ties up at the Lexington landing overnight with cattle buyers aboard, their money in the clerk\'s safe.',
    options: [
      { id: 'take', label: 'Mark the night', effects: { tip: 'steamboat' }, bot: 2 },
      { id: 'no', label: 'Leave it', effects: {}, bot: 1 },
    ],
  },

  // ---- the quiet years -----------------------------------------------------
  {
    id: 'q-letter', title: 'A letter from an old friend', weight: 3, retired: true,
    when: (s, c) => { const m = c.oneGone(); return m ? { who: [m] } : null; },
    text: (b) => `${b.names[0]} writes to Mr. Howard. Times are hard. He does not say what he will do if you do not help; he does not have to.`,
    options: [
      { id: 'pay', label: 'Send $300', effects: { purse: -300, loyalty: { who: 20 } }, bot: 2 },
      { id: 'refuse', label: 'Burn the letter', effects: { loyalty: { who: -20 } }, bot: 0 },
      { id: 'move', label: 'Move house before he comes', effects: { purse: -200, cover: -20 }, bot: 1 },
    ],
  },
  {
    id: 'q-stare', title: 'A man in the feed store', weight: 3, retired: true,
    when: () => ({}),
    text: () => 'A stranger in the feed store looked at you twice and asked the clerk your name.',
    options: [
      { id: 'move', label: 'Move the family to another town', effects: { purse: -200, cover: -25 }, bot: 1 },
      { id: 'stay', label: 'Stay. Plenty of men look like you.', effects: { exposed: true }, bot: 2 },
    ],
  },
  {
    id: 'q-grain', title: 'Grain futures', weight: 2, retired: true,
    when: (s) => (s.purse >= 1500 ? {} : null),
    text: () => 'A broker in town says wheat will double by spring. Mr. Howard has money and needs an honest-looking income.',
    options: [
      { id: 'buy', label: 'Put in $1,000', effects: { chance: { p: 0.45, win: { purse: 1000, cover: 5 }, lose: { purse: -1000 }, winText: 'Wheat goes up. Mr. Howard is a shrewd man.', loseText: 'Wheat goes down. So does $1,000.' } }, bot: 0 },
      { id: 'no', label: 'Keep your money in a coffee can', effects: {}, bot: 2 },
    ],
  },
  {
    id: 'q-itch', title: 'The itch', weight: 2, retired: true,
    when: () => ({}),
    text: () => 'A man you knew in the old days finds you. He has a job planned, an easy one, and he needs a man who knows how.',
    options: [
      { id: 'ride', label: 'Ride once more', effects: { ride: true, purse: 600, legend: 4, reward: 500 }, bot: 0 },
      { id: 'no', label: 'Tell him you are a farmer now', effects: { cover: 3 }, bot: 2 },
    ],
  },
  {
    id: 'q-sick', title: 'A child is sick', weight: 2, retired: true,
    when: (s) => (s.family.some((f) => f.core && f.alive && (f.rel === 'son' || f.rel === 'daughter')) ? {} : null),
    text: () => 'One of the children has the fever. The doctor in town asks questions about where a family comes from.',
    options: [
      { id: 'doctor', label: 'Send for the doctor ($100)', effects: { purse: -100, exposed: true }, bot: 2 },
      { id: 'nurse', label: 'Nurse the child yourselves', effects: { childRisk: 0.15 }, bot: 1 },
    ],
  },
  {
    id: 'q-deacon', title: 'The church asks Mr. Howard', weight: 2, retired: true,
    when: () => ({}),
    text: () => 'The Baptist church wants Mr. Howard for a deacon. Deacons stand at the front, where people see them.',
    options: [
      { id: 'yes', label: 'Accept', effects: { cover: 15, exposed: true }, bot: 1 },
      { id: 'no', label: 'Decline politely', effects: {}, bot: 2 },
    ],
  },
  {
    id: 'q-circular', title: 'Pinkerton circulars', weight: 2, retired: true, needPink: true,
    when: () => ({}),
    text: () => 'Circulars with a drawing of a man who looks a good deal like you are nailed up at the depot.',
    options: [
      { id: 'indoors', label: 'Stay home a season ($200 of business lost)', effects: { purse: -200 }, bot: 2 },
      { id: 'carry', label: 'Carry on as usual', effects: { exposed: true }, bot: 1 },
    ],
  },
];

// Tip targets: one season only, opened by an incident.
export const TIP_TARGETS = [
  { id: 'paymaster', county: 'clay', kind: 'stage', kindName: 'Army payroll', name: "The army paymaster's wagon, Clay County road",
    cash: [3000, 8000], guard: 2, fight: 0, tip: true, symSouth: 3, symLocal: 0, reward: 1500 },
  { id: 'taxman', county: 'daviess', kind: 'stage', kindName: 'Tax collector', name: 'The Daviess County tax collector',
    cash: [800, 2500], guard: 0, fight: 0, tip: true, symSouth: 0, symLocal: 4, reward: 300 },
  { id: 'steamboat', county: 'lafayette', kind: 'stage', kindName: 'Steamboat', name: 'A packet boat at the Lexington landing',
    cash: [1500, 5000], guard: 1, fight: 1, tip: true, symSouth: 0, symLocal: -4, reward: 500 },
  { id: 'exposition', county: 'jackson', kind: 'bank', kindName: 'Fair gate', name: 'The Kansas City Exposition gate',
    cash: [1000, 3000], guard: 1, fight: 2, tip: true, symSouth: 0, symLocal: -6, reward: 600 },
];
