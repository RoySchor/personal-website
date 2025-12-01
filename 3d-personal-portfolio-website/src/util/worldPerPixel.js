import * as THREE from "three";

export function getWorldPerPixel(camera, renderer, distance) {
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov * 0.5) * camera.aspect);

  const rect = renderer.domElement.getBoundingClientRect();
  const W = Math.max(1, rect.width);
  const H = Math.max(1, rect.height);

  const worldPerPxY = (2 * distance * Math.tan(vFov * 0.5)) / H;
  const worldPerPxX = (2 * distance * Math.tan(hFov * 0.5)) / W;
  return { worldPerPxX, worldPerPxY };
}
