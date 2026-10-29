// The law with faces: sheriffs per county, Pinkerton operatives.
// Names are generated from these lists; the first operative is historical.

export const SHERIFF_FIRST = ['John', 'William', 'James', 'Thomas', 'Henry', 'George', 'Samuel', 'Joseph', 'Oscar', 'Moses',
  'Andrew', 'Benjamin', 'Elijah', 'Josiah', 'Nathaniel', 'Reuben'];
export const SHERIFF_LAST = ['Timberlake', 'Patton', 'Groom', 'Thomason', 'McCoy', 'Rogers', 'Bradley', 'Collins', 'Ewing',
  'Garrett', 'Hendley', 'Kerr', 'Lyle', 'Moss', 'Pollard', 'Shaw', 'Turner', 'Wallace', 'Yates', 'Boggs',
  'Sharp', 'Dodd', 'Hixon', 'Peery', 'Craig', 'Settle', 'Duvall', 'Rains', 'Bower', 'Lindsay'];
export const DETECTIVE_NAMES = ['John W. Whicher', 'Louis J. Lull', 'James Wright', 'Joseph Whicher', 'Robert Linden',
  'Frank Warner', 'Charles Angell', 'Patrick Dunn'];

// What a sheriff's lean means for you.
export const LEANS = {
  friendly: { word: 'is friendly to you', posse: -10, bribe: 0.5, fade: 2 },
  neutral: { word: 'does his job', posse: 0, bribe: 1, fade: 1 },
  hostile: { word: 'wants you hanged', posse: 0, bribe: 1.5, fade: 1 },
};
