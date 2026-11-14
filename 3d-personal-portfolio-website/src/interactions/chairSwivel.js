import * as THREE from "three";

import { easePushAndCoast } from "../util/easing.js";
import { connectedPieces } from "../util/geometry.js";

// The desk chair is one object, so at load its upper half (seat, back, arms, mechanism,
// upper gas-lift sleeve) is split into its own meshes and hung from a pivot on the gas
// column's axis. The star base, wheels and lower sleeve stay put. Pieces are moved whole,
// never cut, so nothing twists; the lower sleeve is a cylinder around the axis, so the
// seat turning above it looks like a real swivel.

const CHAIR_NAME = THREE.PropertyBinding.sanitizeNodeName("SM_Desk armchair");

// Heights above the chair's lowest point, in metres. Pieces whose lowest point is above
// SWIVEL_CUT turn; the base tops out around 0.125 and the upper parts start around 0.2.
const SWIVEL_CUT = 0.15;
// The gas column sits between the base and the seat mechanism; its centre is the axis.
const COLUMN_BAND = [0.14, 0.28];

// Each click turns the chair by a random amount, so the backrest lands somewhere new, and
// slows to a stop like a real swivel. It never turns through anything in the room (the
// desk): blocked angles are found at load and the turn goes the way that stays clear.
const MIN_TURN_DEG = 70;
const MAX_TURN_DEG = 200;
const SECONDS_PER_TURN_DEG = 0.009;
const MIN_SWIVEL_SECONDS = 1;
// The tap itself can stall a frame (raycasts); don't let that time jump the first step.
const MAX_FIRST_STEP_SECONDS = 1 / 60;
// Room pieces are treated as solid boxes, padded so the chair stops just short of them.
const OBSTACLE_MARGIN = 0.01;

export function createChairSwivel({ root, ray }) {
  const chair = root.getObjectByName(CHAIR_NAME);
  if (!chair) {
    console.warn(`chairSwivel: no "${CHAIR_NAME}" in the room`);
    return null;
  }
  root.updateMatrixWorld(true);

  const meshes = [];
  chair.traverse((child) => child.isMesh && meshes.push(child));
  const floorY = new THREE.Box3().setFromObject(chair).min.y;

  const axisPoint = findColumnAxis(meshes, floorY);
  if (!axisPoint) {
    console.warn("chairSwivel: could not find the gas column");
    return null;
  }

  // The pivot lives in the chair's own space so the chair's transform still applies.
  const pivot = new THREE.Object3D();
  pivot.name = "chair_swivel_pivot";
  pivot.position.copy(chair.worldToLocal(axisPoint.clone()));
  chair.add(pivot);
  const chairRotation = chair.getWorldQuaternion(new THREE.Quaternion()).invert();
  const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(chairRotation).normalize();

  let swivelReach = 0;
  for (const mesh of meshes) {
    const upper = splitUpperPart(mesh, floorY + SWIVEL_CUT);
    if (!upper) continue;
    pivot.attach(upper);
    swivelReach = Math.max(swivelReach, horizontalReach(upper, axisPoint));
  }
  if (pivot.children.length === 0) {
    console.warn("chairSwivel: found nothing above the base to swivel");
    return null;
  }

  // A cheap first check covering every pose: the chair's height and a full circle of the
  // swivelling parts. It's large, so the hit must land on the chair itself (`exact`).
  const chairBox = new THREE.Box3().setFromObject(chair);
  const hitBox = new THREE.Box3(
    new THREE.Vector3(
      axisPoint.x - swivelReach,
      chairBox.min.y,
      axisPoint.z - swivelReach,
    ),
    new THREE.Vector3(
      axisPoint.x + swivelReach,
      chairBox.max.y,
      axisPoint.z + swivelReach,
    ),
  );

  const blocked = findBlockedAngles({
    root,
    chair,
    pivot,
    axisPoint,
    reach: swivelReach,
  });

  let angle = 0;
  let swivel = null;

  function isPointedAt(e) {
    return ray.pointsAt(e, { box: hitBox, target: chair, scene: root, exact: true });
  }

  // Hover only shows the pointer cursor; the chair turns on click.
  function hoverAt(e) {
    return isPointedAt(e);
  }

  function clearHover() {}

  function tapAt(e) {
    if (!isPointedAt(e)) return false;
    // Plan from the nearest whole degree so the chair lands exactly on a checked angle.
    const startDeg = Math.round(THREE.MathUtils.radToDeg(angle));
    const turnDeg = pickTurn(blocked, startDeg);
    if (turnDeg === 0) return true;
    swivel = {
      from: angle,
      to: THREE.MathUtils.degToRad(startDeg + turnDeg),
      duration: Math.max(MIN_SWIVEL_SECONDS, Math.abs(turnDeg) * SECONDS_PER_TURN_DEG),
      elapsed: 0,
    };
    return true;
  }

  function update(dt) {
    if (!swivel) return;
    swivel.elapsed += swivel.elapsed === 0 ? Math.min(dt, MAX_FIRST_STEP_SECONDS) : dt;
    const t = Math.min(swivel.elapsed / swivel.duration, 1);
    angle = THREE.MathUtils.lerp(swivel.from, swivel.to, easePushAndCoast(t));
    pivot.quaternion.setFromAxisAngle(axis, angle);
    if (t === 1) swivel = null;
  }

  return { hoverAt, clearHover, tapAt, update };
}

