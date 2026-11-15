import * as THREE from "three";

// The same list the laptop's Quotes app deals from, so there's one place to add quotes.
import quoteStrings from "../../../2d-personal-portfolio-website/src/data/quotes.json";

// The hanging plank sign above the monitor: wood grain and a quote of the day, painted on
// a canvas per plank at load. A short quote runs across the top two planks with the author
// on the bottom one; a long quote continues onto the bottom plank above the author. Purely
// decorative: it ignores the pointer.
//
// The planks are bevelled boxes with no UVs, so each gets a plane laid over its flat front.

const PANEL_NAMES = ["QuoteSign_Panel_1", "QuoteSign_Panel_2", "QuoteSign_Panel_3"];
const CANVAS_WIDTH = 1024;
// World-space metres. The bevel rounds the plank's edges; keep the picture on its flat front.
const BEVEL = 0.004;
// Lift off the wood so the plane never z-fights with it.
const SURFACE_GAP = 0.0006;
// Font sizes as a fraction of a plank's height.
const QUOTE_FONT_MAX = 0.56;
const QUOTE_FONT_MIN = 0.16;
const AUTHOR_FONT_MAX = 0.4;
// The byline starts a touch larger than the quote. To stay on one line it may shrink to
// 85% of that, or to 80% of the quote's size if that's smaller, before wrapping instead:
// a one-line byline leaves room for the quote's last line on the bottom plank.
const AUTHOR_SCALE = 1.12;
const AUTHOR_ONE_LINE_SHRINK = 0.85;
const AUTHOR_MIN_OF_QUOTE = 0.8;
// Space between the quote's last line and the byline on a shared plank, in quote lines.
const AUTHOR_GAP = 0.35;
// More than two lines on a plank looks cramped; a long quote spreads onto the bottom plank.
const MAX_LINES_PER_PLANK = 2;
// Share of a plank's height the lettering may fill, top to bottom.
const PLANK_TEXT_HEIGHT = 0.92;
const LINE_HEIGHT = 1.08;
const SIDE_PADDING = 0.01;
// A plain, heavy sans-serif reads best at a distance and at an angle.
const FONT_FAMILY = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_WEIGHT = 700;
const INK = "rgba(28, 15, 6, 0.93)";
// A faint light edge under each letter, so the ink reads as burned into the wood.
const INK_HIGHLIGHT = "rgba(255, 232, 196, 0.16)";
// Golden oak, each plank a slightly different board; set on the plank's own material too so
// its edges match the face.
const PLANK_COLORS = ["#b5844a", "#aa7a43", "#b07f47"];
const GRAIN_DARK = [64, 38, 16];
const GRAIN_LIGHT = [255, 222, 165];
const PORE = [44, 26, 12];
const MINERAL = [52, 44, 38];
const CRACK = [30, 15, 6];
// Longer quotes would need lettering too small to read on the planks; the laptop app still
// shows those.
const MAX_QUOTE_CHARS = 201;
const RTL_TEXT = /[\u0590-\u08ff]/;

const QUOTES = quoteStrings
  .map(parseQuote)
  .filter((quote) => quote.text.length <= MAX_QUOTE_CHARS);

// The laptop's format: "Quote text - Author, detail", with *asterisks* marking italics and
// the occasional line break. The author follows the last " - "; some quotes have none.
function parseQuote(raw) {
  const clean = raw
    .replace(/\*/g, "")
    .replace(/\s*\n\s*/g, " ")
    .trim();
  const split = clean.lastIndexOf(" - ");
  if (split === -1) return { text: clean, author: null };
  return { text: clean.slice(0, split).trim(), author: clean.slice(split + 3).trim() };
}

