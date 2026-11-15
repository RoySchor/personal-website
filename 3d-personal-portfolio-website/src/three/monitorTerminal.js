import * as THREE from "three";

import steamSource from "./coffeeSteam.js?raw";
import aiSource from "../backgammon/ai.js?raw";
import rulesSource from "../backgammon/rules.js?raw";
import clockSource from "../interactions/clockHands.js?raw";

// Brings the desk monitor to life: an editor that types out real snippets of this room's
// own source, with a terminal strip that runs builds and commits between them. Purely
// decorative: it's a texture on a plane laid over the glass, and it ignores the pointer.
//
// The modelled glass has no UVs, so the plane is fitted to the glass's front face at load.

const SCREEN_NAME = THREE.PropertyBinding.sanitizeNodeName("Monitor Screen");
const FILES = [
  { name: "rules.js", path: "src/backgammon/rules.js", source: rulesSource },
  { name: "ai.js", path: "src/backgammon/ai.js", source: aiSource },
  { name: "clockHands.js", path: "src/interactions/clockHands.js", source: clockSource },
  { name: "coffeeSteam.js", path: "src/three/coffeeSteam.js", source: steamSource },
];

const CANVAS_WIDTH = 1024;
// The glass has a rounded edge; keep the picture on its flat front.
const FACE_INSET = 0.97;
// Lift off the glass so the plane never z-fights with it.
const SURFACE_GAP = 0.0008;
// Rows of text that fit the screen height; fewer rows means bigger, more legible text.
const SCREEN_ROWS = 19;
const MIN_SNIPPET_LINES = 14;
const MAX_SNIPPET_LINES = 34;
const TYPE_CHARS_PER_SECOND = 38;
const COMMAND_CHARS_PER_SECOND = 22;
// The terminal starts two tabs in: from the room's usual camera angle the laptop in front
// hides the monitor's bottom-left corner.
const TERMINAL_INDENT_CHARS = 8;
const OUTPUT_LINE_SECONDS = 0.16;
const LINE_END_PAUSE = [0.12, 0.45];
const BETWEEN_SNIPPETS_SECONDS = 1.6;
const CURSOR_BLINK_SECONDS = 0.53;
// Redraws only when something changed, and never faster than this.
const MAX_REDRAWS_PER_SECOND = 24;

// VS Code "Dark+" colours.
const THEME = {
  background: "#1e1e1e",
  tabBar: "#252526",
  tabActive: "#1e1e1e",
  tabText: "#ffffff",
  tabTextDim: "#969696",
  gutter: "#858585",
  gutterActive: "#c6c6c6",
  text: "#d4d4d4",
  keyword: "#569cd6",
  control: "#c586c0",
  string: "#ce9178",
  number: "#b5cea8",
  comment: "#6a9955",
  function: "#dcdcaa",
  terminal: "#181818",
  terminalBorder: "#2b2b2b",
  terminalLabel: "#e7e7e7",
  success: "#89d185",
  // oh-my-zsh "robbyrussell" prompt, in VS Code's terminal ANSI colours.
  promptArrow: "#23d18b",
  promptDir: "#29b8db",
  promptGit: "#3b8eea",
  promptBranch: "#f14c4c",
  promptDirty: "#f5f543",
  cursor: "#aeafad",
};
const DECLARATIONS = new Set(["const", "let", "var", "function", "class", "new", "this"]);
const CONTROL = new Set([
  "if",
  "else",
  "for",
  "while",
  "return",
  "break",
  "continue",
  "of",
  "in",
  "import",
  "export",
  "from",
  "async",
  "await",
  "default",
]);
const LITERALS = new Set(["true", "false", "null", "undefined", "Infinity"]);

