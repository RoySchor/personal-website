// Backgammon rules, independent of rendering.
//
// Each player counts points from their own side: point 24 is where their back checkers
// start and 1-6 is their home board, so every player moves from high numbers to low. The
// same physical point is `p` for one player and `25 - p` for the other. A move `from` the
// bar is written as from = BAR (25); a move bearing off is written as to = OFF (0).

export const RED = 0;
export const BLACK = 1;
export const BAR = 25;
export const OFF = 0;
export const CHECKERS_PER_PLAYER = 15;

const START = { 24: 2, 13: 5, 8: 3, 6: 5 };

export const opponent = (player) => 1 - player;

export function newPosition() {
  const points = [RED, BLACK].map(() => {
    const own = new Array(26).fill(0);
    for (const [point, count] of Object.entries(START)) own[point] = count;
    return own;
  });
  return { points, bar: [0, 0], off: [0, 0] };
}

export function clonePosition({ points, bar, off }) {
  return { points: points.map((own) => own.slice()), bar: bar.slice(), off: off.slice() };
}

export function rollDie(random = Math.random) {
  return 1 + Math.floor(random() * 6);
}

// Doubles are played four times.
export function diceToPlay([a, b]) {
  return a === b ? [a, a, a, a] : [a, b];
}

export function winner(position) {
  if (position.off[RED] === CHECKERS_PER_PLAYER) return RED;
  if (position.off[BLACK] === CHECKERS_PER_PLAYER) return BLACK;
  return null;
}

export function pipCount(position, player) {
  const own = position.points[player];
  let pips = position.bar[player] * BAR;
  for (let point = 1; point <= 24; point++) pips += own[point] * point;
  return pips;
}

function opponentCountAt(position, player, point) {
  return position.points[opponent(player)][BAR - point];
}

function allHome(position, player) {
  if (position.bar[player] > 0) return false;
  const own = position.points[player];
  for (let point = 7; point <= 24; point++) if (own[point] > 0) return false;
  return true;
}

// Every single-die move `player` can make with `die`.
export function movesForDie(position, player, die) {
  const own = position.points[player];
  const moves = [];
  const tryMove = (from) => {
    const to = from - die;
    if (to >= 1) {
      const blockers = opponentCountAt(position, player, to);
      if (blockers < 2) moves.push({ from, to, die, hit: blockers === 1 });
      return;
    }
    if (!allHome(position, player)) return;
    // Bearing off with a higher die than needed is only allowed from the highest point.
    if (to < 0) {
      for (let point = from + 1; point <= 6; point++) if (own[point] > 0) return;
    }
    moves.push({ from, to: OFF, die, hit: false });
  };

  if (position.bar[player] > 0) {
    tryMove(BAR);
    return moves;
  }
  for (let from = 24; from >= 1; from--) if (own[from] > 0) tryMove(from);
  return moves;
}

export function applyMove(position, player, { from, to, hit }) {
  const next = clonePosition(position);
  if (from === BAR) next.bar[player]--;
  else next.points[player][from]--;
  if (to === OFF) {
    next.off[player]++;
    return next;
  }
  next.points[player][to]++;
  if (hit) {
    next.points[opponent(player)][BAR - to]--;
    next.bar[opponent(player)]++;
  }
  return next;
}

// All complete plays for a roll, as lists of moves. A play must use as many dice as
// possible; if only one die of a non-double can be used, it must be the larger one when
// that is playable.
export function legalPlays(position, player, roll) {
  const plays = [];
  const seen = new Set();

  const explore = (current, remaining, sequence) => {
    let moved = false;
    for (const die of new Set(remaining)) {
      const rest = remaining.slice();
      rest.splice(rest.indexOf(die), 1);
      for (const move of movesForDie(current, player, die)) {
        moved = true;
        explore(applyMove(current, player, move), rest, [...sequence, move]);
      }
    }
    if (moved || sequence.length === 0) return;
    const key = sequence.map((m) => `${m.from}/${m.to}/${m.die}`).join(" ");
    if (!seen.has(key)) {
      seen.add(key);
      plays.push(sequence);
    }
  };
  explore(position, diceToPlay(roll), []);

  const longest = Math.max(0, ...plays.map((play) => play.length));
  let best = plays.filter((play) => play.length === longest);
  if (longest === 1 && roll[0] !== roll[1]) {
    const higher = Math.max(...roll);
    const withHigher = best.filter((play) => play[0].die === higher);
    if (withHigher.length > 0) best = withHigher;
  }
  return best;
}

// Narrows the plays still available after `movesMade`, and lists the next moves.
export function remainingPlays(plays, movesMade) {
  return plays.filter((play) =>
    movesMade.every(
      (move, i) =>
        play[i] &&
        play[i].from === move.from &&
        play[i].to === move.to &&
        play[i].die === move.die,
    ),
  );
}

export function nextMoves(plays, movesMade) {
  const step = movesMade.length;
  const unique = new Map();
  for (const play of remainingPlays(plays, movesMade)) {
    const move = play[step];
    if (!move) continue;
    const key = `${move.from}/${move.to}`;
    // Bearing off can be legal with more than one die; spend the smallest.
    if (!unique.has(key) || move.die < unique.get(key).die) unique.set(key, move);
  }
  return [...unique.values()];
}