// `quote` overrides the day's pick ({ text, author }), for previewing how one will look.
export function createQuoteSign({ root, camera, quote = quoteOfTheDay(new Date()) }) {
  if (!quote) {
    console.warn(`quoteSign: no quotes of ${MAX_QUOTE_CHARS} characters or fewer`);
    return null;
  }
  const panels = PANEL_NAMES.map((name) => root.getObjectByName(name));
  if (panels.some((panel) => !panel?.isMesh)) {
    console.warn(`quoteSign: missing one of ${PANEL_NAMES.join(", ")} in the room`);
    return null;
  }
  root.updateMatrixWorld(true);

  const faces = panels.map((panel, index) => {
    const face = paintablePlane(panel, camera);
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = Math.round((CANVAS_WIDTH * face.worldHeight) / face.worldWidth);
    const ctx = canvas.getContext("2d");
    return { panel, face, canvas, ctx, index };
  });
  // A missing 2D context skips the sign rather than throwing, which would stop the whole
  // room from rendering over a decoration.
  if (faces.some(({ ctx }) => !ctx)) {
    console.warn("quoteSign: no 2D canvas context available");
    return null;
  }

  for (const { panel, canvas, ctx, index } of faces) {
    const baseColor = PLANK_COLORS[index];
    panel.material.color.set(baseColor);
    drawWood(ctx, canvas, baseColor, seededRandom(index + 1));
  }
  drawQuote(faces, quote);

  for (const { panel, face, canvas } of faces) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(face.localWidth, face.localHeight),
      // Matches the room's wood after loadRoom's roughness bump.
      new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 }),
    );
    plane.name = `${panel.name}_face`;
    plane.position.copy(face.position);
    plane.rotation.y = face.flipped ? Math.PI : 0;
    plane.receiveShadow = true;
    // Decoration only: never the target of, or an obstacle to, a click or hover.
    plane.raycast = () => {};
    panel.add(plane);
  }

  return { quote };
}

// Same quote for every visitor on a given local day. Each pass through the list is a fresh
// shuffle, so nothing repeats until every quote has had its day.
export function quoteOfTheDay(date) {
  const day = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  const cycle = Math.floor(day / QUOTES.length);
  const order = QUOTES.map((_, i) => i);
  const random = seededRandom(cycle);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return QUOTES[order[day % QUOTES.length]];
}

// The plank's flat front, in the plank's own space: the node carries the sign's scale, so
// the plane is sized in local units and parented to the plank. Whichever of the box's ±Z
// faces points at the camera is the front.
function paintablePlane(panel, camera) {
  const geometry = panel.geometry;
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const scale = panel.getWorldScale(new THREE.Vector3());
  const plusZ = new THREE.Vector3(0, 0, 1).transformDirection(panel.matrixWorld);
  const toCamera = camera.position
    .clone()
    .sub(panel.getWorldPosition(new THREE.Vector3()));
  const flipped = toCamera.dot(plusZ) < 0;

  const localWidth = box.max.x - box.min.x - (2 * BEVEL) / scale.x;
  const localHeight = box.max.y - box.min.y - (2 * BEVEL) / scale.y;
  const frontZ = flipped
    ? box.min.z - SURFACE_GAP / scale.z
    : box.max.z + SURFACE_GAP / scale.z;
  const position = new THREE.Vector3(
    (box.min.x + box.max.x) / 2,
    (box.min.y + box.max.y) / 2,
    frontZ,
  );
  return {
    position,
    flipped,
    localWidth,
    localHeight,
    worldWidth: localWidth * scale.x,
    worldHeight: localHeight * scale.y,
  };
}