const COMMANDS = [
  {
    command: "npm run build",
    output: [
      "vite v7.3.0 building for production...",
      "✓ 41 modules transformed.",
      "dist/index.html                    3.05 kB │ gzip:   1.31 kB",
      "dist/assets/index.js             792.40 kB │ gzip: 222.10 kB",
      { text: "✓ built in 812ms", tone: "success" },
    ],
  },
  { command: "npm run lint", output: [{ text: "✔ No problems found", tone: "success" }] },
  {
    command: "node test-rules.mjs",
    output: [
      {
        text: "all rule checks passed; 300/300 self-play games finished",
        tone: "success",
      },
      "AI beat a random mover in 200/200 games",
    ],
  },
  {
    command: 'git commit -am "Polish the room"',
    commits: true,
    output: [
      "[main 3f2a9c1] Polish the room",
      " 2 files changed, 41 insertions(+), 9 deletions(-)",
    ],
  },
  {
    command: "git push",
    output: [
      "To github.com:RoySchor/personal-website.git",
      "   2fd914e..3f2a9c1  main -> main",
    ],
  },
];

export function createMonitorTerminal({ root, scene, camera }) {
  const glass = root.getObjectByName(SCREEN_NAME);
  if (!glass?.isMesh) {
    console.warn(`monitorTerminal: no "${SCREEN_NAME}" mesh in the room`);
    return null;
  }
  root.updateMatrixWorld(true);
  const face = frontFace(glass, camera);

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = Math.round((CANVAS_WIDTH * face.height) / face.width);
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(face.width * FACE_INSET, face.height * FACE_INSET),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  screen.name = "monitor_terminal";
  screen.matrixAutoUpdate = false;
  screen.matrix
    .makeBasis(face.right, face.up, face.normal)
    .setPosition(face.center.clone().addScaledVector(face.normal, SURFACE_GAP));
  // Decoration only: never the target of, or an obstacle to, a click or hover.
  screen.raycast = () => {};
  scene.add(screen);

  const layout = measure(ctx, canvas);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = {
    file: null,
    lines: [],
    typedLine: 0,
    typedChars: 0,
    terminal: [],
    phase: "typing",
    wait: 0,
    command: null,
    outputIndex: 0,
  };
  let fileIndex = Math.floor(Math.random() * FILES.length);
  let charBudget = 0;
  let cursorOn = true;
  let cursorClock = 0;
  let redrawClock = 0;
  let needsDraw = true;
  // Uncommitted changes, shown as the prompt's ✗: set by writing code, cleared by a commit.
  let gitDirty = true;

  startSnippet();
  if (reducedMotion) {
    // One still frame: the whole snippet typed and a finished build below it.
    state.typedLine = state.lines.length - 1;
    state.typedChars = state.lines.at(-1).length;
    state.terminal = [
      { kind: "command", gitDirty: true, typed: "npm run build" },
      ...lines(COMMANDS[0].output),
    ];
    state.phase = "still";
    cursorOn = false;
  }
  draw();

  function startSnippet() {
    const file = FILES[fileIndex++ % FILES.length];
    state.file = file;
    state.lines = pickSnippet(file.source);
    state.typedLine = 0;
    state.typedChars = 0;
    state.phase = "typing";
    gitDirty = true;
    needsDraw = true;
  }

  function startCommand() {
    state.command = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];
    state.terminal.push({ kind: "command", gitDirty, typed: "" });
    state.outputIndex = 0;
    state.phase = "command";
    needsDraw = true;
  }

  function update(dt) {
    if (state.phase === "still") return;

    cursorClock += dt;
    if (cursorClock >= CURSOR_BLINK_SECONDS) {
      cursorClock = 0;
      cursorOn = !cursorOn;
      needsDraw = true;
    }

    if (state.wait > 0) {
      state.wait -= dt;
    } else if (state.phase === "typing") {
      typeCode(dt);
    } else if (state.phase === "command") {
      typeCommand(dt);
    } else if (state.phase === "output") {
      printOutput();
    } else if (state.phase === "idle") {
      startSnippet();
    }

    redrawClock += dt;
    if (needsDraw && redrawClock >= 1 / MAX_REDRAWS_PER_SECOND) {
      redrawClock = 0;
      draw();
    }
  }

  function typeCode(dt) {
    charBudget += dt * TYPE_CHARS_PER_SECOND * (0.6 + Math.random() * 0.8);
    while (charBudget >= 1 && state.phase === "typing") {
      const line = state.lines[state.typedLine];
      // Indentation appears at once, the way an editor auto-indents.
      if (state.typedChars === 0)
        state.typedChars = line.length - line.trimStart().length;
      if (state.typedChars < line.length) {
        state.typedChars++;
        charBudget--;
        needsDraw = true;
        continue;
      }
      if (state.typedLine === state.lines.length - 1) {
        charBudget = 0;
        state.wait = 0.8;
        startCommand();
        return;
      }
      state.typedLine++;
      state.typedChars = 0;
      charBudget = 0;
      state.wait = randomBetween(...LINE_END_PAUSE);
      needsDraw = true;
    }
  }

  function typeCommand(dt) {
    charBudget += dt * COMMAND_CHARS_PER_SECOND;
    const entry = state.terminal.at(-1);
    const full = state.command.command;
    while (charBudget >= 1 && entry.typed.length < full.length) {
      entry.typed = full.slice(0, entry.typed.length + 1);
      charBudget--;
      needsDraw = true;
    }
    if (entry.typed.length === full.length) {
      charBudget = 0;
      state.phase = "output";
      state.wait = 0.35;
    }
  }

  function printOutput() {
    const output = lines(state.command.output);
    if (state.outputIndex < output.length) {
      state.terminal.push(output[state.outputIndex++]);
      state.wait = OUTPUT_LINE_SECONDS;
      needsDraw = true;
      return;
    }
    if (state.command.commits) gitDirty = false;
    state.phase = "idle";
    state.wait = BETWEEN_SNIPPETS_SECONDS;
  }

  function draw() {
    needsDraw = false;
    const { width, height } = canvas;
    const { font, charWidth, rowHeight, tabHeight, gutterWidth, terminalTop, padding } =
      layout;
    ctx.fillStyle = THEME.background;
    ctx.fillRect(0, 0, width, height);

    // Tab bar with the open file.
    ctx.fillStyle = THEME.tabBar;
    ctx.fillRect(0, 0, width, tabHeight);
    ctx.font = font;
    ctx.textBaseline = "middle";
    const tabLabel = state.file.name;
    const tabWidth = ctx.measureText(tabLabel).width + padding * 4;
    ctx.fillStyle = THEME.tabActive;
    ctx.fillRect(0, 0, tabWidth, tabHeight);
    ctx.fillStyle = THEME.tabText;
    ctx.fillText(tabLabel, padding * 2, tabHeight / 2);
    ctx.fillStyle = THEME.tabTextDim;
    ctx.fillText(state.file.path, tabWidth + padding * 2, tabHeight / 2);

    // Code, scrolled so the line being typed stays in view.
    const visibleRows = Math.floor((terminalTop - tabHeight - padding) / rowHeight);
    const firstRow = Math.max(0, state.typedLine - visibleRows + 2);
    for (let row = firstRow; row <= state.typedLine; row++) {
      const y = tabHeight + padding / 2 + (row - firstRow + 0.5) * rowHeight;
      const isCurrent = row === state.typedLine;
      ctx.fillStyle = isCurrent ? THEME.gutterActive : THEME.gutter;
      ctx.textAlign = "right";
      ctx.fillText(String(row + 1), gutterWidth - padding, y);
      ctx.textAlign = "left";
      const line = state.lines[row];
      const shown = isCurrent ? state.typedChars : line.length;
      drawCode(line, shown, gutterWidth + padding, y);
      if (isCurrent && cursorOn && state.phase === "typing") {
        ctx.fillStyle = THEME.cursor;
        ctx.fillRect(
          gutterWidth + padding + shown * charWidth,
          y - rowHeight * 0.4,
          2,
          rowHeight * 0.8,
        );
      }
    }

    // Terminal panel.
    ctx.fillStyle = THEME.terminal;
    ctx.fillRect(0, terminalTop, width, height - terminalTop);
    ctx.fillStyle = THEME.terminalBorder;
    ctx.fillRect(0, terminalTop, width, 2);
    ctx.fillStyle = THEME.terminalLabel;
    const terminalLeft = padding * 2 + charWidth * TERMINAL_INDENT_CHARS;
    ctx.fillText("TERMINAL", terminalLeft, terminalTop + rowHeight * 0.75);
    const terminalRows = Math.floor((height - terminalTop - rowHeight * 1.4) / rowHeight);
    const recent = state.terminal.slice(-terminalRows);
    state.terminal = state.terminal.slice(-terminalRows);
    recent.forEach((entry, i) => {
      const y = terminalTop + rowHeight * (1.6 + i);
      const segments =
        entry.kind === "command"
          ? [...promptSegments(entry.gitDirty), { text: entry.typed, color: THEME.text }]
          : [{ text: entry.text, color: THEME[entry.tone] ?? THEME.text }];
      let x = terminalLeft;
      for (const { text, color } of segments) {
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        x += ctx.measureText(text).width;
      }
      const isLast = i === recent.length - 1;
      if (isLast && cursorOn && state.phase === "command") {
        ctx.fillStyle = THEME.cursor;
        ctx.fillRect(x + 2, y - rowHeight * 0.4, charWidth * 0.6, rowHeight * 0.8);
      }
    });

    texture.needsUpdate = true;
  }

  function drawCode(line, shown, x0, y) {
    for (const token of highlight(line)) {
      if (token.start >= shown) break;
      const text = token.text.slice(0, shown - token.start);
      ctx.fillStyle = token.color;
      ctx.fillText(text, x0 + token.start * layout.charWidth, y);
    }
  }

  return { update };
}

