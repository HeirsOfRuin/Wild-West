// "The State": at most one item a season about Missouri beyond your gang.
// Dated items run in their season. An effect is read by the engine (season.js
// stateMods) and the item's text says what it does. Filler runs on about one
// season in three when nothing dated is due.
//
// Sources: Settle, Jesse James Was His Name; Stiles, Last Rebel; Parrish et al.,
// Missouri: The Heart of the Nation. Dates are to the season.

export const STATE_NEWS = [
  { y: 1866, q: 1, text: 'The Radical legislature keeps the Ironclad Oath: no man who aided the rebellion may vote, preach, teach or practise law. Half of Little Dixie cannot vote.' },
  { y: 1867, q: 2, text: 'Work begins on a railroad bridge over the Missouri at Kansas City. The town that gets the bridge gets the West.' },
  { y: 1868, q: 2, text: 'Grant is elected President. Missouri goes Republican, with most of its rebels barred from the polls.' },
  { y: 1869, q: 1, text: 'The Hannibal Bridge opens at Kansas City, the first across the Missouri. Kansas City will outgrow St. Joseph now.' },
  { y: 1870, q: 2, text: 'The Liberal Republicans and the Democrats carry the state for Gratz Brown. The test oath is struck down; ex-Confederates vote again.' },
  { y: 1872, q: 0, text: 'County courts across the state are fighting the railroad bonds they voted in the boom. In Cass County a mob has killed the officials who sold theirs.' },
  { y: 1872, q: 2, text: 'The Kansas City Industrial Exposition draws thirty thousand people. Someone robs the gate.' },
  { y: 1873, q: 2, text: 'Panic. Jay Cooke & Company has failed in Philadelphia and banks are closing from New York to St. Louis. Country banks hold less cash than they did (bank cash x0.7 through 1874).',
    effect: { bankCash: 0.7, until: 1874 } },
  { y: 1874, q: 1, text: 'The Grange is in every county: farmers organising against the railroads and their freight rates. A train robber is half a hero to them (train jobs please Southern counties twice as much, 1874-76).',
    effect: { symTrainX: 2, until: 1876 } },
  { y: 1874, q: 2, text: 'Charles Hardin, a Democrat, is elected governor. The Radicals are finished in Missouri.' },
  { y: 1875, q: 0, text: 'In Jefferson City a bill to grant amnesty to the James and Younger boys for wartime acts nearly passes. Your kind of men have friends in the legislature (+5 sympathy everywhere if your legend is 40 or more).',
    effect: { amnesty: 5, legendAtLeast: 40 } },
  { y: 1875, q: 2, text: 'A new state constitution is adopted. It forbids counties to lend their credit to railroads ever again.' },
  { y: 1876, q: 1, text: 'The Centennial. Fireworks in St. Louis, speeches in every courthouse square about a nation healed.' },
  { y: 1877, q: 1, text: 'The great railroad strike reaches St. Louis: the workers hold the city for a week. Nobody in Missouri loves a railroad this year (train jobs +3 sympathy everywhere, 1877).',
    effect: { strike: 3, until: 1877 } },
  { y: 1878, q: 2, text: 'Yellow fever in Memphis and down the river. Steamboats are turned away from the landings.' },
  { y: 1879, q: 1, text: 'The Kansas Exodus: hundreds of freed families pass through St. Louis on their way to Kansas, without food or money.' },
  { y: 1880, q: 2, text: 'Thomas Crittenden is elected governor, promising the railroads he will end the outlaw business in Missouri.' },
  { y: 1882, q: 0, text: 'The railroads have strung telegraph wire along every line. A robbery is known at every station within the hour.' },
];

// Filler: quiet lines with no effect, picked by the season's stream.
export const STATE_FILLER = [
  (y) => `Wheat brings ${(0.8 + ((y * 7) % 9) / 20).toFixed(2)} a bushel in St. Louis this season.`,
  () => 'A hard frost in the river counties. The tobacco is in early.',
  () => 'The Missouri is high. Two ferries lost at Lexington.',
  () => 'Camp meetings along the Fishing River draw a thousand souls.',
  () => 'Cattle drives from Texas reach Kansas City. The stockyards are full and the saloons are fuller.',
  () => 'Sheriffs in three counties have asked the governor for rifles.',
  () => 'A drought in the upland counties. Corn is dear.',
  () => 'The county fair at Liberty: horse races, a balloon ascension and a fist fight.',
];
