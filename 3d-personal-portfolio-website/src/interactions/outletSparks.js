import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

// Clicking a wall outlet sets off a short electrical zap: jagged arcs crackling out of the
// faceplate, a flickering blue glow and a shower of sparks that fall and bounce. Effects
// live in the scene (not the room model) and are never raycast, so they can't block clicks.

const OUTLET_NAMES = ["Outlet 1", "Outlet 2"].map(THREE.PropertyBinding.sanitizeNodeName);

const ZAP_SECONDS = 0.7;
// Arcs are redrawn this often so they crackle rather than sit still.
const ARC_REFRESH_SECONDS = 0.05;
const ARC_COUNT = 3;
const ARC_SEGMENTS = 8;
// World-space metres.
const ARC_LENGTH = [0.035, 0.09];
const ARC_JITTER = 0.008;
const ARC_WIDTH_PX = 2;
const GLOW_SIZE = 0.16;
const SPARK_COUNT = 28;
const SPARK_SIZE = 0.012;
const SPARK_SPEED = [0.5, 1.3];
const SPARK_LIFE = [0.35, 0.75];
const SPARK_STAGGER_SECONDS = 0.15;
const GRAVITY = 6;
const BOUNCE = 0.3;

const ARC_COLOR = 0xcfeaff;
const GLOW_COLOR = 0x6fb8ff;
const SPARK_COLOR = new THREE.Color(0xffd27a);