// The glass's flat front, measured from its triangles: the screen leans back a few degrees
// and that tilt lives in the vertices, not the node, so the mesh's axes don't show it.
// Triangles are grouped by facing direction; the biggest group facing the room's camera is
// the front. "Up" is world up laid into that face, and the face's corners give its size.
function frontFace(mesh, camera) {
  const positions = mesh.geometry.getAttribute("position");
  const index = mesh.geometry.index;
  const corner = (i) =>
    new THREE.Vector3()
      .fromBufferAttribute(positions, index ? index.getX(i) : i)
      .applyMatrix4(mesh.matrixWorld);
  const triangleCount = (index ? index.count : positions.count) / 3;

  const groups = new Map();
  const edgeA = new THREE.Vector3();
  const edgeB = new THREE.Vector3();
  for (let t = 0; t < triangleCount; t++) {
    const a = corner(t * 3);
    const b = corner(t * 3 + 1);
    const c = corner(t * 3 + 2);
    const normal = new THREE.Vector3().crossVectors(
      edgeA.subVectors(b, a),
      edgeB.subVectors(c, a),
    );
    const area = normal.length() / 2;
    if (area === 0) continue;
    normal.normalize();
    const key = normal
      .toArray()
      .map((x) => x.toFixed(2))
      .join();
    if (!groups.has(key)) groups.set(key, { normal, area: 0, corners: [] });
    const group = groups.get(key);
    group.area += area;
    group.corners.push(a, b, c);
  }

  const toCamera = (group) =>
    camera.position.clone().sub(group.corners[0]).dot(group.normal);
  const front = [...groups.values()]
    .filter((group) => toCamera(group) > 0)
    .sort((x, y) => y.area - x.area)[0];
  const normal = front.normal.clone();
  const up = new THREE.Vector3(0, 1, 0).projectOnPlane(normal).normalize();
  const right = new THREE.Vector3().crossVectors(up, normal).normalize();

  const across = front.corners.map((p) => p.dot(right));
  const along = front.corners.map((p) => p.dot(up));
  const depth =
    front.corners.reduce((sum, p) => sum + p.dot(normal), 0) / front.corners.length;
  const [minX, maxX] = [Math.min(...across), Math.max(...across)];
  const [minY, maxY] = [Math.min(...along), Math.max(...along)];
  const center = new THREE.Vector3()
    .addScaledVector(right, (minX + maxX) / 2)
    .addScaledVector(up, (minY + maxY) / 2)
    .addScaledVector(normal, depth);

  return { center, normal, up, right, width: maxX - minX, height: maxY - minY };
}

