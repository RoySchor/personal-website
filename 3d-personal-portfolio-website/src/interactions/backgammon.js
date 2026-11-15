import * as THREE from "three";

import { choosePlay } from "../backgammon/ai.js";
import { readBoardLayout } from "../backgammon/boardLayout.js";
import { createCheckers, createDice, createMarkers } from "../backgammon/pieces.js";
import {
  applyMove,
  BAR,
  BLACK,
  CHECKERS_PER_PLAYER,
  legalPlays,
  movesForDie,
  newPosition,
  nextMoves,
  OFF,
  RED,
  rollDie,
  winner,
} from "../backgammon/rules.js";

// A playable backgammon board on the side table. The visitor is red; the computer opponent
// is black. Checkers are called "stones" in everything the visitor reads.
//
// At load the modelled white checkers are swapped for coloured copies in the same jumbled
// spots. Tapping the board zooms in (main.js owns the camera hand-off) and, the first time,
// the checkers hop into the starting position. Leaving keeps the game exactly as it is;
// coming back continues it. Only a page reload brings back the jumble.

const STATUS_ID = "backgammon-status";
const CONTROLS_ID = "backgammon-controls";
// A press that drags further than this is an orbit, not a tap.
const TAP_SLOP_PX = 8;
const COMPUTER_PAUSE_MS = 650;
const COMPUTER_MOVE_GAP_MS = 520;
const NO_MOVES_PAUSE_MS = 1400;
// How long "no possible moves, skipping" stays up before play passes on.
const SKIP_PAUSE_MS = 1900;
const RESTART_CONFIRM_MS = 3000;
// The camera looks straight down. A hair off vertical keeps "up" on screen defined (at
// exactly vertical, lookAt and OrbitControls can't tell which way the board should face).
const VIEW_TILT = THREE.MathUtils.degToRad(1);
// Breathing room around the board: across the screen, and top-to-bottom where the status
// bar and buttons sit.
const VIEW_MARGIN_WIDTH = 1.06;
const VIEW_MARGIN_HEIGHT = 1.2;

