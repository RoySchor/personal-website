import * as THREE from "three";

export function createCameraRig(camera) {
  const rig = new THREE.Group();
  camera.parent?.remove(camera);
  rig.add(camera);
  return rig;
}

// tiny RAF tweener
export function tween({
  from,
  to,
  dur = 600,
  ease = (t) => 1 - Math.pow(1 - t, 3),
  onUpdate,
  onDone,
}) {
  const start = performance.now();
  let id = 0;
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur);
    const k = ease(t);
    onUpdate(from, to, k);
    if (t < 1) id = requestAnimationFrame(step);
    else onDone?.();
  };
  id = requestAnimationFrame(step);
  return () => cancelAnimationFrame(id);
}