function measure(ctx, canvas) {
  const rowHeight = canvas.height / SCREEN_ROWS;
  const font = `${Math.round(rowHeight * 0.62)}px Menlo, Consolas, "DejaVu Sans Mono", monospace`;
  ctx.font = font;
  const charWidth = ctx.measureText("M").width;
  const padding = Math.round(rowHeight * 0.5);
  return {
    font,
    charWidth,
    rowHeight,
    padding,
    tabHeight: Math.round(rowHeight * 1.5),
    gutterWidth: Math.round(charWidth * 4 + padding * 2),
    terminalTop: Math.round(canvas.height * 0.7),
  };
}

// A run of source starting at a top-level declaration, ending on a blank line once it's
// long enough, so each snippet reads as a whole function or block.
function pickSnippet(source) {
  const all = source.replace(/\t/g, "  ").split("\n");
  const starts = all
    .map((line, i) => (/^(export )?(async )?(function|const|let) /.test(line) ? i : -1))
    .filter((i) => i >= 0);
  const start = starts[Math.floor(Math.random() * starts.length)] ?? 0;
  // Include the comment block sitting right above the declaration.
  let from = start;
  while (from > 0 && all[from - 1].startsWith("//")) from--;
  const snippet = [];
  for (let i = from; i < all.length && snippet.length < MAX_SNIPPET_LINES; i++) {
    snippet.push(all[i]);
    if (all[i].trim() === "" && snippet.length >= MIN_SNIPPET_LINES) break;
  }
  while (snippet.length > 1 && snippet.at(-1).trim() === "") snippet.pop();
  return snippet;
}