export function createBackgammon({ root, scene, camera, ray, surfaces, onOpen }) {
  const layout = readBoardLayout(root, camera);
  if (!layout) return null;

  const colorOf = jumbleColors(layout);
  const checkers = createCheckers({ layout, colorOf });
  const dice = createDice({ layout });
  const markers = createMarkers({ layout });
  scene.add(checkers.mesh, ...dice.meshes, markers.group);
  // The coloured copies replace the modelled checkers from the first frame.
  layout.checkerMesh.visible = false;
  layout.checkerMesh.layers.disableAll();

  const status = createStatus(() => startNewGame());
  const controls = createControls({
    onUndo: () => undo(),
    onRestart: () => startNewGame(),
  });
  const hitBox = new THREE.Box3().copy(layout.boardBox).expandByScalar(0.01);
  const boardPlane = new THREE.Plane(layout.up.clone(), -layout.surfaceY);
  const planeHit = new THREE.Vector3();

  let active = false;
  let game = null;
  let selected = null;
  let downAt = null;
  // Bumped on every new game or undo so a computer turn in flight stops touching the board.
  let generation = 0;
  // The game as it was just before each of the visitor's moves, newest last.
  let history = [];

  for (const surface of surfaces) {
    surface.addEventListener(
      "pointerdown",
      (e) => (downAt = { x: e.clientX, y: e.clientY }),
    );
  }

  // --- Room toy interface (used while not zoomed in) ---

  function isPointedAt(e) {
    return ray.pointsAt(e, {
      box: hitBox,
      target: [layout.board, checkers.mesh],
      scene: root,
    });
  }

  function hoverAt(e) {
    return isPointedAt(e);
  }

  // Part of the room-toy interface; the board keeps no hover state of its own.
  function clearHover() {}

  function tapAt(e) {
    if (!isPointedAt(e)) return false;
    onOpen();
    return true;
  }

  // --- Zoomed-in play ---

  function activate() {
    active = true;
    if (!game) startNewGame();
    else showTurnStatus();
    status.show();
    controls.show();
    refreshHighlights();
  }

  function deactivate() {
    active = false;
    selected = null;
    status.hide();
    controls.hide();
    refreshHighlights();
  }

  // Camera pose straight above the board, framing it for the current screen shape.
  function cameraPose() {
    const size = layout.boardBox.getSize(new THREE.Vector3());
    const screenWidth = Math.abs(size.dot(layout.right));
    const screenHeight = Math.abs(size.dot(layout.toVisitor));
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    // The board is held level and the right way round on every screen: phones in
    // portrait zoom out until its full width fits rather than turning it.
    const distance = Math.max(
      (screenHeight / 2 / Math.tan(vFov / 2)) * VIEW_MARGIN_HEIGHT,
      (screenWidth / 2 / Math.tan(hFov / 2)) * VIEW_MARGIN_WIDTH,
    );
    const target = layout.center.clone().setY(layout.surfaceY);
    const position = target
      .clone()
      .addScaledVector(layout.up, distance * Math.cos(VIEW_TILT))
      .addScaledVector(layout.toVisitor, distance * Math.sin(VIEW_TILT));
    return { position, target, distance };
  }

  function slotFromEvent(e) {
    if (!ray.rayFor(e).intersectPlane(boardPlane, planeHit)) return null;
    return layout.slotAt(planeHit);
  }

  function wasDrag(e) {
    if (!downAt) return false;
    return Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > TAP_SLOP_PX;
  }

  // Returns false when the tap missed the board, which main.js treats as "leave".
  function handleTap(e) {
    const slot = slotFromEvent(e);
    if (slot === null) return wasDrag(e);
    if (wasDrag(e) || !game) return true;

    if (game.phase === "opening" || game.phase === "await-roll") {
      rollForTurn();
      return true;
    }
    if (game.phase !== "moving") return true;

    const options = currentOptions();
    if (selected !== null) {
      const move = options.find((m) => m.from === selected && m.to === slot);
      if (move) {
        playVisitorMove(move);
        return true;
      }
    }
    selected = options.some((m) => m.from === slot) && slot !== selected ? slot : null;
    if (selected === null && game.position.bar[RED] > 0) selected = BAR;
    showTurnStatus();
    refreshHighlights();
    return true;
  }

  function handleHover(e) {
    if (!game) return false;
    const slot = slotFromEvent(e);
    if (slot === null) return false;
    if (game.phase === "opening" || game.phase === "await-roll") return true;
    if (game.phase !== "moving") return false;
    const options = currentOptions();
    return options.some((m) => m.from === slot || (m.from === selected && m.to === slot));
  }

  // The visitor's legal next moves. Doubles can have thousands of plays, so this is worked
  // out once per move rather than on every hover and tap. It is keyed on the play list and
  // the moves-made array itself, since undo swaps in a different array of the same length.
  let optionsCache = { plays: null, made: null, count: -1, moves: [] };
  function currentOptions() {
    const { plays, made } = game;
    if (
      optionsCache.plays !== plays ||
      optionsCache.made !== made ||
      optionsCache.count !== made.length
    ) {
      optionsCache = { plays, made, count: made.length, moves: nextMoves(plays, made) };
    }
    return optionsCache.moves;
  }

  // --- Game flow ---

  function startNewGame() {
    generation++;
    selected = null;
    history = [];
    dice.hide();
    // The first 15 red and 15 black jumbled checkers play; any extras shrink away.
    const ids = [[], []];
    for (let i = 0; i < checkers.count; i++) {
      const color = colorOf(i);
      if (ids[color].length < CHECKERS_PER_PLAYER) ids[color].push(i);
      else checkers.setVisible(i, false);
    }
    const position = newPosition();
    const stacks = [RED, BLACK].map((player) => {
      const pool = ids[player].slice();
      const slots = new Map();
      for (let point = 24; point >= 1; point--) {
        const count = position.points[player][point];
        if (count) slots.set(point, pool.splice(0, count));
      }
      slots.set(BAR, []);
      slots.set(OFF, []);
      return slots;
    });
    game = {
      position,
      stacks,
      phase: "opening",
      roll: null,
      plays: [],
      made: [],
      winner: null,
    };
    for (const player of [RED, BLACK]) {
      for (const [slot] of stacks[player])
        layoutSlot(player, slot, { hop: true, stagger: true });
    }
    showTurnStatus();
    refreshHighlights();
  }

  async function rollForTurn() {
    const myGeneration = generation;
    if (game.phase === "opening") {
      game.phase = "rolling";
      const roll = [rollDie(), rollDie()];
      status.set(`Rolling for who goes first…`);
      await dice.roll(roll, RED);
      if (myGeneration !== generation) return;
      if (roll[0] === roll[1]) {
        game.phase = "opening";
        status.set(`Both rolled ${roll[0]}. Tap the board to roll again.`);
        return;
      }
      const first = roll[0] > roll[1] ? RED : BLACK;
      status.set(
        `You rolled ${roll[0]}, your opponent ${roll[1]}. ${first === RED ? "You go" : "Your opponent goes"} first.`,
      );
      await wait(900);
      if (myGeneration !== generation) return;
      startTurn(first, roll, { alreadyRolled: true });
      return;
    }
    game.phase = "rolling";
    // Once new dice are rolled, undo only reaches moves made with them; going back past a
    // roll would let the visitor re-roll a bad one.
    history = [];
    const roll = [rollDie(), rollDie()];
    await dice.roll(roll, RED);
    if (myGeneration !== generation) return;
    startTurn(RED, roll, { alreadyRolled: true });
  }

  async function startTurn(player, roll, { alreadyRolled = false } = {}) {
    const myGeneration = generation;
    if (!alreadyRolled) {
      await dice.roll(roll, player);
      if (myGeneration !== generation) return;
    }
    game.roll = roll;
    game.made = [];
    game.plays = legalPlays(game.position, player, roll);
    syncDiceUsed();
    if (game.plays.length === 0) {
      status.set(
        `${player === RED ? "You have" : "Your opponent has"} no legal moves for ${roll.join(" and ")}.`,
      );
      await wait(NO_MOVES_PAUSE_MS);
      if (myGeneration !== generation) return;
      return player === RED ? computerTurn() : visitorTurn();
    }
    if (player === BLACK) return playComputer();
    game.phase = "moving";
    selected = game.position.bar[RED] > 0 ? BAR : null;
    showTurnStatus();
    refreshHighlights();
  }

  // True if some roll would let `player` move. When no roll can (say, a stone on the bar
  // against a fully closed home board), rolling is pointless and the turn is skipped.
  function canMoveAtAll(player) {
    for (let die = 1; die <= 6; die++) {
      if (movesForDie(game.position, player, die).length > 0) return true;
    }
    return false;
  }

  async function skipTurn(player) {
    const myGeneration = generation;
    game.phase = "skipping";
    dice.hide();
    status.set(
      player === RED
        ? "You have no possible moves, so your turn is skipped."
        : "Your opponent has no possible moves, so their turn is skipped.",
    );
    refreshHighlights();
    await wait(SKIP_PAUSE_MS);
    if (myGeneration !== generation) return;
    if (player === RED) computerTurn();
    else visitorTurn();
  }

  function visitorTurn() {
    if (!canMoveAtAll(RED)) return skipTurn(RED);
    game.phase = "await-roll";
    showTurnStatus();
    refreshHighlights();
  }

  async function computerTurn() {
    if (!canMoveAtAll(BLACK)) return skipTurn(BLACK);
    const myGeneration = generation;
    game.phase = "computer";
    showTurnStatus();
    refreshHighlights();
    await wait(COMPUTER_PAUSE_MS);
    if (myGeneration !== generation) return;
    startTurn(BLACK, [rollDie(), rollDie()]);
  }

  async function playComputer() {
    const myGeneration = generation;
    game.phase = "computer";
    showTurnStatus();
    const play = choosePlay(game.position, BLACK, game.plays);
    for (const move of play) {
      await wait(COMPUTER_MOVE_GAP_MS);
      if (myGeneration !== generation) return;
      performMove(BLACK, move);
      if (game.winner !== null) return;
    }
    await wait(COMPUTER_MOVE_GAP_MS);
    if (myGeneration !== generation) return;
    visitorTurn();
  }

  function playVisitorMove(move) {
    history.push(snapshot());
    performMove(RED, move);
    selected = null;
    if (game.winner !== null) return;
    if (currentOptions().length === 0) {
      computerTurn();
      return;
    }
    if (game.position.bar[RED] > 0) selected = BAR;
    showTurnStatus();
    refreshHighlights();
  }

  function performMove(player, move) {
    const rival = 1 - player;
    const fromStack = game.stacks[player].get(move.from);
    const id = fromStack.pop();
    if (!game.stacks[player].has(move.to)) game.stacks[player].set(move.to, []);
    game.stacks[player].get(move.to).push(id);
    if (move.hit) {
      const rivalPoint = BAR - move.to;
      const hitId = game.stacks[rival].get(rivalPoint).pop();
      game.stacks[rival].get(BAR).push(hitId);
      layoutSlot(rival, rivalPoint);
      layoutSlot(rival, BAR, { hop: true, delay: 0.2 });
    }
    game.position = applyMove(game.position, player, move);
    game.made.push(move);
    layoutSlot(player, move.from);
    layoutSlot(player, move.to, { hop: true, only: id });
    syncDiceUsed();

    game.winner = winner(game.position);
    if (game.winner !== null) {
      generation++;
      game.phase = "over";
      dice.hide();
      showTurnStatus();
    }
    refreshHighlights();
  }

  // Places every checker of one slot; `only` hops just the moving checker.
  function layoutSlot(
    player,
    slot,
    { hop = false, delay = 0, stagger = false, only = null } = {},
  ) {
    const stack = game.stacks[player].get(slot) ?? [];
    stack.forEach((id, index) => {
      const target = layout.checkerPosition(player, slot, index, stack.length);
      checkers.setVisible(id, true);
      checkers.moveTo(id, target, {
        hop: hop && (only === null || only === id),
        duration: stagger ? 0.55 : 0.35,
        delay: stagger ? Math.random() * 0.35 : delay,
      });
    });
  }

  function snapshot() {
    return {
      position: game.position,
      stacks: game.stacks.map(
        (slots) => new Map([...slots].map(([k, ids]) => [k, ids.slice()])),
      ),
      roll: game.roll,
      plays: game.plays,
      made: game.made.slice(),
    };
  }

  function canUndo() {
    return (
      Boolean(game) && history.length > 0 && !["opening", "rolling"].includes(game.phase)
    );
  }

  // Takes back the visitor's last move. If the opponent has played since, their turn goes
  // too, so the visitor is back where they were before that move, with the same dice.
  function undo() {
    if (!canUndo()) return;
    generation++;
    const before = history.pop();
    Object.assign(game, before, { phase: "moving", winner: null });
    selected = game.position.bar[RED] > 0 ? BAR : null;
    dice.place(game.roll, RED);
    syncDiceUsed();
    for (const player of [RED, BLACK]) {
      for (const [slot] of game.stacks[player]) layoutSlot(player, slot);
    }
    showTurnStatus();
    refreshHighlights();
  }

  // Greys out dice as they're spent; with doubles each die stands for two moves.
  function syncDiceUsed() {
    if (!game.roll) return;
    const used = game.made.length;
    if (game.roll[0] === game.roll[1]) {
      dice.setUsed(0, used >= 2);
      dice.setUsed(1, used >= 4);
      return;
    }
    const usedDice = game.made.map((m) => m.die);
    const first = usedDice.indexOf(game.roll[0]);
    dice.setUsed(0, first !== -1);
    dice.setUsed(
      1,
      usedDice.some((die, i) => die === game.roll[1] && i !== first),
    );
  }

  function showTurnStatus() {
    if (!game) return;
    const left = game.made.length;
    const messages = {
      opening: "You're red. Tap the board to roll for who goes first.",
      "await-roll": "Your turn. Tap the board to roll.",
      computer: "Opponent's turn…",
      rolling: "",
      over: game.winner === RED ? "You win! 🎉" : "Your opponent wins this one.",
    };
    if (game.phase === "moving") {
      const dicePart =
        game.roll[0] === game.roll[1]
          ? `double ${game.roll[0]}s`
          : game.roll.join(" and ");
      status.set(
        selected === null
          ? `You rolled ${dicePart}. Tap a ringed stone${left ? " to keep going" : ""}.`
          : "Tap a spot marked with a dot to move there, or pick another stone.",
      );
    } else if (messages[game.phase]) {
      status.set(messages[game.phase]);
    }
    status.setNewGameVisible(game.phase === "over");
  }

  // Rings the stones that can move, lifts and rings the picked-up one, and marks where it
  // can land. Markers sit just above a stone's top face.
  function refreshHighlights() {
    for (let i = 0; i < checkers.count; i++) checkers.setLift(i, 0);
    markers.show();
    if (!active || !game || game.phase !== "moving") return;
    const options = currentOptions();
    const stacks = game.stacks[RED];
    const topOf = (slot) => stacks.get(slot)?.at(-1);
    const above = (spot, lift = 0) =>
      spot.setY(spot.y + layout.thickness / 2 + lift + 0.0008);
    const restingSpot = (slot) => {
      const stack = stacks.get(slot);
      return layout.checkerPosition(RED, slot, stack.length - 1, stack.length);
    };
    if (selected === null) {
      const movable = [...new Set(options.map((m) => m.from))]
        .filter((from) => topOf(from) !== undefined)
        .map((from) => above(restingSpot(from)));
      markers.show({ movable });
      return;
    }
    const lift = layout.thickness * 1.5;
    if (topOf(selected) !== undefined) checkers.setLift(topOf(selected), lift);
    const target = options
      .filter((m) => m.from === selected)
      .map((m) => {
        const count = m.hit ? 0 : (stacks.get(m.to)?.length ?? 0);
        return above(layout.checkerPosition(RED, m.to, count, count + 1));
      });
    markers.show({ selected: [above(restingSpot(selected), lift)], target });
  }

  function update(dt) {
    checkers.update(dt);
    dice.update(dt);
    markers.update(dt);
    controls.setUndoEnabled(canUndo());
  }

  return {
    hoverAt,
    clearHover,
    tapAt,
    update,
    activate,
    deactivate,
    cameraPose,
    handleTap,
    handleHover,
    isActive: () => active,
  };
}

