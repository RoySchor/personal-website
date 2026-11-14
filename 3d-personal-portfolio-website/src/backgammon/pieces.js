import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { easeInOutCubic } from "../util/easing.js";

// Checkers, dice and move markers for the backgammon board. All positions are world space.

const CHECKER_COLORS = [new THREE.Color(0xa3161a), new THREE.Color(0x161616)];
const HOP_HEIGHT = 0.02;

// All checkers share one draw call. Each starts where its modelled twin sits.
export function createCheckers({ layout, colorOf }) {
  const geometry = islandGeometry(layout.checkerMesh, layout.checkerIslands[0]);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.05 });
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
  const color = new THREE.Color();
  const checkers = layout.checkerIslands.map((island, i) => ({
    position: island.center.clone(),
    tween: null,
    scale: 1,
    targetScale: 1,
    baseColor: CHECKER_COLORS[colorOf(i)].clone(),
    glow: 0,
    lift: 0,
    dirty: true,
  }));
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

  // Brightens a checker in its own colour (glow 0-1) and raises it off the board.
  function setGlow(i, amount, lift = 0) {
    if (checkers[i].glow === amount && checkers[i].lift === lift) return;
    checkers[i].glow = amount;
    checkers[i].lift = lift;
    checkers[i].dirty = true;
  }

  function setVisible(i, visible) {
    checkers[i].targetScale = visible ? 1 : 0;
  }

  function update(dt) {
    let matricesChanged = false;
    let colorsChanged = false;
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
      color.copy(checker.baseColor).offsetHSL(0, 0, checker.glow * 0.35);
      mesh.setColorAt(i, color);
      matricesChanged = true;
      colorsChanged = true;
    });
    if (matricesChanged) mesh.instanceMatrix.needsUpdate = true;
    if (colorsChanged && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  update(0);
  return { mesh, count, moveTo, setGlow, setVisible, update };
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

  return { meshes: dice.map((d) => d.mesh), roll, setUsed, hide, update };
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

// Flat rings that mark where the selected checker can go.
export function createMarkers({ layout, count = 4 }) {
  const geometry = new THREE.RingGeometry(
    layout.diameter * 0.26,
    layout.diameter * 0.5,
    32,
  );
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color: 0x3dff8a,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    toneMapped: false,
  });
  const group = new THREE.Group();
  group.name = "backgammon_markers";
  const rings = Array.from({ length: count }, () => {
    const ring = new THREE.Mesh(geometry, material);
    ring.visible = false;
    ring.renderOrder = 2;
    group.add(ring);
    return ring;
  });
  let time = 0;

  function show(positions) {
    rings.forEach((ring, i) => {
      ring.visible = i < positions.length;
      if (ring.visible) ring.position.copy(positions[i]);
    });
  }

  function update(dt) {
    time += dt;
    material.opacity = 0.8 + 0.2 * Math.sin(time * 6);
  }

  return { group, show, update };
}
