import * as THREE from "three";

import { getScreenBasis } from "../util/screenBasis.js";
import { getWorldPerPixel } from "../util/worldPerPixel.js";

export function createPanPreview({ camera, controls, renderer, cssRoot, screenMesh, cssObject }) {
  let panOn = false;
  let lastX = 0,
    lastY = 0;
  let basis = null;
  let dist = 0;

  const CLAMP_MARGIN = 1.08;
  const MULT = 1.0;

  function distanceAlongNormal(basis) {
    const camPos = camera.getWorldPosition(new THREE.Vector3());
    return camPos.clone().sub(basis.center).dot(basis.normal);
  }

  function clampTargetToScreen(target) {
    const { center, right, up, box, normal } = basis;
    const pts = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ];
    let minU = Infinity,
      maxU = -Infinity,
      minV = Infinity,
      maxV = -Infinity;
    for (const p of pts) {
      const d = p.clone().sub(center);
      const u = d.dot(right);
      const v = d.dot(up);
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const halfU = Math.max(Math.abs(minU), Math.abs(maxU)) * CLAMP_MARGIN;
    const halfV = Math.max(Math.abs(minV), Math.abs(maxV)) * CLAMP_MARGIN;

    const off = target.clone().sub(center);
    let u = off.dot(right);
    let v = off.dot(up);
    const n = off.dot(normal);

    u = THREE.MathUtils.clamp(u, -halfU, +halfU);
    v = THREE.MathUtils.clamp(v, -halfV, +halfV);

    return center
      .clone()
      .addScaledVector(right, u)
      .addScaledVector(up, v)
      .addScaledVector(normal, n);
  }

  function start(x, y) {
    panOn = true;
    lastX = x;
    lastY = y;
    basis = getScreenBasis(screenMesh, cssObject, camera);
    dist = distanceAlongNormal(basis);
  }
  function move(x, y) {
    if (!panOn || !basis) return;
    const dx = x - lastX;
    const dy = y - lastY;
    lastX = x;
    lastY = y;

    const { worldPerPxX, worldPerPxY } = getWorldPerPixel(camera, renderer, dist);
    const shift = new THREE.Vector3()
      .addScaledVector(basis.right, -dx * worldPerPxX * MULT)
      .addScaledVector(basis.up, +dy * worldPerPxY * MULT);

    camera.position.add(shift);
    const newTarget = controls.target.clone().add(shift);

    const clamped = clampTargetToScreen(newTarget);
    const delta = clamped.clone().sub(newTarget);
    camera.position.add(delta);
    controls.target.copy(clamped);

    camera.lookAt(controls.target);
    controls.update();
  }
  function end() {
    panOn = false;
    basis = null;
  }

  // Wiring
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      start(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }
  }
  function onTouchMove(e) {
    if (e.touches.length === 1) {
      move(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }
  }
  function onTouchEnd() {
    end();
  }

  function onMouseDown(e) {
    if (e.button === 0) {
      start(e.clientX, e.clientY);
      e.preventDefault();
    }
  }
  function onMouseMove(e) {
    move(e.clientX, e.clientY);
  }
  function onMouseUp() {
    end();
  }

  function attach() {
    cssRoot.addEventListener("touchstart", onTouchStart, { passive: false });
    cssRoot.addEventListener("touchmove", onTouchMove, { passive: false });
    cssRoot.addEventListener("touchend", onTouchEnd, { passive: true });
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: false });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
    renderer.domElement.addEventListener("touchend", onTouchEnd, { passive: true });

    cssRoot.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function detach() {
    cssRoot.removeEventListener("touchstart", onTouchStart);
    cssRoot.removeEventListener("touchmove", onTouchMove);
    cssRoot.removeEventListener("touchend", onTouchEnd);
    renderer.domElement.removeEventListener("touchstart", onTouchStart);
    renderer.domElement.removeEventListener("touchmove", onTouchMove);
    renderer.domElement.removeEventListener("touchend", onTouchEnd);

    cssRoot.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }

  return { attach, detach };
}
