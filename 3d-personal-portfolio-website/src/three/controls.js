import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.maxDistance = 12;
  controls.minDistance = 1.0;
  controls.maxPolarAngle = Math.PI * 0.49;
  return controls;
}

export function lockAzimuthAroundCurrentView(controls, camera, target, isCoarse) {
  const startAz = Math.atan2(camera.position.z - target.z, camera.position.x - target.x);
  const halfFan = THREE.MathUtils.degToRad(120);

  requestAnimationFrame(() => {
    controls.minAzimuthAngle = startAz + halfFan;
    controls.maxAzimuthAngle = startAz - halfFan;
    controls.minDistance = 0.5;
    controls.maxDistance = 8.0;
    controls.update();
  });
}
