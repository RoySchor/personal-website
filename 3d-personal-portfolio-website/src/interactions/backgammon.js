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
  newPosition,
  nextMoves,
  OFF,
  RED,
  rollDie,
  winner,
} from "../backgammon/rules.js";

// A playable backgammon board on the side table. The visitor is red, the computer black.
//
// At load the modelled white checkers are swapped for coloured copies in the same jumbled
// spots. Tapping the board zooms in (main.js owns the camera hand-off) and, the first time,
// the checkers hop into the starting position. Leaving keeps the game exactly as it is;
// coming back continues it. Only a page reload brings back the jumble.

const STATUS_ID = "backgammon-status";
// A press that drags further than this is an orbit, not a tap.
const TAP_SLOP_PX = 8;
const COMPUTER_PAUSE_MS = 650;
const COMPUTER_MOVE_GAP_MS = 520;
const NO_MOVES_PAUSE_MS = 1400;
// Camera pitch away from straight down, so the board reads as a table and lookAt is stable.
const VIEW_TILT = THREE.MathUtils.degToRad(16);
const VIEW_MARGIN = 1.12;

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
  const hitBox = new THREE.Box3().copy(layout.boardBox).expandByScalar(0.01);
  const boardPlane = new THREE.Plane(layout.up.clone(), -layout.surfaceY);
  const planeHit = new THREE.Vector3();

  let active = false;
  let hovered = false;
  let game = null;
  let selected = null;
  let downAt = null;
  // Bumped on every new game so a computer turn in flight stops touching the old one.
  let generation = 0;

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
    hovered = isPointedAt(e);
    return hovered;
  }

  function clearHover() {
    hovered = false;
  }

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
    refreshHighlights();
  }

  function deactivate() {
    active = false;
    selected = null;
    status.hide();
    refreshHighlights();
  }

  // Camera pose that frames the board for the current screen shape. On portrait screens
  // the camera looks down the board's length so the points become wider tap targets.
  function cameraPose() {
    const portrait = camera.aspect < 1;
    const size = layout.boardBox.getSize(new THREE.Vector3());
    const longSize = Math.abs(size.dot(layout.right));
    const acrossSize = Math.abs(size.dot(layout.toVisitor));
    const viewFrom = portrait ? layout.right.clone() : layout.toVisitor.clone();
    const screenWidth = portrait ? acrossSize : longSize;
    const screenHeight = portrait ? longSize : acrossSize;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const distance =
      Math.max(
        screenHeight / 2 / Math.tan(vFov / 2),
        screenWidth / 2 / Math.tan(hFov / 2),
      ) * VIEW_MARGIN;
    const target = layout.center.clone().setY(layout.surfaceY);
    const position = target
      .clone()
      .addScaledVector(layout.up, distance * Math.cos(VIEW_TILT))
      .addScaledVector(viewFrom, distance * Math.sin(VIEW_TILT));
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

    const options = nextMoves(game.plays, game.made);
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
    const options = nextMoves(game.plays, game.made);
    return options.some((m) => m.from === slot || (m.from === selected && m.to === slot));
  }

  // --- Game flow ---

  function startNewGame() {
    generation++;
    selected = null;
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
        `You rolled ${roll[0]}, the computer ${roll[1]}. ${first === RED ? "You go" : "Computer goes"} first.`,
      );
      await wait(900);
      if (myGeneration !== generation) return;
      startTurn(first, roll, { alreadyRolled: true });
      return;
    }
    game.phase = "rolling";
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
        `${player === RED ? "You have" : "The computer has"} no legal moves for ${roll.join(" and ")}.`,
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

  function visitorTurn() {
    game.phase = "await-roll";
    showTurnStatus();
    refreshHighlights();
  }

  async function computerTurn() {
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
    performMove(RED, move);
    selected = null;
    if (game.winner !== null) return;
    if (nextMoves(game.plays, game.made).length === 0) {
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
      computer: "Computer's turn…",
      rolling: "",
      over: game.winner === RED ? "You win! 🎉" : "The computer wins this one.",
    };
    if (game.phase === "moving") {
      const dicePart =
        game.roll[0] === game.roll[1]
          ? `double ${game.roll[0]}s`
          : game.roll.join(" and ");
      status.set(
        selected === null
          ? `You rolled ${dicePart}. Tap a highlighted checker${left ? " to keep going" : ""}.`
          : "Tap a green ring to move there, or another checker.",
      );
    } else if (messages[game.phase]) {
      status.set(messages[game.phase]);
    }
    status.setNewGameVisible(game.phase === "over");
  }

  // Lifts and lights the selected checker, glows the ones that can move, rings targets.
  function refreshHighlights() {
    for (let i = 0; i < checkers.count; i++) checkers.setGlow(i, 0);
    markers.show([]);
    if (!active || !game || game.phase !== "moving") return;
    const options = nextMoves(game.plays, game.made);
    const stacks = game.stacks[RED];
    const topOf = (slot) => stacks.get(slot)?.at(-1);
    if (selected === null) {
      for (const from of new Set(options.map((m) => m.from))) {
        const id = topOf(from);
        if (id !== undefined) checkers.setGlow(id, 0.35);
      }
      return;
    }
    const id = topOf(selected);
    if (id !== undefined) checkers.setGlow(id, 0.6, layout.thickness * 1.5);
    const targets = options
      .filter((m) => m.from === selected)
      .map((m) => {
        const count = m.hit ? 0 : (stacks.get(m.to)?.length ?? 0);
        const spot = layout.checkerPosition(RED, m.to, count, count + 1);
        spot.y += layout.thickness / 2 + 0.0008;
        return spot;
      });
    markers.show(targets);
  }

  function update(dt) {
    checkers.update(dt);
    dice.update(dt);
    markers.update(dt);
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
  const count = (color) => slots.filter((s) => colorOfGroup.get(s) === color).length;
  for (const color of [RED, BLACK]) {
    const other = 1 - color;
    const bySize = groups
      .filter((g) => colorOfGroup.get(g) === other)
      .map((g) => [g, slots.filter((s) => s === g).length])
      .sort((a, b) => a[1] - b[1]);
    while (count(color) < CHECKERS_PER_PLAYER && bySize.length) {
      colorOfGroup.set(bySize.shift()[0], color);
    }
  }
  return (i) => colorOfGroup.get(slots[i]);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createStatus(onNewGame) {
  let panel = document.getElementById(STATUS_ID);
  if (!panel) {
    const style = document.createElement("style");
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
    panel = document.createElement("div");
    panel.id = STATUS_ID;
    panel.innerHTML = `<span></span><button type="button">New game</button>`;
    document.body.appendChild(panel);
  }
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