// A random signed turn in whole degrees, MIN–MAX_TURN_DEG long, that never crosses a
// blocked angle. Falls back to the longest clear turn if nothing that long is free.
function pickTurn(blocked, startDeg) {
  const start = wrapDegrees(startDeg);
  const options = [];
  let longest = 0;
  for (const direction of [1, -1]) {
    for (let step = 1; step < 360; step++) {
      if (blocked[wrapDegrees(start + direction * step)]) break;
      if (step > Math.abs(longest)) longest = direction * step;
      if (step >= MIN_TURN_DEG && step <= MAX_TURN_DEG) options.push(direction * step);
    }
  }
  if (options.length === 0) return longest;
  return options[Math.floor(Math.random() * options.length)];
}

function wrapDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

// For each whole-degree swivel angle (relative to the modelled pose), whether the
// swivelling parts would overlap something in the room. Every connected piece of nearby
// objects is treated as a solid box; pieces the chair already touches as modelled (like
// the room shell around it) are ignored.
function findBlockedAngles({ root, chair, pivot, axisPoint, reach }) {
  const seat = [];
  pivot.traverse((child) => {
    if (child.isMesh) seat.push(...uniqueWorldVertices(child));
  });
  const seatY = seat.map((v) => v.y);
  const swing = new THREE.Box3(
    new THREE.Vector3(axisPoint.x - reach, Math.min(...seatY), axisPoint.z - reach),
    new THREE.Vector3(axisPoint.x + reach, Math.max(...seatY), axisPoint.z + reach),
  );

  const chairMeshes = new Set();
  chair.traverse((child) => child.isMesh && chairMeshes.add(child));
  const obstacles = [];
  root.traverse((object) => {
    if (!object.isMesh || chairMeshes.has(object)) return;
    if (!new THREE.Box3().setFromObject(object).intersectsBox(swing)) return;
    for (const box of pieceBoxes(object)) {
      if (!box.intersectsBox(swing)) continue;
      box.expandByScalar(OBSTACLE_MARGIN);
      if (!seat.some((v) => box.containsPoint(v)))
        obstacles.push(withRing(box, axisPoint));
    }
  });

  const cos = [];
  const sin = [];
  for (let degrees = 0; degrees < 360; degrees++) {
    cos.push(Math.cos(THREE.MathUtils.degToRad(degrees)));
    sin.push(Math.sin(THREE.MathUtils.degToRad(degrees)));
  }

  const blocked = new Array(360).fill(false);
  const point = new THREE.Vector3();
  for (const vertex of seat) {
    const dx = vertex.x - axisPoint.x;
    const dz = vertex.z - axisPoint.z;
    const radius = Math.hypot(dx, dz);
    for (const { box, minRadius, maxRadius } of obstacles) {
      // Only boxes this vertex could ever reach: right height, right distance from the axis.
      if (vertex.y < box.min.y || vertex.y > box.max.y) continue;
      if (radius < minRadius || radius > maxRadius) continue;
      for (let degrees = 0; degrees < 360; degrees++) {
        if (blocked[degrees]) continue;
        // Same rotation as the pivot: about world up, three.js's right-handed convention.
        point.set(
          axisPoint.x + dx * cos[degrees] + dz * sin[degrees],
          vertex.y,
          axisPoint.z - dx * sin[degrees] + dz * cos[degrees],
        );
        if (box.containsPoint(point)) blocked[degrees] = true;
      }
    }
  }
  return blocked;
}

