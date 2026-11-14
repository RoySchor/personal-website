import * as THREE from "three";

import { easeInOutCubic } from "../util/easing.js";
import { connectedPieces, toFloatArray } from "../util/geometry.js";

// The cube is a single object, but its cubies and stickers are separate vertex islands
// inside it, laid out on a 3×3×3 grid spanning -1..1 in the cube's local space. A face
// turn rotates every island in that layer 90° about the cube's centre. The cube keeps
// whatever state it ends up in, so it gets more scrambled the more it's played with.

const CUBE_NAME = "Rubiks";

const TURN_MS = 280;
// Pause between consecutive turns while hovered.
const PAUSE_MS = 80;
// Turns played by a tap on touch devices.
const TAP_TURNS = 3;
// Layers meet at ±1/3 along each axis.
const LAYER_BOUNDARY = 1 / 3;
// An island's faces can lie exactly on a layer boundary (the hidden inner faces), so it is
// classified by a point stepped back against its normal, into the cubie it belongs to.
const INWARD_STEP = 0.1;

// For a turn about `axis`, the two coordinates that rotate, in right-handed order.
const ROTATING_AXES = [
  [1, 2],
  [2, 0],
  [0, 1],
];

export function createRubiksTurns({ root, ray }) {
  const cube = root.getObjectByName(CUBE_NAME);
  if (!cube) {
    console.warn(`rubiksTurns: no "${CUBE_NAME}" in the room`);
    return null;
  }

  const meshes = cube.isMesh ? [cube] : cube.children.filter((child) => child.isMesh);
  const parts = meshes.map(createPart);

  const hitBox = new THREE.Box3().setFromObject(cube).expandByScalar(0.01);

  let hovered = false;
  let tapTurnsLeft = 0;
  let turn = null;
  let pauseLeft = 0;
  let lastAxis = -1;

  function isPointedAt(e) {
    return ray.pointsAt(e, { box: hitBox, target: cube, scene: root });
  }

  // Returns true when the pointer is over the cube.
  function hoverAt(e) {
    hovered = isPointedAt(e);
    return hovered;
  }

  function clearHover() {
    hovered = false;
  }

  // Returns true when the tap landed on the cube.
  function tapAt(e) {
    if (!isPointedAt(e)) return false;
    // A mouse click lands while already hovered, which animates on its own; the timed
    // burst is for touch taps, which never hover.
    if (!hovered) tapTurnsLeft = TAP_TURNS;
    return true;
  }

  function startTurn() {
    // Never turn about the same axis twice in a row; it reads as one slow move.
    const axis = [0, 1, 2].filter((a) => a !== lastAxis)[Math.floor(Math.random() * 2)];
    const layer = Math.random() < 0.5 ? -1 : 1;
    const direction = Math.random() < 0.5 ? -1 : 1;
    lastAxis = axis;

    const moving = [];
    for (const part of parts) {
      for (const island of part.islands) {
        const coordinate = island.anchor.getComponent(axis);
        if (layer * coordinate > LAYER_BOUNDARY) moving.push({ part, island });
      }
    }
    turn = { axis, direction, moving, elapsed: 0 };
  }

  function applyTurn(angle) {
    const [u, v] = ROTATING_AXES[turn.axis];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (const { part, island } of turn.moving) {
      rotateVertices(
        part.restPositions,
        part.positions.array,
        island.vertices,
        u,
        v,
        cos,
        sin,
      );
      rotateVertices(
        part.restNormals,
        part.normals.array,
        island.vertices,
        u,
        v,
        cos,
        sin,
      );
      part.positions.needsUpdate = true;
      part.normals.needsUpdate = true;
    }
  }

  // Bake the finished quarter turn into the rest state. cos/sin are exactly 0/±1, so
  // coordinates are only swapped and negated and the cube never drifts off its grid.
  function finishTurn() {
    const [u, v] = ROTATING_AXES[turn.axis];
    const sin = turn.direction;
    const touchedParts = new Set();
    for (const { part, island } of turn.moving) {
      rotateVertices(
        part.restPositions,
        part.restPositions,
        island.vertices,
        u,
        v,
        0,
        sin,
      );
      rotateVertices(part.restNormals, part.restNormals, island.vertices, u, v, 0, sin);
      touchedParts.add(part);

      const anchorU = island.anchor.getComponent(u);
      const anchorV = island.anchor.getComponent(v);
      island.anchor.setComponent(u, -anchorV * sin);
      island.anchor.setComponent(v, anchorU * sin);
    }
    for (const part of touchedParts) {
      part.positions.array.set(part.restPositions);
      part.normals.array.set(part.restNormals);
      part.positions.needsUpdate = true;
      part.normals.needsUpdate = true;
    }
    turn = null;
  }

  function update(dt) {
    if (turn) {
      turn.elapsed += dt * 1000;
      const t = Math.min(turn.elapsed / TURN_MS, 1);
      if (t < 1) {
        applyTurn(turn.direction * (Math.PI / 2) * easeInOutCubic(t));
        return;
      }
      finishTurn();
      pauseLeft = PAUSE_MS;
    }

    if (!hovered && tapTurnsLeft === 0) return;
    if (pauseLeft > 0) {
      pauseLeft -= dt * 1000;
      return;
    }
    if (!hovered) tapTurnsLeft--;
    startTurn();
  }

  return { hoverAt, clearHover, tapAt, update };
}

function createPart(mesh) {
  const { geometry } = mesh;
  // Positions and normals are quantized ints; copy them to floats so they can rotate freely.
  const restPositions = toFloatArray(geometry.getAttribute("position"));
  const restNormals = toFloatArray(geometry.getAttribute("normal"));
  const positions = new THREE.BufferAttribute(restPositions.slice(), 3);
  const normals = new THREE.BufferAttribute(restNormals.slice(), 3);
  positions.setUsage(THREE.DynamicDrawUsage);
  normals.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positions);
  geometry.setAttribute("normal", normals);
  // Each color's stickers move around the cube, outside their original bounds.
  mesh.frustumCulled = false;

  const islands = findIslands(geometry).map((vertices) => ({
    vertices,
    anchor: inwardAnchor(restPositions, restNormals, vertices),
  }));
  return { positions, normals, restPositions, restNormals, islands };
}

// Lists the vertices of each connected piece.
function findIslands(geometry) {
  const vertexCount = geometry.getAttribute("position").count;
  const find = connectedPieces(geometry);
  const groups = new Map();
  for (let i = 0; i < vertexCount; i++) {
    const rootIndex = find(i);
    if (!groups.has(rootIndex)) groups.set(rootIndex, []);
    groups.get(rootIndex).push(i);
  }
  return [...groups.values()].map((vertices) => Uint32Array.from(vertices));
}

function inwardAnchor(positions, normals, vertices) {
  const center = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (const i of vertices) {
    center.x += positions[i * 3];
    center.y += positions[i * 3 + 1];
    center.z += positions[i * 3 + 2];
    normal.x += normals[i * 3];
    normal.y += normals[i * 3 + 1];
    normal.z += normals[i * 3 + 2];
  }
  center.divideScalar(vertices.length);
  if (normal.lengthSq() > 0) normal.normalize();
  return center.addScaledVector(normal, -INWARD_STEP);
}

function rotateVertices(source, target, vertices, u, v, cos, sin) {
  for (const i of vertices) {
    const a = source[i * 3 + u];
    const b = source[i * 3 + v];
    target[i * 3 + u] = a * cos - b * sin;
    target[i * 3 + v] = a * sin + b * cos;
  }
}
