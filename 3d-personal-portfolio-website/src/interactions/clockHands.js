import * as THREE from "three";

import { easeInOutCubic } from "../util/easing.js";

// The wall clock's hands were modelled with their origins halfway along each hand, so
// rotating them in place would swing them around their middles. Instead each hand is
// re-parented, without moving, onto a pivot at the clock's centre, and the pivot turns
// about the face's normal to show the visitor's local time.
//
// Hovering fast-forwards time (both hands driven by the same clock, so a full turn of the
// minute hand moves the hour hand one hour); leaving rewinds quickly back to real time.

const sanitize = THREE.PropertyBinding.sanitizeNodeName;
const BODY_NAME = "Clock_body";
const MINUTE_HAND_NAME = sanitize("Minute  Hand");
const HOUR_HAND_NAME = sanitize("Hour Hand");

const FULL_TURN = Math.PI * 2;
const MINUTES_PER_HALF_DAY = 12 * 60;

// One minute-hand revolution every 1.2 s while hovered, eased in over SPIN_RAMP_SECONDS.
const SPIN_MINUTES_PER_SECOND = 50;
const SPIN_RAMP_SECONDS = 0.3;
// Rewind speed after hover ends, clamped to a duration range so it always feels quick.
const REWIND_MINUTES_PER_SECOND = 260;
const REWIND_MIN_SECONDS = 0.45;
const REWIND_MAX_SECONDS = 1.7;
// How long a tap on touch devices spins before rewinding.
const TAP_SPIN_MS = 1500;

export function createClockHands({ root, ray }) {
  const body = root.getObjectByName(BODY_NAME);
  const minuteHand = root.getObjectByName(MINUTE_HAND_NAME);
  const hourHand = root.getObjectByName(HOUR_HAND_NAME);
  if (!body || !minuteHand || !hourHand) {
    console.warn("clockHands: could not find the clock body and both hands");
    return null;
  }

  root.updateMatrixWorld(true);
  const center = new THREE.Box3().setFromObject(body).getCenter(new THREE.Vector3());

  // The face is a thin disc along its local Y; point the normal out of the front, where
  // the hands are.
  const front = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(body.getWorldQuaternion(new THREE.Quaternion()))
    .normalize();
  const towardHands = minuteHand.getWorldPosition(new THREE.Vector3()).sub(center);
  if (front.dot(towardHands) < 0) front.negate();

  // Seen from the front, a positive turn about an axis pointing away from the viewer is
  // clockwise. 12 o'clock is straight up the wall, 3 o'clock a quarter turn clockwise.
  const clockwiseAxis = front.clone().negate();
  const twelve = new THREE.Vector3(0, 1, 0).projectOnPlane(front);
  if (twelve.lengthSq() < 1e-6) {
    console.warn("clockHands: the clock face isn't upright, so 12 o'clock is undefined");
    return null;
  }
  twelve.normalize();
  const three = twelve.clone().applyAxisAngle(clockwiseAxis, Math.PI / 2);

  const mount = (hand) => mountOnPivot(hand, { center, clockwiseAxis, twelve, three });
  const minute = mount(minuteHand);
  const hour = mount(hourHand);

  // Hands sweep within the face, so the face plus the hands' current pose covers them.
  const hitBox = new THREE.Box3()
    .setFromObject(body)
    .expandByObject(minuteHand)
    .expandByObject(hourHand)
    .expandByScalar(0.01);
  const targets = [body, minuteHand, hourHand];

  let hovered = false;
  let tapSpinUntil = 0;
  let offsetMinutes = 0;
  let spinRamp = 0;
  let rewind = null;

  function isPointedAt(e) {
    return ray.pointsAt(e, { box: hitBox, target: targets, scene: root });
  }

  // Returns true when the pointer is over the clock.
  function hoverAt(e) {
    hovered = isPointedAt(e);
    return hovered;
  }

  function clearHover() {
    hovered = false;
  }

  // Returns true when the tap landed on the clock.
  function tapAt(e) {
    if (!isPointedAt(e)) return false;
    // A mouse click lands while already hovered, which animates on its own; the timed
    // burst is for touch taps, which never hover.
    if (!hovered) tapSpinUntil = performance.now() + TAP_SPIN_MS;
    return true;
  }

  function advanceOffset(dt) {
    if (hovered || performance.now() < tapSpinUntil) {
      rewind = null;
      spinRamp = Math.min(1, spinRamp + dt / SPIN_RAMP_SECONDS);
      offsetMinutes += SPIN_MINUTES_PER_SECOND * spinRamp * dt;
      return;
    }
    spinRamp = 0;
    if (offsetMinutes === 0) return;

    if (!rewind) {
      // Whole half-days look identical on the face, so never rewind more than 12 hours.
      offsetMinutes %= MINUTES_PER_HALF_DAY;
      const duration = THREE.MathUtils.clamp(
        offsetMinutes / REWIND_MINUTES_PER_SECOND,
        REWIND_MIN_SECONDS,
        REWIND_MAX_SECONDS,
      );
      rewind = { from: offsetMinutes, duration, elapsed: 0 };
    }
    rewind.elapsed += dt;
    const t = Math.min(rewind.elapsed / rewind.duration, 1);
    offsetMinutes = rewind.from * (1 - easeInOutCubic(t));
    if (t === 1) {
      offsetMinutes = 0;
      rewind = null;
    }
  }

  function update(dt, now = new Date()) {
    advanceOffset(dt);

    // Minutes since midnight, local time, plus any fast-forward from hovering.
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getHours() * 60 + now.getMinutes() + seconds / 60 + offsetMinutes;
    point(minute, ((minutes % 60) / 60) * FULL_TURN);
    point(hour, ((minutes % MINUTES_PER_HALF_DAY) / MINUTES_PER_HALF_DAY) * FULL_TURN);
  }

  update(0);
  return { hoverAt, clearHover, tapAt, update };
}

function mountOnPivot(hand, { center, clockwiseAxis, twelve, three }) {
  // Where the hand points now, as a clockwise angle from 12: from the centre to its tip.
  const tip = farthestVertexFrom(hand, center);
  const direction = tip.sub(center);
  const restAngle = Math.atan2(direction.dot(three), direction.dot(twelve));

  const parent = hand.parent;
  const pivot = new THREE.Object3D();
  pivot.name = `${hand.name}_pivot`;
  pivot.position.copy(parent.worldToLocal(center.clone()));
  parent.add(pivot);
  pivot.attach(hand);

  const parentRotation = parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  const axis = clockwiseAxis.clone().applyQuaternion(parentRotation);
  return { pivot, axis, restAngle };
}

function point({ pivot, axis, restAngle }, angle) {
  pivot.quaternion.setFromAxisAngle(axis, angle - restAngle);
}

function farthestVertexFrom(object, point) {
  const farthest = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  let farthestDistance = -1;
  object.traverse((child) => {
    if (!child.isMesh) return;
    const positions = child.geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(child.matrixWorld);
      const distance = vertex.distanceToSquared(point);
      if (distance > farthestDistance) {
        farthestDistance = distance;
        farthest.copy(vertex);
      }
    }
  });
  return farthest;
}
