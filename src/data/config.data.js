// Every tuning number in one place. Words that quote a number (the help screen,
// the plan screen) read it from here, never retype it.

export const CONFIG = {
  startYear: 1866,
  endYear: 1882, // the game ends after winter of this year
  seasons: ['Spring', 'Summer', 'Autumn', 'Winter'],
  startPurse: 400,

  // money (1866-82 dollars)
  livingCost: 40, // each member, each season, out of his own pocket
  leaderLiving: 100, // yours, out of the purse: horses, powder, the family, small bribes
  keepPerMan: 30, // feed, powder and hideouts for each man who rides with you, out of the purse
  safeHouseFee: 50, // paid to the family that hides you
  scoutCost: 40,
  scoutHeat: 8, // a stranger asking questions is remembered
  maxScoutsPerSeason: 2,
  coverCost: { kc: 150, stjoe: 150, nashville: 220 },
  coverGain: { kc: 18, stjoe: 18, nashville: 26 },
  coverJobLoss: 35, // riding out on a job while living as Mr. Howard
  recruitCost: 100,
  retireCost: 200, // per season while retired
  retireNeedPurse: 5000,
  stake: 300, // what a man expects to go home on
  retireNeedCover: 60,
  retireSeasons: 10, // quiet seasons before the world forgets you...
  retireSeasonsPerLegend: 10, // ...plus one more for every 10 points of peak legend

  // safe houses
  safeSym: 35, // a county hides you only at or above this sympathy
  houseSym: 15, // ...or at or above this one where you own a safe house
  houseUpkeep: 20, // per safe house per season, to the family that keeps it
  houseInform: [1, 0.5, 0.25], // informer risk multiplier by safe-house level
  houseCatch: 0.08, // fresh horses at a level-2 house: less chance the posse catches you
  minHouseSym: 20, // nobody will sell or keep a house for you below this

  // the outfit and the rise
  gearStep: 0.5, // skill per gear tier
  skillMax: 4,
  learnChance: 0.15, // a man unhurt on a job may get better at the work he did
  bribePerHeat: 8, // dollars per point of heat to pay off a sheriff (Union counties double)
  doctorCost: 100,
  marryCost: 300,
  farmPurseShare: 0.6, // a farm in another name: retiring needs this share of the cash
  farmCoverX: 1.25, // ...and cover in Tennessee grows this much faster
  farmRecognise: 0.85, // ...and recognition there is this much
  businessCoverGain: 6, // a business where you live: extra cover a season
  businessCostCut: 0.5, // ...and that place's cover costs this share
  rewardFade: 0.995, // the reward each season
  lawyerRewardFade: 0.985, // ...with a lawyer working for you
  hushCost: 250, // money for a man who has gone home
  hushLoyalty: 25,
  childChance: 0.3, // each spring after marrying, up to three children
  incidentRiding: 0.3, // chance something asks a question in a season while riding
  incidentRetired: 0.35, // ...and in a season of the quiet years
  incidentGap: [2, 3], // seasons at least between questions: riding, retired
  recruitOffers: 2, // most new men looking for you in a season
  offerLife: 2, // seasons an offer stands

  // loyalty
  kinFloor: 40,
  loyaltyRest: 55, // gratitude and grudges both fade toward this...
  loyaltyDrift: 0.06, // ...by this share of the gap each season
  brokePenalty: 5,
  shareScale: 150, // loyalty +1 per this many dollars of share, capped
  shareCap: 8,
  leaderCutPenalty: 5,
  comradeDeath: 4,
  kinDeath: 12,
  idlePenalty: 1,
  longIdlePenalty: 3, // after 3 idle seasons
  coverAbsence: 2, // per season you live under cover, non-kin
  prideLegend: 40,
  bonusPer: 25, // +1 loyalty per $25 bonus, capped per season
  bonusCap: 15,
  killMemberFear: 10,

  // betrayal
  betrayBelow: 45,
  betrayRecover: 60,
  rewardScale: 10000, // temptation 1.0 at this reward

  // pressure
  heatDecay: 0.5,
  heatJob: 35,
  heatKill: 20,
  heatNeighbour: 12,
  pinkStartYear: 1874,
  pinkDecay: 0.93,
  pinkDecayCoverAway: 0.8,
  pinkDecayCoverHome: 0.9,
  pinkOpScale: 120, // chance of an operation each season = pinkerton / this
  rewardKill: 1500,
  informScale: 15000,

  // sympathy
  symDrift: 0.06, // share of the gap to baseline closed each season
  warFadeFrom: 1872, // after this year the war matters less each year
  warFadePerYear: 2,
  symBank: 6, // robbing a county's bank costs this much sympathy there
  symHomeBank: 10,
  symStage: 3,
  symTrain: 2, // Southern counties like seeing the railroads robbed
  symKillLocal: 15,
  symKillAll: 5,
  giveScale: 25, // +1 sympathy per $25 given away, halving with each repeat

  // legend
  legendDecay: 2,
  legendFloor: 0.4, // a legend never fades below this share of its peak
  legendSymSouth: 0.15, // baseline sympathy per point of legend, Southern counties
  legendSymNorth: 0.05,
  letterLegend: 5,
  letterSym: 4,
  letterSymNorth: -3,
  letterReward: 500,
  letterCooldown: 4,
};
