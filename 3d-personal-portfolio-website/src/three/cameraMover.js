import * as THREE from "three";

export function createCameraMover({ camera, controls }) {
  const MOVE_AMOUNT = 0.05;
  // Larger zoom on mobile/touch devices
  const isMobile = window.matchMedia("(pointer: coarse)").matches;
  const ZOOM_AMOUNT = isMobile ? 0.1 : 0.05;
  const ANIMATION_DURATION = 200;

  let screenMesh = null;
  let cssObject = null;
  let isAnimating = false;

  function move(direction) {
    if (!cssObject || isAnimating) return;

    // Get screen basis vectors
    const worldQuat = new THREE.Quaternion();
    cssObject.getWorldQuaternion(worldQuat);

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(worldQuat);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(worldQuat);

    let offset = new THREE.Vector3();

    switch (direction) {
      case "up":
        offset = up.multiplyScalar(MOVE_AMOUNT);
        break;
      case "down":
        offset = up.multiplyScalar(-MOVE_AMOUNT);
        break;
      case "left":
        offset = right.multiplyScalar(MOVE_AMOUNT); // FLIPPED
        break;
      case "right":
        offset = right.multiplyScalar(-MOVE_AMOUNT); // FLIPPED
        break;
    }

    // Animate smooth movement
    isAnimating = true;
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const endPos = startPos.clone().add(offset);
    const endTarget = startTarget.clone().add(offset);
    const startTime = performance.now();

    function animate() {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

      // Smooth easing
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      camera.position.lerpVectors(startPos, endPos, eased);
      controls.target.lerpVectors(startTarget, endTarget, eased);
      camera.lookAt(controls.target);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        isAnimating = false;
      }
    }

    animate();
  }

  function zoom(direction) {
    if (!cssObject || isAnimating) return;

    // Get direction from camera to screen center
    const screenCenter = new THREE.Vector3();
    cssObject.getWorldPosition(screenCenter);

    const toScreen = screenCenter.clone().sub(camera.position).normalize();

    // Zoom in or out along this direction
    const zoomOffset = toScreen.multiplyScalar(direction === "in" ? ZOOM_AMOUNT : -ZOOM_AMOUNT);

    // Animate smooth zoom
    isAnimating = true;
    const startPos = camera.position.clone();
    const endPos = startPos.clone().add(zoomOffset);
    const startTime = performance.now();

    function animate() {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

      // Smooth easing
      const eased = 1 - Math.pow(1 - progress, 3);

      camera.position.lerpVectors(startPos, endPos, eased);
      camera.lookAt(controls.target);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        isAnimating = false;
      }
    }

    animate();
  }

  return {
    move,
    zoom,
    setMesh: (mesh, css) => {
      screenMesh = mesh;
      cssObject = css;
    },
  };
}