function drawWood(ctx, canvas, baseColor, random) {
  const { width, height } = canvas;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // The tone drifts lighter and darker along a board's length.
  const drift = ctx.createLinearGradient(0, 0, width, 0);
  for (let stop = 0; stop <= 5; stop++) {
    const tone = random() < 0.5 ? GRAIN_DARK : GRAIN_LIGHT;
    drift.addColorStop(stop / 5, rgba(tone, random() * 0.09));
  }
  ctx.fillStyle = drift;
  ctx.fillRect(0, 0, width, height);

  // Fibres: random noise stretched along the plank reads as the streaky, uneven figure of
  // sawn oak. A coarse layer for broad streaks, a fine one for the fibres themselves.
  drawFibres(ctx, width, height, random, { columns: 20, alpha: 0.2 });
  drawFibres(ctx, width, height, random, { columns: 140, alpha: 0.14 });

  // Straight grain runs roughly parallel: every line follows one gentle plank-wide wave,
  // plus a small wobble of its own.
  const wave = {
    amplitude: height * (0.02 + random() * 0.04),
    frequency: ((0.3 + random() * 0.6) * Math.PI * 2) / width,
    phase: random() * Math.PI * 2,
  };
  const knot = random() < 0.5 ? makeKnot(width, height, random) : null;
  const grainY = (x, y0, wobble) => {
    let y =
      y0 +
      wave.amplitude * Math.sin(x * wave.frequency + wave.phase) +
      wobble.amplitude * Math.sin(x * wobble.frequency + wobble.phase);
    if (knot) y += bowAroundKnot(x, y, knot);
    return y;
  };
  // Soft, wide growth-ring bands first, then the fine dark grain lines over them.
  for (let i = 0; i < 10; i++) {
    strokeGrain(ctx, width, grainY, -height * 0.2 + random() * height * 1.4, random, {
      color: rgba(GRAIN_DARK, 0.04 + random() * 0.03),
      lineWidth: 5 + random() * 9,
    });
  }
  for (let i = 0; i < 55; i++) {
    strokeGrain(ctx, width, grainY, -height * 0.2 + random() * height * 1.4, random, {
      color: rgba(GRAIN_DARK, 0.06 + random() * 0.14),
      lineWidth: 0.5 + random() * 1.4,
    });
  }

  // Flat-sawn oak's "cathedral": nested arches where the saw cut across the growth rings.
  if (random() < 0.8) drawCathedral(ctx, width, height, random);

  // Oak's open pores: dense short dark dashes along the grain.
  for (let i = 0; i < 1100; i++) {
    const x = random() * width;
    const y = grainY(x, random() * height, { amplitude: 0, frequency: 0, phase: 0 });
    const length = 3 + random() * 15;
    ctx.strokeStyle = rgba(PORE, 0.1 + random() * 0.22);
    ctx.lineWidth = 0.6 + random() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y + (random() - 0.5) * 0.8);
    ctx.stroke();
  }

  // Ray flecks: tiny pale marks lying across the grain.
  for (let i = 0; i < 220; i++) {
    const x = random() * width;
    const y = random() * height;
    const length = 2 + random() * 5;
    const angle = Math.PI / 2 + (random() - 0.5) * 0.8;
    ctx.strokeStyle = rgba(GRAIN_LIGHT, 0.08 + random() * 0.1);
    ctx.lineWidth = 1 + random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }

  // A dark mineral streak now and then, the grey-brown stain old oak picks up.
  if (random() < 0.6) {
    const y0 = height * (0.15 + random() * 0.7);
    const from = width * random() * 0.6;
    const length = width * (0.2 + random() * 0.3);
    ctx.strokeStyle = rgba(MINERAL, 0.1 + random() * 0.08);
    ctx.lineWidth = 2 + random() * 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let x = from; x <= from + length; x += 8) {
      const y = grainY(x, y0, { amplitude: 0, frequency: 0, phase: 0 });
      if (x === from) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  if (knot) drawKnot(ctx, knot);

  // Weathered cracks, all running with the grain: checks splitting in from the plank's
  // ends, now and then a long split down the board, and hairlines scattered in the face.
  const checks = 2 + Math.floor(random() * 2);
  for (let i = 0; i < checks; i++) {
    const fromLeft = random() < 0.5;
    drawCrack(ctx, random, {
      x: fromLeft ? 0 : width,
      y: height * (0.15 + random() * 0.7),
      direction: fromLeft ? 1 : -1,
      length: width * (0.17 + random() * 0.26),
      thickness: 4.6 + random() * 3.2,
    });
  }
  if (random() < 0.45) {
    drawCrack(ctx, random, {
      x: width * (0.1 + random() * 0.3),
      y: height * (0.2 + random() * 0.6),
      direction: 1,
      length: width * (0.45 + random() * 0.35),
      thickness: 3 + random() * 1.7,
    });
  }
  const hairlines = 5 + Math.floor(random() * 4);
  for (let i = 0; i < hairlines; i++) {
    drawCrack(ctx, random, {
      x: width * (0.05 + random() * 0.9),
      y: height * (0.1 + random() * 0.8),
      direction: random() < 0.5 ? 1 : -1,
      length: width * (0.045 + random() * 0.095),
      thickness: 1.7 + random() * 1.4,
    });
  }

  // Darker, weathered edges and ends.
  const edge = (x0, y0, x1, y1, alpha) => {
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, rgba(GRAIN_DARK, alpha));
    gradient.addColorStop(1, rgba(GRAIN_DARK, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  };
  edge(0, 0, 0, height * 0.1, 0.26);
  edge(0, height, 0, height * 0.9, 0.26);
  edge(0, 0, width * 0.04, 0, 0.32);
  edge(width, 0, width * 0.96, 0, 0.32);
}

// Per-row noise on a narrow canvas, stretched to the plank's full width: each row becomes a
// long streak of slightly lighter or darker fibre.
function drawFibres(ctx, width, height, random, { columns, alpha }) {
  const noise = document.createElement("canvas");
  noise.width = columns;
  noise.height = height;
  const noiseCtx = noise.getContext("2d");
  if (!noiseCtx) return;
  const image = noiseCtx.createImageData(columns, height);
  let previousRow = new Float32Array(columns).fill(0.5);
  for (let y = 0; y < height; y++) {
    const row = new Float32Array(columns);
    for (let x = 0; x < columns; x++) {
      // Lean on the row above so streaks are a few pixels thick, not single-pixel lines.
      row[x] = previousRow[x] * 0.55 + random() * 0.45;
      const value = row[x] - 0.5;
      const [r, g, b] = value < 0 ? GRAIN_DARK : GRAIN_LIGHT;
      const i = (y * columns + x) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = Math.min(255, Math.abs(value) * 2 * 255 * alpha * 2.2);
    }
    previousRow = row;
  }
  noiseCtx.putImageData(image, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(noise, 0, 0, width, height);
}

// Nested parabolas opening along the plank, each a little further out than the last, with
// a soft darker band beside every line like oak's dense latewood.
function drawCathedral(ctx, width, height, random) {
  const direction = random() < 0.5 ? 1 : -1;
  const tipX = width * (0.2 + random() * 0.6);
  const centerY = height * (0.3 + random() * 0.4);
  const spread = height * (0.1 + random() * 0.08);
  const rings = 6 + Math.floor(random() * 5);
  let reach = 0;
  for (let ring = 0; ring < rings; ring++) {
    reach += width * (0.018 + random() * 0.022);
    const wobble = { amplitude: 1 + random() * 2, phase: random() * Math.PI * 2 };
    const points = [];
    for (let y = -height * 0.3; y <= height * 1.3; y += 4) {
      const dy = y - centerY;
      const x =
        tipX +
        direction * (reach - (dy * dy) / (2 * spread)) +
        wobble.amplitude * Math.sin(y * 0.05 + wobble.phase);
      points.push([x, y]);
    }
    const trace = () => {
      ctx.beginPath();
      points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
    };
    ctx.strokeStyle = rgba(GRAIN_DARK, 0.05 + random() * 0.04);
    ctx.lineWidth = 6 + random() * 8;
    trace();
    ctx.strokeStyle = rgba(GRAIN_DARK, 0.14 + random() * 0.14);
    ctx.lineWidth = 1 + random() * 1.6;
    trace();
  }
}

function strokeGrain(ctx, width, grainY, y0, random, { color, lineWidth }) {
  const wobble = {
    amplitude: 0.5 + random() * 2.5,
    frequency: ((1 + random() * 4) * Math.PI * 2) / width,
    phase: random() * Math.PI * 2,
  };
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  for (let x = 0; x <= width; x += 8) {
    const y = grainY(x, y0, wobble);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// Knots sit near a plank's end so they never fall under the lettering.
function makeKnot(width, height, random) {
  const nearLeft = random() < 0.5;
  return {
    x: width * (nearLeft ? 0.05 + random() * 0.08 : 0.87 + random() * 0.08),
    y: height * (0.3 + random() * 0.4),
    rx: height * (0.08 + random() * 0.04),
    ry: height * (0.05 + random() * 0.03),
  };
}

function drawKnot(ctx, knot) {
  for (let ring = 5; ring >= 1; ring--) {
    const t = ring / 5;
    ctx.beginPath();
    ctx.ellipse(knot.x, knot.y, knot.rx * t, knot.ry * t, 0, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(GRAIN_DARK, 0.18 + (1 - t) * 0.2);
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(knot.x, knot.y, knot.rx * 0.22, knot.ry * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(GRAIN_DARK, 0.55);
  ctx.fill();
}

function bowAroundKnot(x, y, knot) {
  const dx = (x - knot.x) / (knot.rx * 2.2);
  const dy = y - knot.y;
  const push =
    knot.ry * 1.6 * Math.exp(-dx * dx) * Math.exp(-Math.abs(dy) / (knot.ry * 3));
  return dy < 0 ? -push : push;
}

// A jagged split that tapers to nothing, with a faint light lip along one side so it reads
// as a groove rather than a drawn line. Sometimes a short branch splits off.
function drawCrack(ctx, random, { x, y, direction, length, thickness }) {
  const points = [{ x, y }];
  let travelled = 0;
  while (travelled < length) {
    const step = 3 + random() * 5;
    travelled += step;
    const last = points.at(-1);
    points.push({
      x: last.x + step * direction,
      y: last.y + (random() - 0.5) * (1.6 + thickness * 0.5),
    });
  }
  const stroke = (offsetY, color, widthScale) => {
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    for (let i = 1; i < points.length; i++) {
      const taper = 1 - i / points.length;
      ctx.lineWidth = Math.max(0.35, thickness * widthScale * taper);
      ctx.beginPath();
      ctx.moveTo(points[i - 1].x, points[i - 1].y + offsetY);
      ctx.lineTo(points[i].x, points[i].y + offsetY);
      ctx.stroke();
    }
  };
  stroke(thickness * 0.7, rgba(GRAIN_LIGHT, 0.2), 0.6);
  stroke(0, rgba(CRACK, 0.8), 1);

  if (points.length > 6 && random() < 0.65) {
    const from = points[Math.floor(points.length * (0.3 + random() * 0.3))];
    drawCrack(ctx, random, {
      x: from.x,
      y: from.y,
      direction,
      length: length * (0.2 + random() * 0.2),
      thickness: thickness * 0.5,
    });
  }
}

function rgba([r, g, b], alpha) {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawQuote(faces, quote) {
  const [top, middle, bottom] = faces;
  const { canvas, ctx } = top;
  const height = canvas.height;
  const maxWidth = canvas.width * (1 - SIDE_PADDING * 2);
  const usable = height * PLANK_TEXT_HEIGHT;
  const minSize = Math.floor(height * QUOTE_FONT_MIN);
  const text = `“${quote.text}”`;
  const authorText = quote.author ? `— ${quote.author}` : null;

  // The biggest quote size that fits one of two layouts. Short quotes use the top two
  // planks and give the author the bottom one; long quotes also run onto the bottom plank,
  // with the author pushed to its lower edge. At equal sizes the two-plank layout wins.
  let layout = null;
  for (let size = Math.floor(height * QUOTE_FONT_MAX); size >= minSize; size -= 1) {
    const perPlank = Math.min(MAX_LINES_PER_PLANK, linesThatFit(usable, size));
    if (perPlank < 1) continue;
    ctx.font = textFont(size);
    const lineCount = Math.max(2, wrap(ctx, text, maxWidth).length);
    const author =
      authorText && fitAuthor(bottom.ctx, authorText, size, maxWidth, usable);
    if (lineCount <= perPlank * 2) {
      layout = { size, lineCount, perPlank, onBottom: 0, author };
      break;
    }
    const authorSpace = author ? blockHeight(author) + size * AUTHOR_GAP : 0;
    const onBottom = Math.min(
      MAX_LINES_PER_PLANK,
      linesThatFit(usable - authorSpace, size),
    );
    if (lineCount <= perPlank * 2 + onBottom) {
      layout = { size, lineCount, perPlank, onBottom, author };
      break;
    }
  }
  // Nothing fit (a quote far over MAX_QUOTE_CHARS): smallest size, top two planks.
  layout ??= {
    size: minSize,
    lineCount: Math.max(2, wrap(ctx, text, maxWidth).length),
    perPlank: Infinity,
    onBottom: 0,
    author: authorText && fitAuthor(bottom.ctx, authorText, minSize, maxWidth, usable),
  };

  const { size, lineCount, perPlank, author } = layout;
  ctx.font = textFont(size);
  const lines = balancedWrap(ctx, text, maxWidth, lineCount);
  // Spread the lines evenly, giving the bottom plank only what the top two can't hold.
  const bottomCount = layout.onBottom
    ? Math.min(
        layout.onBottom,
        Math.max(lines.length - perPlank * 2, Math.floor(lines.length / 3)),
      )
    : 0;
  const upperCount = lines.length - bottomCount;
  const topCount = Math.ceil(upperCount / 2);
  const quoteBlock = (from, to) => ({ lines: lines.slice(from, to), size });
  drawCentered(top, quoteBlock(0, topCount));
  drawCentered(middle, quoteBlock(topCount, upperCount));

  if (bottomCount === 0) {
    if (author) drawCentered(bottom, author);
    return;
  }
  const bottomLines = quoteBlock(upperCount, lines.length);
  if (!author) {
    drawCentered(bottom, bottomLines);
    return;
  }
  const margin = (height - usable) / 2;
  drawBlock(bottom, bottomLines, margin + size / 2);
  drawBlock(bottom, author, height - margin - blockHeight(author) + author.size / 2);
}

// A little larger than the quote, capped so short quotes don't get a shouting byline. One
// line if it can stay close to that size; otherwise two (a long "François-Marie Arouet,
// Voltaire. A French Enlightenment writer and philosopher").
function fitAuthor(ctx, text, quoteSize, maxWidth, usable) {
  const start = Math.min(
    Math.floor((usable / PLANK_TEXT_HEIGHT) * AUTHOR_FONT_MAX),
    Math.round(quoteSize * AUTHOR_SCALE),
  );
  const oneLineMin = Math.floor(
    Math.min(start * AUTHOR_ONE_LINE_SHRINK, quoteSize * AUTHOR_MIN_OF_QUOTE),
  );
  for (let size = start; size >= oneLineMin; size -= 1) {
    ctx.font = textFont(size);
    if (ctx.measureText(text).width <= maxWidth) return { lines: [text], size };
  }
  for (let size = start; size > 8; size -= 1) {
    if (linesThatFit(usable, size) < 2) continue;
    ctx.font = textFont(size);
    const lines = balancedWrap(ctx, text, maxWidth, 2);
    if (
      lines.length <= 2 &&
      lines.every((line) => ctx.measureText(line).width <= maxWidth)
    ) {
      return { lines, size };
    }
  }
  return { lines: [text], size: oneLineMin };
}

// How many lines of this size stack into the given height.
function linesThatFit(height, size) {
  if (height < size) return 0;
  return Math.floor((height - size) / (size * LINE_HEIGHT)) + 1;
}

function blockHeight({ lines, size }) {
  return size + (lines.length - 1) * size * LINE_HEIGHT;
}

function textFont(size) {
  return `${FONT_WEIGHT} ${size}px ${FONT_FAMILY}`;
}

function drawCentered(face, block) {
  drawBlock(face, block, face.canvas.height / 2 - (blockHeight(block) - block.size) / 2);
}

// Draws the lines with the first line's middle at firstY.
function drawBlock({ canvas, ctx }, { lines, size }, firstY) {
  ctx.font = textFont(size);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Hebrew (and other right-to-left) quotes keep their punctuation on the correct side.
  ctx.direction = lines.some((line) => RTL_TEXT.test(line)) ? "rtl" : "ltr";
  lines.forEach((line, i) => {
    const y = firstY + i * size * LINE_HEIGHT;
    ctx.fillStyle = INK_HIGHLIGHT;
    ctx.fillText(line, canvas.width / 2, y + Math.max(1, size * 0.03));
    ctx.fillStyle = INK;
    ctx.fillText(line, canvas.width / 2, y);
  });
}

function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Narrows the wrap width as far as it goes while keeping the same number of lines, so the
// lines come out similar in length rather than ending on a short one.
function balancedWrap(ctx, text, maxWidth, lineCount) {
  let low = 0;
  let high = maxWidth;
  let best = wrap(ctx, text, maxWidth);
  for (let step = 0; step < 16; step++) {
    const mid = (low + high) / 2;
    const lines = wrap(ctx, text, mid);
    if (
      lines.length <= lineCount &&
      lines.every((l) => ctx.measureText(l).width <= mid)
    ) {
      best = lines;
      high = mid;
    } else {
      low = mid;
    }
  }
  return best;
}

// mulberry32: a tiny deterministic generator, so the grain and the day's shuffle are stable.
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
