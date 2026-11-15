import * as THREE from "three";

export function createRaycast(renderer, camera) {
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function setMouseFromEvent(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ndc.set(x, y);
  }

  function intersect(e, object3D, recursive = true) {
    setMouseFromEvent(e);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(object3D, recursive);
  }

  const boxEntry = new THREE.Vector3();

  // True when the pointer ray enters `box` and nothing in `scene` other than `target` (an
  // object or a list of them) is in front of it. The box test is cheap; the full scene
  // raycast only runs when it passes. By default empty space inside the box counts, which
  // makes small objects easy to hit; `exact` requires the ray to hit the target itself.
  function pointsAt(e, { box, target, scene, exact = false }) {
    setMouseFromEvent(e);
    ray.setFromCamera(ndc, camera);
    const entry = ray.ray.intersectBox(box, boxEntry);
    if (!entry) return false;

    const boxDistance = entry.distanceTo(ray.ray.origin);
    const [nearest] = ray.intersectObject(scene, true);
    const targets = Array.isArray(target) ? target : [target];
    return Boolean(
      (!exact && (!nearest || nearest.distance >= boxDistance)) ||
      (nearest && targets.some((object) => isWithin(nearest.object, object))),
    );
  }

  // The world-space pointer ray, for tests against shapes that aren't scene objects.
  function rayFor(e) {
    setMouseFromEvent(e);
    ray.setFromCamera(ndc, camera);
    return ray.ray;
  }

  return { intersect, pointsAt, rayFor };
}

function isWithin(object, ancestor) {
  for (let current = object; current; current = current.parent) {
    if (current === ancestor) return true;
  }
  return false;
}