export function createOutletSparks({ root, scene, ray }) {
  const roomCenter = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
  const outlets = OUTLET_NAMES.map((name) => root.getObjectByName(name))
    .filter(Boolean)
    .map((object) => describeOutlet(object, roomCenter));
  if (outlets.length === 0) {
    console.warn("outletSparks: no outlets in the room");
    return null;
  }

  const floor = root.getObjectByName("FloorPlanks");
  const floorY = floor ? new THREE.Box3().setFromObject(floor).max.y : 0;

  const effect = new THREE.Group();
  effect.name = "outlet_zap";
  effect.visible = false;
  scene.add(effect);

  const arcMaterial = new LineMaterial({
    color: ARC_COLOR,
    linewidth: ARC_WIDTH_PX,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const arcs = new LineSegments2(new LineSegmentsGeometry(), arcMaterial);
  arcs.frustumCulled = false;

  const glowTexture = createDotTexture();
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: GLOW_COLOR,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  glow.scale.setScalar(GLOW_SIZE);

  const sparkPositions = new Float32Array(SPARK_COUNT * 3);
  const sparkColors = new Float32Array(SPARK_COUNT * 3);
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
  sparkGeometry.setAttribute("color", new THREE.BufferAttribute(sparkColors, 3));
  const sparkPoints = new THREE.Points(
    sparkGeometry,
    new THREE.PointsMaterial({
      size: SPARK_SIZE,
      map: glowTexture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  sparkPoints.frustumCulled = false;

  for (const object of [arcs, glow, sparkPoints]) {
    object.raycast = () => {};
    effect.add(object);
  }

  const sparks = Array.from({ length: SPARK_COUNT }, () => ({
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    delay: 0,
    age: 0,
    life: 0,
  }));

  let zap = null;

  function outletAt(e) {
    return (
      outlets.find((outlet) =>
        ray.pointsAt(e, { box: outlet.hitBox, target: outlet.object, scene: root }),
      ) ?? null
    );
  }

  // Hover only shows the pointer cursor; the zap happens on click.
  function hoverAt(e) {
    return outletAt(e) !== null;
  }

  function clearHover() {}

  function tapAt(e) {
    const outlet = outletAt(e);
    if (!outlet) return false;
    startZap(outlet);
    return true;
  }

  function startZap(outlet) {
    zap = { outlet, elapsed: 0, sinceArcs: Infinity };
    glow.position.copy(outlet.faceCenter).addScaledVector(outlet.normal, 0.01);
    for (const spark of sparks) {
      spark.position.copy(randomPointOnFace(outlet, 0.5));
      spark.velocity
        .copy(outlet.normal)
        .addScaledVector(outlet.across, THREE.MathUtils.randFloatSpread(1.4))
        .addScaledVector(outlet.up, THREE.MathUtils.randFloat(-0.3, 1.2))
        .normalize()
        .multiplyScalar(THREE.MathUtils.randFloat(...SPARK_SPEED));
      spark.delay = Math.random() * SPARK_STAGGER_SECONDS;
      spark.age = 0;
      spark.life = THREE.MathUtils.randFloat(...SPARK_LIFE);
    }
    effect.visible = true;
  }

  function update(dt) {
    if (!zap) return;
    zap.elapsed += dt;
    const progress = Math.min(zap.elapsed / ZAP_SECONDS, 1);

    // Arcs crackle for most of the zap, then cut out; the glow fades with them.
    const arcsOn = progress < 0.85;
    arcs.visible = arcsOn;
    zap.sinceArcs += dt;
    if (arcsOn && zap.sinceArcs >= ARC_REFRESH_SECONDS) {
      zap.sinceArcs = 0;
      arcs.geometry.setPositions(buildArcs(zap.outlet));
      arcMaterial.opacity = THREE.MathUtils.randFloat(0.6, 1);
    }
    glow.material.opacity = arcsOn
      ? THREE.MathUtils.randFloat(0.5, 1) * (1 - progress)
      : 0;

    const sparksAlive = updateSparks(dt);
    if (progress === 1 && !sparksAlive) {
      effect.visible = false;
      zap = null;
    }
  }

  // Returns whether any spark is still alive.
  function updateSparks(dt) {
    let alive = false;
    sparks.forEach((spark, i) => {
      let brightness = 0;
      if (spark.delay > 0) {
        spark.delay -= dt;
        alive = true;
      } else if (spark.age < spark.life) {
        spark.age += dt;
        spark.velocity.y -= GRAVITY * dt;
        spark.position.addScaledVector(spark.velocity, dt);
        if (spark.position.y < floorY) {
          spark.position.y = floorY;
          spark.velocity.y *= -BOUNCE;
          spark.velocity.x *= 0.6;
          spark.velocity.z *= 0.6;
        }
        brightness = 1 - spark.age / spark.life;
        alive = true;
      }
      spark.position.toArray(sparkPositions, i * 3);
      SPARK_COLOR.toArray(sparkColors, i * 3);
      for (let c = 0; c < 3; c++) sparkColors[i * 3 + c] *= brightness;
    });
    sparkGeometry.attributes.position.needsUpdate = true;
    sparkGeometry.attributes.color.needsUpdate = true;
    return alive;
  }

  return { hoverAt, clearHover, tapAt, update };
}

// Face centre, outward normal and in-plane axes of a wall plate, from its bounding box:
// the thinnest dimension is the wall's normal, pointed toward the room's centre.
function describeOutlet(object, roomCenter) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const thinAxis = ["x", "y", "z"].reduce((a, b) => (size[b] < size[a] ? b : a));

  const normal = new THREE.Vector3();
  normal[thinAxis] = Math.sign(roomCenter[thinAxis] - center[thinAxis]) || 1;
  const up = new THREE.Vector3(0, 1, 0);
  const across = new THREE.Vector3().crossVectors(up, normal).normalize();
  const faceCenter = center.clone().addScaledVector(normal, size[thinAxis] / 2);

  return {
    object,
    normal,
    up,
    across,
    faceCenter,
    halfWidth: Math.abs(size.dot(across)) / 2,
    halfHeight: size.y / 2,
    hitBox: box.clone().expandByScalar(0.02),
  };
}

// A point on the faceplate, within `spread` (0–1) of its half-size from the centre.
function randomPointOnFace(outlet, spread) {
  return outlet.faceCenter
    .clone()
    .addScaledVector(
      outlet.across,
      THREE.MathUtils.randFloatSpread(2) * outlet.halfWidth * spread,
    )
    .addScaledVector(
      outlet.up,
      THREE.MathUtils.randFloatSpread(2) * outlet.halfHeight * spread,
    );
}

// Segment pairs for a few jagged arcs leaving the faceplate, each with a short branch.
function buildArcs(outlet) {
  const positions = [];
  for (let i = 0; i < ARC_COUNT; i++) {
    const start = randomPointOnFace(outlet, 0.6);
    const length = THREE.MathUtils.randFloat(...ARC_LENGTH);
    const end = start
      .clone()
      .addScaledVector(outlet.normal, length)
      .addScaledVector(outlet.across, THREE.MathUtils.randFloatSpread(length))
      .addScaledVector(outlet.up, THREE.MathUtils.randFloatSpread(length));
    const points = jaggedPath(start, end, ARC_SEGMENTS, outlet);
    pushSegments(positions, points);

    const forkAt = points[Math.floor(points.length / 2)];
    const forkEnd = forkAt
      .clone()
      .addScaledVector(outlet.normal, length * 0.4)
      .addScaledVector(outlet.across, THREE.MathUtils.randFloatSpread(length * 0.8))
      .addScaledVector(outlet.up, THREE.MathUtils.randFloatSpread(length * 0.8));
    pushSegments(positions, jaggedPath(forkAt, forkEnd, ARC_SEGMENTS / 2, outlet));
  }
  return positions;
}

function jaggedPath(start, end, segments, outlet) {
  const points = [start];
  for (let s = 1; s < segments; s++) {
    points.push(
      start
        .clone()
        .lerp(end, s / segments)
        .addScaledVector(outlet.across, THREE.MathUtils.randFloatSpread(2 * ARC_JITTER))
        .addScaledVector(outlet.up, THREE.MathUtils.randFloatSpread(2 * ARC_JITTER)),
    );
  }
  points.push(end);
  return points;
}

function pushSegments(positions, points) {
  for (let i = 0; i < points.length - 1; i++) {
    positions.push(...points[i].toArray(), ...points[i + 1].toArray());
  }
}

// Soft round dot, used for the glow and the sparks.
function createDotTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.5)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
