import * as THREE from "three";

export function createFocusZoom({ camera, controls, cssRoot }) {
  let saved = null;
  let animId = 0;
  let focusing = false;
  // True from the first zoom-in until restore() lands back on the saved room view, so a
  // second zoom while already in (e.g. re-framing after a rotate) keeps the original view.
  let away = false;

  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const stop = () => animId && cancelAnimationFrame(animId);

  const worldNormal = (obj) => {
    const n = new THREE.Vector3(0, 0, 1);
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(obj.matrixWorld);
    return n.applyMatrix3(normalMatrix).normalize();
  };

  function save() {
    if (away) return;
    away = true;
    saved = {
      camPos: camera.position.clone(),
      target: controls.target.clone(),
      minDist: controls.minDistance,
      maxDist: controls.maxDistance,
      minAzimuth: controls.minAzimuthAngle,
      maxAzimuth: controls.maxAzimuthAngle,
      enabled: controls.enabled,
      pointerEvents: cssRoot?.style.pointerEvents || "none",
    };
  }

  // Eases the camera and orbit target to a pose; user input is off while it moves.
  function animateTo(toPos, toTar, duration) {
    const fromPos = camera.position.clone();
    const fromTar = controls.target.clone();
    const start = performance.now();
    focusing = true;
    controls.enabled = false;

    stop();
    return new Promise((resolve) => {
      animId = requestAnimationFrame(function step(now) {
        const t = Math.min(1, (now - start) / duration);
        const k = ease(t);
        camera.position.lerpVectors(fromPos, toPos, k);
        controls.target.lerpVectors(fromTar, toTar, k);
        camera.lookAt(controls.target);
        controls.update();
        if (t < 1) {
          animId = requestAnimationFrame(step);
          return;
        }
        focusing = false;
        resolve();
      });
    });
  }

  async function restore(duration = 500) {
    if (!saved) return;
    cssRoot && (cssRoot.style.pointerEvents = saved.pointerEvents);
    // controls.update() clamps the camera to the zoomed-in limits, which would pull it
    // short of the saved view; lift them for the trip back and restore them at the end.
    controls.minDistance = 0;
    controls.maxDistance = Infinity;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;

    await animateTo(saved.camPos.clone(), saved.target.clone(), duration);
    controls.minDistance = saved.minDist;
    controls.maxDistance = saved.maxDist;
    controls.minAzimuthAngle = saved.minAzimuth;
    controls.maxAzimuthAngle = saved.maxAzimuth;
    controls.enabled = saved.enabled;
    away = false;
  }

  async function focusOn({
    centerFrom,
    orientFrom,
    distanceScale = 0.8,
    duration = 650,
    margin = 1.06,
  }) {
    if (!centerFrom || !orientFrom) return;
    save();

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
    const m = (typeof margin === "number" ? margin : 0.96) * (isSmall ? 0.96 : 1);
    const distance = Math.max(0.25, Math.max(fitHeight, fitWidth) * m);

    controls.minDistance = 0.2;
    controls.maxDistance = Math.max(1.0, distance * 1.6);

    await animateTo(
      center.clone().addScaledVector(n, distance),
      center.clone(),
      duration,
    );
    controls.enabled = true;
  }

  // Flies to an exact camera pose. The room's azimuth fan is lifted while there, since the
  // pose may sit outside it (restore() puts it back).
  async function focusAt({ position, target, distance, duration = 650 }) {
    save();
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.minDistance = Math.min(0.2, distance * 0.5);
    controls.maxDistance = Math.max(1.0, distance * 1.6);

    await animateTo(position, target, duration);
    controls.enabled = true;
  }

  return { focusOn, focusAt, restore, isFocusing: () => focusing };
}