// Gives the jumbled checkers believable colours: every checker on a point shares a colour,
// alternating from point to point, so the scatter reads like a game in progress. Colours are
// rebalanced so each side has at least 15 to play with.
function jumbleColors(layout) {
  const slots = layout.checkerIslands.map((island, i) => {
    const slot = layout.slotAt(island.center);
    return typeof slot === "number" ? slot : `loose-${i}`;
  });
  const groups = [...new Set(slots)];
  const colorOfGroup = new Map(groups.map((g, i) => [g, i % 2]));
  const colors = slots.map((slot) => colorOfGroup.get(slot));
  // At most one colour can be short (there are 30+ checkers). Top it up one checker at a
  // time from the other colour, which keeps at least 15 because the total is at least 30.
  const groupSize = (slot) => slots.filter((s) => s === slot).length;
  for (const color of [RED, BLACK]) {
    const spare = colors
      .map((c, i) => i)
      .filter((i) => colors[i] !== color)
      .sort((a, b) => groupSize(slots[a]) - groupSize(slots[b]));
    while (colors.filter((c) => c === color).length < CHECKERS_PER_PLAYER) {
      colors[spare.shift()] = color;
    }
  }
  return (i) => colors[i];
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Undo and Restart, always on screen while playing: down the left edge on wide screens,
// along the bottom-left on phones (the Exit button sits bottom-right there). Restart asks
// for a second tap rather than a dialog, so a stray tap can't wipe a game.
function createControls({ onUndo, onRestart }) {
  // Rebuilt on every call, so a dev hot reload replaces the old panel instead of stacking
  // a second set of click handlers on it.
  document.getElementById(CONTROLS_ID)?.remove();
  document.getElementById(`${CONTROLS_ID}-style`)?.remove();
  const style = document.createElement("style");
  style.id = `${CONTROLS_ID}-style`;
  style.textContent = `
    #${CONTROLS_ID} {
      position: fixed;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 99998;
      display: none;
      flex-direction: column;
      gap: 8px;
    }
    #${CONTROLS_ID} button {
      min-width: 84px;
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.3);
      background: rgba(0,0,0,0.6);
      color: #fff;
      font: 500 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      backdrop-filter: blur(6px);
      cursor: pointer;
    }
    #${CONTROLS_ID} button:disabled { opacity: 0.4; cursor: default; }
    #${CONTROLS_ID} button.confirming { background: #2f9bff; border-color: #2f9bff; }
    @media (max-width: 1024px) {
      #${CONTROLS_ID} {
        top: auto;
        bottom: 5px;
        left: 10px;
        transform: none;
        flex-direction: row;
      }
      #${CONTROLS_ID} button { min-width: 0; font-size: 13px; padding: 7px 10px; }
    }
  `;
  document.head.appendChild(style);
  const panel = document.createElement("div");
  panel.id = CONTROLS_ID;
  panel.innerHTML = `<button type="button" data-action="undo">Undo</button><button type="button" data-action="restart">Restart</button>`;
  document.body.appendChild(panel);
  const undoButton = panel.querySelector('[data-action="undo"]');
  const restartButton = panel.querySelector('[data-action="restart"]');
  let confirmTimer = 0;

  const resetRestart = () => {
    window.clearTimeout(confirmTimer);
    confirmTimer = 0;
    restartButton.textContent = "Restart";
    restartButton.classList.remove("confirming");
  };

  undoButton.addEventListener("click", onUndo);
  restartButton.addEventListener("click", () => {
    if (confirmTimer) {
      resetRestart();
      onRestart();
      return;
    }
    restartButton.textContent = "Confirm restart";
    restartButton.classList.add("confirming");
    confirmTimer = window.setTimeout(resetRestart, RESTART_CONFIRM_MS);
  });

  return {
    setUndoEnabled: (enabled) => {
      if (undoButton.disabled === !enabled) return;
      undoButton.disabled = !enabled;
    },
    show: () => (panel.style.display = "flex"),
    hide: () => {
      resetRestart();
      panel.style.display = "none";
    },
  };
}

function createStatus(onNewGame) {
  // Rebuilt on every call, so a dev hot reload replaces the old panel instead of stacking
  // a second set of click handlers on it.
  document.getElementById(STATUS_ID)?.remove();
  document.getElementById(`${STATUS_ID}-style`)?.remove();
  const style = document.createElement("style");
  style.id = `${STATUS_ID}-style`;
  style.textContent = `
    #${STATUS_ID} {
      position: fixed;
      top: 12px;
      left: 0;
      right: 0;
      margin-inline: auto;
      width: max-content;
      z-index: 99998;
      display: none;
      align-items: center;
      gap: 10px;
      max-width: min(560px, calc(100vw - 32px));
      padding: 8px 14px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.3);
      background: rgba(0,0,0,0.6);
      color: #fff;
      font: 500 14px/1.35 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      text-align: center;
      backdrop-filter: blur(6px);
      box-sizing: border-box;
    }
    #${STATUS_ID} button {
      flex: none;
      padding: 6px 10px;
      border-radius: 8px;
      border: 0;
      background: #fff;
      color: #111;
      font: inherit;
      cursor: pointer;
    }
    @media (max-width: 1024px) {
      #${STATUS_ID} { top: 10px; font-size: 13px; }
    }
  `;
  document.head.appendChild(style);
  const panel = document.createElement("div");
  panel.id = STATUS_ID;
  panel.innerHTML = `<span></span><button type="button">New game</button>`;
  document.body.appendChild(panel);
  const text = panel.querySelector("span");
  const button = panel.querySelector("button");
  button.addEventListener("click", onNewGame);
  return {
    set: (message) => (text.textContent = message),
    setNewGameVisible: (visible) => (button.style.display = visible ? "" : "none"),
    show: () => (panel.style.display = "flex"),
    hide: () => (panel.style.display = "none"),
  };
}
