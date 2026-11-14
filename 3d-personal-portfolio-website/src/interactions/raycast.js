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

  // Distance along the pointer ray to where it enters `box`, or null if it misses.
  function distanceToBox(e, box) {
    setMouseFromEvent(e);
    ray.setFromCamera(ndc, camera);
    const point = ray.ray.intersectBox(box, boxEntry);
    return point ? point.distanceTo(ray.ray.origin) : null;
  }

  return { intersect, distanceToBox };
}
