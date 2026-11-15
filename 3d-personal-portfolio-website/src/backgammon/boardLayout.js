import * as THREE from "three";

import { BAR, OFF, RED } from "./rules.js";
import { connectedPieces } from "../util/geometry.js";

// Reads the playable layout out of the modelled board. The board is one object with a mesh
// per material; each point triangle, tray and checker is a separate piece of it.
//
// Points are numbered from the visitor's (red's) side: the visitor sits at the long edge
// facing the room's default camera, 1-12 run right to left along the near row and 13-24
// left to right along the far row, so red's home board and bear-off tray are on the right.

const BOARD_NAME = "BG_Pocket_R";
const POINT_MATERIALS = ["BG_PointLight", "BG_PointDark"];
const FIELD_MATERIAL = "BG_FieldLeather";
const CHECKER_MATERIAL = "BG_ChipWhite";
const STACK_GAP = 0.0015;
const PER_COLUMN = 5;

export function readBoardLayout(root, camera) {
  const board = root.getObjectByName(BOARD_NAME);
  if (!board) {
    console.warn(`backgammon: no "${BOARD_NAME}" in the room`);
    return null;
  }
  root.updateMatrixWorld(true);
  const meshes = [];
  board.traverse((child) => child.isMesh && meshes.push(child));
  const byMaterial = (names) =>
    meshes.filter((mesh) => names.includes(mesh.material?.name));

  const pointIslands = byMaterial(POINT_MATERIALS).flatMap(worldIslands);
  const checkerMesh = byMaterial([CHECKER_MATERIAL])[0];
  const checkerIslands = checkerMesh ? worldIslands(checkerMesh) : [];
  if (pointIslands.length !== 24 || checkerIslands.length < 30) {
    console.warn(
      `backgammon: expected 24 points and 30+ checkers, found ${pointIslands.length} and ${checkerIslands.length}`,
    );
    return null;
  }

  const boardBox = new THREE.Box3().setFromObject(board);
  const center = boardBox.getCenter(new THREE.Vector3());
  const up = new THREE.Vector3(0, 1, 0);

  // The rows run along the board's longer horizontal side.
  const size = boardBox.getSize(new THREE.Vector3());
  const long = size.x >= size.z ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  const across = new THREE.Vector3().crossVectors(up, long);
  // The visitor's edge is the one facing the room's default camera.
  const toVisitor = across.clone();
  if (camera.position.clone().sub(center).dot(toVisitor) < 0) toVisitor.negate();
  const right = toVisitor.clone().negate().cross(up).normalize();

  const along = (v) => v.clone().sub(center).dot(right);
  const side = (v) => v.clone().sub(center).dot(toVisitor);

  const near = pointIslands
    .filter((p) => side(p.center) > 0)
    .sort((a, b) => along(b.center) - along(a.center));
  const far = pointIslands
    .filter((p) => side(p.center) < 0)
    .sort((a, b) => along(a.center) - along(b.center));
  const surfaceY = Math.max(...pointIslands.map((p) => p.box.max.y));

  const checkerSize = checkerIslands[0].box.getSize(new THREE.Vector3());
  const diameter = Math.max(checkerSize.x, checkerSize.z);
  const thickness = checkerSize.y;
  const pointLength = Math.abs(near[0].box.getSize(new THREE.Vector3()).dot(toVisitor));
  const columnPitch = Math.abs(along(near[0].center) - along(near[1].center));

  // points[n] for n = 1..24: where the point's wide end meets the rail, and the inward
  // direction checkers stack toward.
  const points = [null];
  for (const island of [...near, ...far]) {
    const outward = toVisitor.clone().multiplyScalar(Math.sign(side(island.center)));
    const base = island.center.clone().addScaledVector(outward, pointLength / 2);
    base.y = surfaceY;
    points.push({ base, inward: outward.clone().negate(), along: along(island.center) });
  }

  const barAlong = (points[6].along + points[7].along) / 2;
  // The bear-off tray is the strip between red's 1-point column and the board's end rail.
  // Its leather is one piece with the playing field, so it is placed from those edges.
  const field = byMaterial([FIELD_MATERIAL]).flatMap(worldIslands);
  if (field.length === 0) {
    console.warn("backgammon: could not find the board's playing field");
    return null;
  }
  const halfLong = Math.abs(size.dot(right)) / 2;
  const fieldEnd = Math.max(
    ...field.map((island) => along(island.box.max)),
    ...field.map((island) => along(island.box.min)),
  );
  const trayAlong =
    (points[1].along + columnPitch / 2 + Math.min(fieldEnd, halfLong)) / 2;
  const traySurfaceY = Math.max(...field.map((island) => island.box.max.y));
  const trayLength = Math.abs(field[0].box.getSize(new THREE.Vector3()).dot(toVisitor));

  const atRest = (position, layer = 0) => {
    position.y += thickness / 2 + layer * thickness;
    return position;
  };
  const onLine = (alongValue, sideValue, y) =>
    center
      .clone()
      .addScaledVector(right, alongValue)
      .addScaledVector(toVisitor, sideValue)
      .setY(y);

  // World position of the index-th checker (from the bottom of the stack) in a slot.
  function checkerPosition(player, slot, index, count) {
    if (slot === BAR) {
      // Each player's hit checkers wait on their own half of the bar.
      const dir = player === RED ? 1 : -1;
      return atRest(
        onLine(barAlong, dir * (diameter * 0.75 + index * diameter), surfaceY),
      );
    }
    if (slot === OFF) {
      // Borne-off checkers are piled in short stacks down the tray, red on the near half.
      const dir = player === RED ? 1 : -1;
      const pile = Math.floor(index / 3);
      const sideValue = dir * (diameter * 0.6 + pile * (diameter + STACK_GAP));
      const clamped =
        Math.sign(sideValue) *
        Math.min(Math.abs(sideValue), trayLength / 2 - diameter / 2);
      return atRest(onLine(trayAlong, clamped, traySurfaceY), index % 3);
    }
    // Slots are counted from the player's own side; the layout is numbered from red's.
    const point = points[player === RED ? slot : BAR - slot];
    const layer = Math.floor(index / PER_COLUMN);
    const inLayer = index % PER_COLUMN;
    const usable = pointLength - diameter;
    const stacked = Math.min(PER_COLUMN, count) - 1;
    // Keep tall stacks inside the point's length; later layers sit between the first.
    const spacing = Math.min(diameter + STACK_GAP, stacked > 0 ? usable / stacked : 0);
    const distance = diameter / 2 + STACK_GAP + inLayer * spacing + layer * (spacing / 2);
    return atRest(point.base.clone().addScaledVector(point.inward, distance), layer);
  }

  // Which slot a board-plane position falls in: 1-24, BAR, OFF, "board" or null.
  function slotAt(worldPoint) {
    const a = along(worldPoint);
    const s = side(worldPoint);
    const halfLong = Math.abs(size.clone().dot(right)) / 2;
    const halfAcross = Math.abs(size.clone().dot(toVisitor)) / 2;
    if (Math.abs(a) > halfLong || Math.abs(s) > halfAcross) return null;
    const row = s > 0 ? near : far;
    const start = s > 0 ? 1 : 13;
    for (let i = 0; i < 12; i++) {
      if (Math.abs(a - along(row[i].center)) <= columnPitch / 2) return start + i;
    }
    if (Math.abs(a - barAlong) <= columnPitch / 2) return BAR;
    // The tray is everything past the 1-point column, so it can never steal a point tap.
    if (a > points[1].along + columnPitch / 2) return OFF;
    return "board";
  }

  // Where to pile the dice: in the gap between the rows, in the roller's right-hand half.
  function diceSpot(player, which) {
    const half = (barAlong + (player === RED ? trayAlong : -trayAlong)) / 2;
    const offset = (which === 0 ? -1 : 1) * diameter * 0.9;
    return onLine(half + offset, 0, surfaceY);
  }

  return {
    board,
    boardBox,
    center,
    up,
    right,
    toVisitor,
    surfaceY,
    diameter,
    thickness,
    checkerMesh,
    checkerIslands,
    checkerPosition,
    slotAt,
    diceSpot,
  };
}