// The horizontal distances from the axis at which a point can be inside `box`.
function withRing(box, axisPoint) {
  const nearestX = THREE.MathUtils.clamp(axisPoint.x, box.min.x, box.max.x);
  const nearestZ = THREE.MathUtils.clamp(axisPoint.z, box.min.z, box.max.z);
  const farthestX = Math.max(
    Math.abs(box.min.x - axisPoint.x),
    Math.abs(box.max.x - axisPoint.x),
  );
  const farthestZ = Math.max(
    Math.abs(box.min.z - axisPoint.z),
    Math.abs(box.max.z - axisPoint.z),
  );
  return {
    box,
    minRadius: Math.hypot(nearestX - axisPoint.x, nearestZ - axisPoint.z),
    maxRadius: Math.hypot(farthestX, farthestZ),
  };
}

// World-space bounding box of each connected piece of a mesh.
function pieceBoxes(mesh) {
  const { geometry } = mesh;
  const positions = geometry.getAttribute("position");
  if (!geometry.index) return [new THREE.Box3().setFromObject(mesh)];

  const find = connectedPieces(geometry);
  const boxes = new Map();
  const vertex = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    const piece = find(i);
    if (!boxes.has(piece)) boxes.set(piece, new THREE.Box3());
    boxes
      .get(piece)
      .expandByPoint(
        vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld),
      );
  }
  return [...boxes.values()];
}

// World positions of the vertices a mesh's triangles actually use.
function uniqueWorldVertices(mesh) {
  const positions = mesh.geometry.getAttribute("position");
  const used = new Set(mesh.geometry.index.array);
  return [...used].map((i) =>
    new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld),
  );
}

// Centre of the gas column: the narrow band of vertices between the base and the seat.
function findColumnAxis(meshes, floorY) {
  const box = new THREE.Box3();
  const vertex = new THREE.Vector3();
  const [low, high] = COLUMN_BAND.map((height) => floorY + height);
  for (const mesh of meshes) {
    const positions = mesh.geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
      if (vertex.y >= low && vertex.y <= high) box.expandByPoint(vertex);
    }
  }
  return box.isEmpty() ? null : box.getCenter(new THREE.Vector3());
}

// Moves the triangles of every connected piece whose lowest point is above `cutY` into a
// new mesh sharing the same vertex data, and returns it (or null if there are none).
function splitUpperPart(mesh, cutY) {
  const { geometry } = mesh;
  const index = geometry.index;
  const positions = geometry.getAttribute("position");
  if (!index) return null;

  const lowestY = lowestPointPerPiece(geometry, mesh.matrixWorld);
  const upperTriangles = [];
  const lowerTriangles = [];
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const target = lowestY[a] > cutY ? upperTriangles : lowerTriangles;
    target.push(a, index.getX(i + 1), index.getX(i + 2));
  }
  if (upperTriangles.length === 0) return null;

  const IndexArray = positions.count > 65535 ? Uint32Array : Uint16Array;
  const upperGeometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    upperGeometry.setAttribute(name, attribute);
  }
  upperGeometry.setIndex(new THREE.BufferAttribute(new IndexArray(upperTriangles), 1));
  geometry.setIndex(new THREE.BufferAttribute(new IndexArray(lowerTriangles), 1));

  const upper = new THREE.Mesh(upperGeometry, mesh.material);
  upper.name = `${mesh.name}_swivel`;
  upper.castShadow = mesh.castShadow;
  upper.receiveShadow = mesh.receiveShadow;
  upper.position.copy(mesh.position);
  upper.quaternion.copy(mesh.quaternion);
  upper.scale.copy(mesh.scale);
  mesh.parent.add(upper);
  upper.updateMatrixWorld(true);
  return upper;
}

// For each vertex, the world-space lowest point of the connected piece it belongs to.
function lowestPointPerPiece(geometry, matrixWorld) {
  const positions = geometry.getAttribute("position");
  const find = connectedPieces(geometry);

  const lowestByPiece = new Map();
  const worldY = new Float32Array(positions.count);
  const vertex = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    worldY[i] = vertex.fromBufferAttribute(positions, i).applyMatrix4(matrixWorld).y;
    const piece = find(i);
    lowestByPiece.set(piece, Math.min(lowestByPiece.get(piece) ?? Infinity, worldY[i]));
  }
  return Float32Array.from(worldY, (_, i) => lowestByPiece.get(find(i)));
}

// Furthest horizontal distance of the mesh's referenced vertices from the axis.
function horizontalReach(mesh, axisPoint) {
  const positions = mesh.geometry.getAttribute("position");
  const index = mesh.geometry.index;
  const vertex = new THREE.Vector3();
  let reach = 0;
  for (let i = 0; i < index.count; i++) {
    vertex.fromBufferAttribute(positions, index.getX(i)).applyMatrix4(mesh.matrixWorld);
    reach = Math.max(reach, Math.hypot(vertex.x - axisPoint.x, vertex.z - axisPoint.z));
  }
  return reach;
}
