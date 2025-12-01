import * as THREE from "three";

export function getScreenBasis(screenMesh, cssObject, camera) {
  const box = new THREE.Box3().setFromObject(screenMesh);
  const center = box.getCenter(new THREE.Vector3());

  const q = cssObject.getWorldQuaternion(new THREE.Quaternion());
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q).normalize();
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q).normalize();

  const camPos = camera.getWorldPosition(new THREE.Vector3());
  if (normal.dot(camPos.clone().sub(center)) < 0) normal.multiplyScalar(-1);

  return { center, normal, right, up, box };
}
