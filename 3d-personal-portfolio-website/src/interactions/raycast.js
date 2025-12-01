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

  return { intersect };
}