// The connected pieces of a mesh, each with its world-space box, centre and vertices.
export function worldIslands(mesh) {
  const positions = mesh.geometry.getAttribute("position");
  const find = solidPieces(mesh.geometry);
  const groups = new Map();
  const vertex = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    const key = find(i);
    if (!groups.has(key)) groups.set(key, { box: new THREE.Box3(), vertices: [] });
    vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
    groups.get(key).box.expandByPoint(vertex);
    groups.get(key).vertices.push(i);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    center: group.box.getCenter(new THREE.Vector3()),
  }));
}

// Like connectedPieces, but also joins vertices that share a position. The board is flat
// shaded, so each face has its own copies of its corners and shares no indices with its
// neighbours; matching positions are what hold a checker or point together.
function solidPieces(geometry) {
  const positions = geometry.getAttribute("position");
  const byTriangle = connectedPieces(geometry);
  const parent = Int32Array.from({ length: positions.count }, (_, i) => byTriangle(i));
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const firstAt = new Map();
  for (let i = 0; i < positions.count; i++) {
    const key = `${positions.getX(i)},${positions.getY(i)},${positions.getZ(i)}`;
    if (!firstAt.has(key)) firstAt.set(key, i);
    else parent[find(i)] = find(firstAt.get(key));
  }
  return find;
}
