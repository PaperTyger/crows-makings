// The planetary hours as a deal. Seven seats in Chaldean order, one card per
// hour, and whichever seat gets the first card of a day names that day.

const PLANETS = [
  { name: 'Saturn',  glyph: '♄︎' },
  { name: 'Jupiter', glyph: '♃︎' },
  { name: 'Mars',    glyph: '♂︎' },
  { name: 'Sun',     glyph: '☉︎' },
  { name: 'Venus',   glyph: '♀︎' },
  { name: 'Mercury', glyph: '☿︎' },
  { name: 'Moon',    glyph: '☽︎' }
];

function seatOfHour(hour) { return ((hour % 7) + 7) % 7; }
function stepPerDay(hoursPerDay) { return seatOfHour(hoursPerDay); }
function isMorning(hour, hoursPerDay) { return hour % hoursPerDay === 0; }

// The seats the first seven mornings land on.
function weekOrder(hoursPerDay) {
  const order = [];
  for (let d = 0; d < 7; d++) order.push(seatOfHour(d * hoursPerDay));
  return order;
}

function distinctDays(hoursPerDay) { return new Set(weekOrder(hoursPerDay)).size; }

if (typeof module !== 'undefined') {
  module.exports = { PLANETS, seatOfHour, stepPerDay, isMorning, weekOrder, distinctDays };
}
