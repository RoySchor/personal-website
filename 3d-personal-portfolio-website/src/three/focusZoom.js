import * as THREE from "three";

export function createFocusZoom({ camera, controls, cssRoot }) {
  let saved = null;
  let animId = 0;
  let focusing = false;

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const stopAnim = () => animId && cancelAnimationFrame(animId);

  function saveState() {
    saved = {
      camPos: camera.position.clone(),
      target: controls.target.clone(),
      minDist: controls.minDistance,
      maxDist: controls.maxDistance,
      enabled: controls.enabled,
      pointerEvents: cssRoot?.style.pointerEvents || "none",
    };
  }

  function restore(duration = 450) {
    if (!saved) return;
    const fromPos = camera.position.clone();
    const fromTar = controls.target.clone();
    const toPos = saved.camPos.clone();
    const toTar = saved.target.clone();

    const start = performance.now();
    focusing = true;
    controls.enabled = false;
    cssRoot && (cssRoot.style.pointerEvents = saved.pointerEvents);

    stopAnim();
    animId = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const k = easeOutCubic(t);
      camera.position.lerpVectors(fromPos, toPos, k);
      controls.target.lerpVectors(fromTar, toTar, k);
      camera.lookAt(controls.target);
      controls.update();
      if (t < 1) animId = requestAnimationFrame(step);
      else {
        focusing = false;
        controls.minDistance = saved.minDist;
        controls.maxDistance = saved.maxDist;
        controls.enabled = saved.enabled;
      }
    });
  }

  /**
   * Focus using separate objects:
   * - centerFrom: object with geometry to compute AABB center (e.g., Macbook_screen mesh)
   * - orientFrom: object to read world rotation / +Z normal (e.g., Macbook_screen_anchor)
   */
  function focusOn({ centerFrom, orientFrom, distanceScale = 0.85, duration = 500 }) {
    if (!centerFrom || !orientFrom) return;

    if (!focusing) saveState();

    // Center from geometry (screen mesh)
    const box = new THREE.Box3().setFromObject(centerFrom);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Normal from orientFrom (+Z in world space)
    const normal = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(orientFrom.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();

    const diag = Math.max(0.001, size.length());
    const distance = Math.max(0.2, diag * distanceScale);

    const toPos = center.clone().addScaledVector(normal, distance);
    const toTar = center;

    const fromPos = camera.position.clone();
    const fromTar = controls.target.clone();

    // tighten while focused
    controls.minDistance = 0.2;
    controls.maxDistance = Math.max(1.0, distance * 1.6);

    const start = performance.now();
    focusing = true;
    controls.enabled = false;
    cssRoot && (cssRoot.style.pointerEvents = "auto");

    stopAnim();
    animId = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const k = easeOutCubic(t);
      camera.position.lerpVectors(fromPos, toPos, k);
      controls.target.lerpVectors(fromTar, toTar, k);
      camera.lookAt(controls.target);
      controls.update();
      if (t < 1) animId = requestAnimationFrame(step);
      else {
        focusing = false;
        controls.enabled = true;
      }
    });
  }

  return {
    focusOn,
    restore,
    isFocusing: () => focusing,
  };
}
