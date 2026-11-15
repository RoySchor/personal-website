import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { easeInOutCubic } from "../util/easing.js";

// Checkers (shown to players as "stones"), dice and move markers for the backgammon
// board. All positions are world space.

const CHECKER_COLORS = [new THREE.Color(0xa3161a), new THREE.Color(0x161616)];
const HOP_HEIGHT = 0.02;
// Blue reads clearly against red, black and the tan points for red-green colour vision
// deficiencies; markers also differ by shape so colour is never the only cue.
const MARKER_COLOR = 0x2f9bff;

// All checkers share one draw call. Each starts where its modelled twin sits.
export function createCheckers({ layout, colorOf }) {
  const geometry = islandGeometry(layout.checkerMesh, layout.checkerIslands[0]);
  // Satin rather than glossy: the room's environment map otherwise glares off the tops.
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.62,
    metalness: 0,
    envMapIntensity: 0.45,
  });
  const count = layout.checkerIslands.length;
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = "backgammon_checkers";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // Instances travel across the whole board; skip per-mesh culling.
  mesh.frustumCulled = false;

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scaleVector = new THREE.Vector3();
  const checkers = layout.checkerIslands.map((island, i) => {
    mesh.setColorAt(i, CHECKER_COLORS[colorOf(i)]);
    return {
      position: island.center.clone(),
      tween: null,
      scale: 1,
      targetScale: 1,
      lift: 0,
      dirty: true,
    };
  });
  const shown = new THREE.Vector3();

  // Moves a checker to `to`, hopping over the board when `hop` is set.
  function moveTo(i, to, { duration = 0.35, hop = false, delay = 0 } = {}) {
    const checker = checkers[i];
    if (checker.tween && checker.tween.to.equals(to)) return;
    if (!checker.tween && checker.position.equals(to)) return;
    checker.tween = {
      from: checker.position.clone(),
      to: to.clone(),
      duration,
      hop,
      elapsed: -delay,
    };
  }

  // Raises a checker off the board, e.g. while it's picked up.
  function setLift(i, lift) {
    if (checkers[i].lift === lift) return;
    checkers[i].lift = lift;
    checkers[i].dirty = true;
  }

  function setVisible(i, visible) {
    checkers[i].targetScale = visible ? 1 : 0;
  }

  function update(dt) {
    let matricesChanged = false;
    checkers.forEach((checker, i) => {
      if (checker.tween) {
        const tween = checker.tween;
        tween.elapsed += dt;
        const t = THREE.MathUtils.clamp(tween.elapsed / tween.duration, 0, 1);
        const k = easeInOutCubic(t);
        checker.position.lerpVectors(tween.from, tween.to, k);
        if (tween.hop) checker.position.y += HOP_HEIGHT * 4 * k * (1 - k);
        if (t === 1) checker.tween = null;
        checker.dirty = true;
      }
      if (checker.scale !== checker.targetScale) {
        const step = dt / 0.25;
        checker.scale += THREE.MathUtils.clamp(
          checker.targetScale - checker.scale,
          -step,
          step,
        );
        checker.dirty = true;
      }
      if (!checker.dirty) return;
      checker.dirty = false;
      scaleVector.setScalar(checker.scale);
      shown.copy(checker.position).setY(checker.position.y + checker.lift);
      matrix.compose(shown, quaternion, scaleVector);
      mesh.setMatrixAt(i, matrix);
      matricesChanged = true;
    });
    if (matricesChanged) mesh.instanceMatrix.needsUpdate = true;
  }

  update(0);
  return { mesh, count, moveTo, setLift, setVisible, update };
}

