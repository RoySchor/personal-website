import { applyMove, BAR, opponent, pipCount } from "./rules.js";

// A simple, quick opponent: plays out every legal play and keeps the one whose final
// position scores best. It values racing lead, made points (especially in its home board
// and as primes), hitting, and keeping single checkers out of reach of direct shots.

const HOME_POINT_VALUE = [0, 1.5, 2, 2.5, 3, 3.5, 3.5];
const BAR_POINT_VALUE = 2.5;
const OTHER_POINT_VALUE = 0.8;
const PRIME_BONUS = 1.5;
const BLOT_DIRECT_SHOT = 0.35;
const BLOT_INDIRECT_SHOT = 0.12;
const OPPONENT_ON_BAR = 4;

export function choosePlay(position, player, plays, random = Math.random) {
  if (plays.length === 0) return [];
  let best = null;
  // Many plays are the same moves in a different order; score each end position once.
  const seen = new Set();
  for (const play of plays) {
    const end = play.reduce(
      (current, move) => applyMove(current, player, move),
      position,
    );
    const key = `${end.points[0]}|${end.points[1]}|${end.bar}|${end.off}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // A whisper of noise so equal choices don't always look identical.
    const score = evaluate(end, player) + random() * 0.01;
    if (!best || score > best.score) best = { play, score };
  }
  return best.play;
}

export function evaluate(position, player) {
  const rival = opponent(player);
  const own = position.points[player];
  let score = pipCount(position, rival) - pipCount(position, player);
  score += position.bar[rival] * OPPONENT_ON_BAR;

  let run = 0;
  for (let point = 1; point <= 24; point++) {
    if (own[point] >= 2) {
      score +=
        point <= 6
          ? HOME_POINT_VALUE[point]
          : point === 7
            ? BAR_POINT_VALUE
            : OTHER_POINT_VALUE;
      run++;
      if (run >= 3) score += PRIME_BONUS;
    } else {
      run = 0;
    }
    if (own[point] === 1) score -= blotRisk(position, player, point);
  }
  return score;
}

// Rough cost of leaving a single checker on `point`: the pips it would lose if hit,
// scaled by whether a rival checker sits within direct (1-6) or indirect (7-12) range.
function blotRisk(position, player, point) {
  const rival = opponent(player);
  const theirs = position.points[rival];
  let nearest = position.bar[rival] > 0 ? point : Infinity;
  // A rival checker on their point q is at our point 25 - q and moves toward our 24.
  for (let q = 1; q <= 24; q++) {
    if (theirs[q] === 0) continue;
    const distance = point - (BAR - q);
    if (distance > 0) nearest = Math.min(nearest, distance);
  }
  const chance = nearest <= 6 ? BLOT_DIRECT_SHOT : nearest <= 12 ? BLOT_INDIRECT_SHOT : 0;
  return chance * (BAR - point);
}
