import * as THREE from "three";

export function createFocusZoom({ camera, controls, cssRoot }) {
  let saved = null;
  let animId = 0;
  let focusing = false;

  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const stop = () => animId && cancelAnimationFrame(animId);

  const worldNormal = (obj) => {
    const n = new THREE.Vector3(0, 0, 1);
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(obj.matrixWorld);
    return n.applyMatrix3(normalMatrix).normalize();
  };

  function save() {
    saved = {
      camPos: camera.position.clone(),
      target: controls.target.clone(),
      minDist: controls.minDistance,
      maxDist: controls.maxDistance,
      enabled: controls.enabled,
      pointerEvents: cssRoot?.style.pointerEvents || "none",
    };
  }

  function restore(duration = 500) {
    if (!saved) return Promise.resolve();
    let resolveDone;
    const done = new Promise((r) => (resolveDone = r));
    const fromPos = camera.position.clone();
    const fromTar = controls.target.clone();
    const toPos = saved.camPos.clone();
    const toTar = saved.target.clone();

    const start = performance.now();
    focusing = true;
    controls.enabled = false;
    cssRoot && (cssRoot.style.pointerEvents = saved.pointerEvents);

    stop();
    animId = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const k = ease(t);
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
        resolveDone();
      }
    });
    return done;
  }

  function focusOn({ centerFrom, orientFrom, distanceScale = 0.8, duration = 650, margin = 1.06 }) {
    if (!centerFrom || !orientFrom) return Promise.resolve();
    let resolveDone;
    const done = new Promise((r) => (resolveDone = r));
    if (!focusing) save();

    const box = new THREE.Box3().setFromObject(centerFrom);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    let n = worldNormal(orientFrom);
    const cameraPos = camera.getWorldPosition(new THREE.Vector3());
    const centerToCamera = cameraPos.sub(center); // vector pointing toward camera
    if (n.dot(centerToCamera) < 0) n.multiplyScalar(-1); // face camera

    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov * 0.5) * camera.aspect);
    const fitHeight = (size.y * 0.5) / Math.tan(vFov * 0.5);
    const fitWidth = (size.x * 0.5) / Math.tan(hFov * 0.5);

    const isSmall = window.innerWidth < 768;
    const m = (typeof margin === "number" ? margin : 1.06) * (isSmall ? 1.06 : 1);
    const distance = Math.max(0.25, Math.max(fitHeight, fitWidth) * m);

    const toPos = center.clone().addScaledVector(n, distance);
    const toTar = center.clone();

    const fromPos = camera.position.clone();
    const fromTar = controls.target.clone();

    controls.minDistance = 0.2;
    controls.maxDistance = Math.max(1.0, distance * 1.6);

    const start = performance.now();
    focusing = true;
    controls.enabled = false;

    stop();
    animId = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const k = ease(t);
      camera.position.lerpVectors(fromPos, toPos, k);
      controls.target.lerpVectors(fromTar, toTar, k);
      camera.lookAt(controls.target);
      controls.update();
      if (t < 1) animId = requestAnimationFrame(step);
      else {
        focusing = false;
        controls.enabled = true;
        resolveDone();
      }
    });
    return done;
  }

  return { focusOn, restore, isFocusing: () => focusing };
}