// Copies one island of a mesh into its own geometry, in world scale, centred on the origin.
function islandGeometry(mesh, island) {
  const source = mesh.geometry;
  const positions = source.getAttribute("position");
  const normals = source.getAttribute("normal");
  const keep = new Map(island.vertices.map((vertex, i) => [vertex, i]));
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  const outPositions = new Float32Array(island.vertices.length * 3);
  const outNormals = new Float32Array(island.vertices.length * 3);
  const v = new THREE.Vector3();
  island.vertices.forEach((vertex, i) => {
    v.fromBufferAttribute(positions, vertex)
      .applyMatrix4(mesh.matrixWorld)
      .sub(island.center);
    v.toArray(outPositions, i * 3);
    v.fromBufferAttribute(normals, vertex).applyMatrix3(normalMatrix).normalize();
    v.toArray(outNormals, i * 3);
  });
  const indices = [];
  const index = source.index;
  for (let i = 0; i < index.count; i += 3) {
    const a = keep.get(index.getX(i));
    if (a === undefined) continue;
    indices.push(a, keep.get(index.getX(i + 1)), keep.get(index.getX(i + 2)));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(outPositions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(outNormals, 3));
  geometry.setIndex(indices);
  return geometry;
}

// BoxGeometry faces are +x, -x, +y, -y, +z, -z; opposite faces add up to 7.
const FACE_VALUES = [3, 4, 1, 6, 2, 5];
const FACE_NORMALS = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];
const PIPS = {
  1: [[0.5, 0.5]],
  2: [
    [0.27, 0.27],
    [0.73, 0.73],
  ],
  3: [
    [0.27, 0.27],
    [0.5, 0.5],
    [0.73, 0.73],
  ],
  4: [
    [0.27, 0.27],
    [0.73, 0.27],
    [0.27, 0.73],
    [0.73, 0.73],
  ],
  5: [
    [0.27, 0.27],
    [0.73, 0.27],
    [0.5, 0.5],
    [0.27, 0.73],
    [0.73, 0.73],
  ],
  6: [
    [0.27, 0.25],
    [0.73, 0.25],
    [0.27, 0.5],
    [0.73, 0.5],
    [0.27, 0.75],
    [0.73, 0.75],
  ],
};
const ROLL_SECONDS = 0.8;

export function createDice({ layout }) {
  const size = layout.diameter * 0.6;
  const geometry = new RoundedBoxGeometry(size, size, size, 3, size * 0.16);
  const materials = FACE_VALUES.map(
    (value) => new THREE.MeshStandardMaterial({ map: pipTexture(value), roughness: 0.4 }),
  );
  const dice = [0, 1].map((which) => {
    const mesh = new THREE.Mesh(
      geometry,
      materials.map((m) => m.clone()),
    );
    mesh.name = `backgammon_die_${which}`;
    mesh.castShadow = true;
    mesh.visible = false;
    return { mesh, roll: null, used: false };
  });

  // Tosses the dice from the roller's edge so they land showing `values`.
  function roll(values, player) {
    dice.forEach((die, which) => {
      const land = layout.diceSpot(player, which);
      land.y += size / 2;
      const towardRoller = layout.toVisitor.clone().multiplyScalar(player === 0 ? 1 : -1);
      const start = land
        .clone()
        .addScaledVector(towardRoller, 0.12)
        .addScaledVector(layout.up, 0.07);
      const yaw = new THREE.Quaternion().setFromAxisAngle(
        layout.up,
        Math.random() * Math.PI * 2,
      );
      const face = FACE_NORMALS[FACE_VALUES.indexOf(values[which])];
      const final = yaw.multiply(
        new THREE.Quaternion().setFromUnitVectors(face, layout.up),
      );
      const spinAxis = new THREE.Vector3().randomDirection();
      die.roll = {
        start,
        land,
        final,
        spinAxis,
        spin: 9 + Math.random() * 6,
        elapsed: 0,
      };
      die.used = false;
      die.mesh.visible = true;
      tint(die);
    });
    return new Promise((resolve) => setTimeout(resolve, ROLL_SECONDS * 1000 + 50));
  }

  // Shows `values` at rest straight away, e.g. after an undo.
  function place(values, player) {
    dice.forEach((die, which) => {
      const land = layout.diceSpot(player, which);
      land.y += size / 2;
      const face = FACE_NORMALS[FACE_VALUES.indexOf(values[which])];
      die.roll = null;
      die.mesh.position.copy(land);
      die.mesh.quaternion.setFromUnitVectors(face, layout.up);
      die.mesh.visible = true;
    });
  }

  function setUsed(which, used) {
    dice[which].used = used;
    tint(dice[which]);
  }

  function tint(die) {
    for (const material of die.mesh.material)
      material.color.setScalar(die.used ? 0.45 : 1);
  }

  function hide() {
    dice.forEach((die) => (die.mesh.visible = false));
  }

  const spin = new THREE.Quaternion();
  function update(dt) {
    for (const die of dice) {
      if (!die.roll) continue;
      const r = die.roll;
      r.elapsed += dt;
      const t = Math.min(r.elapsed / ROLL_SECONDS, 1);
      const k = 1 - Math.pow(1 - t, 3);
      die.mesh.position.lerpVectors(r.start, r.land, k);
      // A falling arc, then two small bounces.
      if (t > 0.6)
        die.mesh.position.y +=
          Math.abs(Math.sin((t - 0.6) * Math.PI * 5)) * 0.012 * (1 - t);
      spin.setFromAxisAngle(r.spinAxis, r.spin * (1 - k));
      die.mesh.quaternion.copy(spin).multiply(r.final);
      if (t === 1) die.roll = null;
    }
  }

  return { meshes: dice.map((d) => d.mesh), roll, place, setUsed, hide, update };
}