const TOKEN =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

// Splits a line into coloured tokens with their column, for VS Code-like highlighting.
function highlight(line) {
  const tokens = [];
  let last = 0;
  const push = (start, text, color) => tokens.push({ start, text, color });
  for (const match of line.matchAll(TOKEN)) {
    if (match.index > last) push(last, line.slice(last, match.index), THEME.text);
    const [text, comment, string, number, word] = match;
    let color = THEME.text;
    if (comment) color = THEME.comment;
    else if (string) color = THEME.string;
    else if (number) color = THEME.number;
    else if (word) {
      const after = line.slice(match.index + text.length).trimStart();
      if (DECLARATIONS.has(word)) color = THEME.keyword;
      else if (CONTROL.has(word)) color = THEME.control;
      else if (LITERALS.has(word)) color = THEME.keyword;
      else if (after.startsWith("(")) color = THEME.function;
    }
    push(match.index, text, color);
    last = match.index + text.length;
  }
  if (last < line.length) push(last, line.slice(last), THEME.text);
  return tokens;
}

// "➜  personal-website git:(main)  ✗ ", coloured like oh-my-zsh's robbyrussell theme.
// The ✗ (uncommitted changes) only shows while the working tree is dirty.
function promptSegments(dirty) {
  return [
    { text: "➜  ", color: THEME.promptArrow },
    { text: "personal-website ", color: THEME.promptDir },
    { text: "git:(", color: THEME.promptGit },
    { text: "main", color: THEME.promptBranch },
    { text: ")", color: THEME.promptGit },
    dirty ? { text: "  ✗ ", color: THEME.promptDirty } : { text: " ", color: THEME.text },
  ];
}

function lines(output) {
  return output.map((entry) => (typeof entry === "string" ? { text: entry } : entry));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
