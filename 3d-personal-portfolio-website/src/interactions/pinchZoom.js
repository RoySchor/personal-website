import * as THREE from "three";

import { getScreenBasis } from "../util/screenBasis.js";

export function createPinchZoom({ camera, controls, cssRoot, glRoot, screenMesh, cssObject }) {
  let pinchOn = false;
  let pinchLastDist = 0;
  let baseD = 0;
  let basis = null;

  const SENS = 0.003;
  const MIN_D = 0.18;
  let MAX_D = 2.5;

  function touchesDist(t) {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.hypot(dx, dy);
  }

  function onStart(e) {
    if (e.touches.length !== 2) return;
    pinchOn = true;
    pinchLastDist = touchesDist(e.touches);
    basis = getScreenBasis(screenMesh, cssObject, camera);

    const camPos = camera.getWorldPosition(new THREE.Vector3());
    baseD = camPos.clone().sub(basis.center).dot(basis.normal);
    MAX_D = Math.max(1.2, baseD * 1.6);
    e.preventDefault();
  }

  function onMove(e) {
    if (!pinchOn || e.touches.length !== 2) return;
    const d = touchesDist(e.touches);
    const delta = d - pinchLastDist;
    pinchLastDist = d;

    let newD = THREE.MathUtils.clamp(baseD * (1 - delta * SENS), MIN_D, MAX_D);
    baseD = newD;

    camera.position.copy(basis.center.clone().addScaledVector(basis.normal, newD));
    controls.target.copy(basis.center);
    camera.lookAt(controls.target);
    controls.update();
    e.preventDefault();
  }

  function onEnd(e) {
    if (e.touches.length < 2) pinchOn = false;
  }

  function attach() {
    cssRoot.addEventListener("touchstart", onStart, { passive: false });
    cssRoot.addEventListener("touchmove", onMove, { passive: false });
    cssRoot.addEventListener("touchend", onEnd, { passive: true });
    glRoot.addEventListener("touchstart", onStart, { passive: false });
    glRoot.addEventListener("touchmove", onMove, { passive: false });
    glRoot.addEventListener("touchend", onEnd, { passive: true });
  }
  function detach() {
    cssRoot.removeEventListener("touchstart", onStart);
    cssRoot.removeEventListener("touchmove", onMove);
    cssRoot.removeEventListener("touchend", onEnd);
    glRoot.removeEventListener("touchstart", onStart);
    glRoot.removeEventListener("touchmove", onMove);
    glRoot.removeEventListener("touchend", onEnd);
  }

  return { attach, detach };
}