function pipTexture(value) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f4efe3";
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#1a1a1a";
  for (const [x, y] of PIPS[value]) {
    ctx.beginPath();
    ctx.arc(x * 128, y * 128, 11, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Flat markers, all one colour but told apart by shape:
//   movable  - a thin steady ring around each checker that can move
//   selected - a thick solid ring around the picked-up checker
//   target   - a pulsing ring with a centre dot where the picked-up checker can land
export function createMarkers({ layout }) {
  const d = layout.diameter;
  const flatRing = (inner, outer) =>
    new THREE.RingGeometry(d * inner, d * outer, 40).rotateX(-Math.PI / 2);
  const pulsing = markerMaterial();
  const solid = markerMaterial();
  const kinds = {
    movable: pool(16, () => new THREE.Mesh(flatRing(0.52, 0.67), solid)),
    selected: pool(1, () => new THREE.Mesh(flatRing(0.52, 0.7), solid)),
    target: pool(4, () => {
      const ring = new THREE.Mesh(flatRing(0.3, 0.48), pulsing);
      const dot = new THREE.Mesh(
        new THREE.CircleGeometry(d * 0.12, 24).rotateX(-Math.PI / 2),
        pulsing,
      );
      ring.add(dot);
      return ring;
    }),
  };
  const group = new THREE.Group();
  group.name = "backgammon_markers";
  for (const meshes of Object.values(kinds)) group.add(...meshes);
  let time = 0;

  function pool(count, make) {
    return Array.from({ length: count }, () => {
      const mesh = make();
      mesh.visible = false;
      mesh.renderOrder = 2;
      return mesh;
    });
  }

  // Each argument is a list of positions (the selected one has at most one).
  function show({ movable = [], selected = [], target = [] } = {}) {
    for (const [kind, positions] of Object.entries({ movable, selected, target })) {
      kinds[kind].forEach((mesh, i) => {
        mesh.visible = i < positions.length;
        if (mesh.visible) mesh.position.copy(positions[i]);
      });
    }
  }

  function update(dt) {
    time += dt;
    pulsing.opacity = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(time * 6));
  }

  return { group, show, update };
}

function markerMaterial() {
  return new THREE.MeshBasicMaterial({
    color: MARKER_COLOR,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}
