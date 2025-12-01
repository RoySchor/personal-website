import * as THREE from "three";

import roomUrl from "./assets/portfolio-room.glb?url";
import { createMatrixLoader } from "./loader.js";
import { createThreeContext } from "./three/context.js";
import { createControls, lockAzimuthAroundCurrentView } from "./three/controls.js";
import { createFocusZoom } from "./three/focusZoom.js";
import { addLights } from "./three/lights.js";
import { loadRoom } from "./three/loadRoom.js";
import { mountScreenOverlay } from "./three/screenOverlay.js";
import { makeEvenViewportSync } from "./three/viewport.js";

// Start Matrix rain overlay
const matrix = createMatrixLoader("loader");
matrix.start();

// Update progress bar as assets stream in
const onProgress = (pct /* 0..1 */) => {
  matrix.setProgress(pct || 0);
};

// When everything is ready, fade out the loader
const onAllAssetsLoaded = () => {
  matrix.setProgress(1);
  matrix.stop();
};

(async function start() {
  const ctx = createThreeContext("c");
  const { renderer, cssRenderer, scene, camera } = ctx;

  function makeExitButton() {
    const btn = document.createElement("button");
    btn.textContent = "Exit ⎋";
    Object.assign(btn.style, {
      position: "fixed",
      top: "12px",
      right: "12px",
      zIndex: "99999",
      padding: "8px 12px",
      borderRadius: "10px",
      border: "1px solid rgba(255,255,255,0.3)",
      background: "rgba(0,0,0,0.55)",
      color: "#fff",
      font: "500 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      backdropFilter: "blur(6px)",
      cursor: "pointer",
      display: "none",
    });
    btn.addEventListener("click", () => {
      if (!focuser.isFocusing() && focused) exitFocus();
    });
    document.body.appendChild(btn);
    return btn;
  }

  const exitBtn = makeExitButton();

  // keep both renderers in perfect sync (even width/height)
  // const viewport = makeEvenViewportSync(ctx);
  let viewport = makeEvenViewportSync(ctx);

  // world
  addLights(scene);
  const controls = createControls(camera, renderer.domElement);

  // load room glb
  const { root, center, isCoarse } = await loadRoom(ctx, roomUrl, {
    onProgress,
    onAllAssetsLoaded,
  });
  controls.target.copy(center);
  controls.update();
  lockAzimuthAroundCurrentView(controls, camera, center, isCoarse);

  // mount CSS3D overlay on laptop screen
  const overlay = mountScreenOverlay(root, { iframeUrl: "https://example.org" });
  if (!overlay) return;
  const { screenMesh, screenAnchor, iframeEl, wrapper, cssObject } = overlay;

  // Find the smallest ancestor that represents the whole laptop
  function getLaptopRoot(node) {
    let cur = node;
    while (cur && cur.parent && !/macbook/i.test(cur.name)) {
      cur = cur.parent;
    }
    return cur || node; // fallback to the mesh itself
  }
  const laptopRoot = getLaptopRoot(screenMesh);

  function isDescendantOf(obj, ancestor) {
    let cur = obj;
    while (cur) {
      if (cur === ancestor) return true;
      cur = cur.parent;
    }
    return false;
  }

  const focuser = createFocusZoom({ camera, controls, cssRoot: cssRenderer.domElement });

  // Raycast setup
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function setMouseFromEvent(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ndc.set(x, y);
  }

  let focused = false;
  let interactive = false;
  let previewClickArm = null;

  function enablePreview() {
    focused = true;
    viewport?.dispose();

    cssRenderer.domElement.style.pointerEvents = "auto";
    cssRenderer.domElement.style.cursor = "pointer";
    wrapper.style.pointerEvents = "auto";
    iframeEl.style.pointerEvents = "none";
    cssRenderer.domElement.style.touchAction = "none";
    wrapper.style.touchAction = "none";
    attachPinchZoom();
    interactive = false;
    // one-time: the next click on the wrapper enables the iframe
    const arm = (ev) => {
      // stop this click from raycasting again
      ev.stopPropagation();
      iframeEl.style.pointerEvents = "auto";
      iframeEl.style.cursor = "pointer";
      wrapper.style.pointerEvents = "none";
      detachPinchZoom();
      interactive = true;
      wrapper.removeEventListener("click", arm, true);
      previewClickArm = null;
    };
    previewClickArm = arm;
    // capture so it fires even if iframe is under it
    wrapper.addEventListener("click", arm, true);
  }

  function disableAllPointers() {
    focused = false;
    cssRenderer.domElement.style.pointerEvents = "none";
    cssRenderer.domElement.style.cursor = "";
    wrapper.style.pointerEvents = "none";
    iframeEl.style.pointerEvents = "none";
    iframeEl.style.cursor = "";
    cssRenderer.domElement.style.touchAction = "";
    wrapper.style.touchAction = "";
    detachPinchZoom();
    viewport = makeEvenViewportSync(ctx);
    if (previewClickArm) {
      wrapper.removeEventListener("click", previewClickArm, true);
      previewClickArm = null;
    }
    interactive = false;
  }

  function exitFocus() {
    focuser.restore(500);
    setTimeout(() => {
      disableAllPointers();
      exitBtn.style.display = "none";
    }, 260);
  }

  function clickRoom(e) {
    setMouseFromEvent(e);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObject(laptopRoot, true);
    const firstLaptopHit = hits.find((h) => isDescendantOf(h.object, laptopRoot));

    if (firstLaptopHit) {
      if (!focuser.isFocusing() && focused) {
        return;
      }

      focuser.focusOn({
        centerFrom: screenMesh, // geometry center = screen surface
        orientFrom: cssObject, // orientation/normal = anchor’s +Z
        duration: 650,
      });
      setTimeout(() => {
        enablePreview();
        exitBtn.style.display = "block";
      }, 650);
      return;
    }
    if (!focuser.isFocusing() && focused) {
      exitFocus();
    }
  }

  // --- Pinch-to-zoom in PREVIEW mode (not when iframe is active) ---
  let pinchOn = false;
  let pinchStartDist = 0;
  let pinchLastDist = 0;
  let pinchBaseDistance = 0; // camera distance along normal at start
  let pinchNormal = null; // world normal of the screen
  let pinchCenter = null; // world center of the screen
  const PINCH_SENSITIVITY = 0.003; // tune feel
  const MIN_D = 0.18; // clamp closer
  let MAX_D = 2.5; // will be set from initial focus distance

  function getTouchesDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  function computeNormalAndCenter() {
    // Use the same reference used by focuser
    const box = new THREE.Box3().setFromObject(screenMesh);
    pinchCenter = box.getCenter(new THREE.Vector3());

    // normal from cssObject (same as in focusOn)
    const q = cssObject.getWorldQuaternion(new THREE.Quaternion());
    pinchNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();

    // Ensure normal faces the camera
    const camPos = camera.getWorldPosition(new THREE.Vector3());
    if (pinchNormal.dot(camPos.clone().sub(pinchCenter)) < 0) {
      pinchNormal.multiplyScalar(-1);
    }

    // set MAX_D based on current camera distance from center along normal
    const curD = camPos.clone().sub(pinchCenter).dot(pinchNormal);
    MAX_D = Math.max(1.2, curD * 1.6);
    pinchBaseDistance = curD;
  }

  function onTouchStart(e) {
    if (!focused || interactive) return; // only in preview focus
    if (e.touches.length === 2) {
      pinchOn = true;
      pinchStartDist = getTouchesDistance(e.touches);
      pinchLastDist = pinchStartDist;
      computeNormalAndCenter();
      e.preventDefault();
    }
  }

  function onTouchMove(e) {
    if (!pinchOn || e.touches.length !== 2) return;
    const dist = getTouchesDistance(e.touches);
    const delta = dist - pinchLastDist; // positive = spread (zoom in)
    pinchLastDist = dist;

    const factor = 1 - delta * PINCH_SENSITIVITY; // convert px to scalar
    // desired distance along normal
    let newD = THREE.MathUtils.clamp(pinchBaseDistance * factor, MIN_D, MAX_D);
    pinchBaseDistance = newD; // incremental

    const toPos = pinchCenter.clone().addScaledVector(pinchNormal, newD);
    camera.position.copy(toPos);
    controls.target.copy(pinchCenter);
    camera.lookAt(controls.target);
    controls.update();
    e.preventDefault();
  }

  function onTouchEnd(e) {
    if (e.touches.length < 2) {
      pinchOn = false;
    }
  }

  function attachPinchZoom() {
    cssRenderer.domElement.addEventListener("touchstart", onTouchStart, { passive: false });
    cssRenderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
    cssRenderer.domElement.addEventListener("touchend", onTouchEnd, { passive: true });
    // also cover the WebGL canvas in case user touches edges
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: false });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
    renderer.domElement.addEventListener("touchend", onTouchEnd, { passive: true });
  }

  function detachPinchZoom() {
    cssRenderer.domElement.removeEventListener("touchstart", onTouchStart);
    cssRenderer.domElement.removeEventListener("touchmove", onTouchMove);
    cssRenderer.domElement.removeEventListener("touchend", onTouchEnd);
    renderer.domElement.removeEventListener("touchstart", onTouchStart);
    renderer.domElement.removeEventListener("touchmove", onTouchMove);
    renderer.domElement.removeEventListener("touchend", onTouchEnd);
  }

  // Click / tap listeners on the WebGL canvas
  renderer.domElement.addEventListener("click", clickRoom);
  cssRenderer.domElement.addEventListener("click", clickRoom);
  renderer.domElement.addEventListener(
    "touchstart",
    (e) => {
      const t = e.touches[0];
      clickRoom({ clientX: t.clientX, clientY: t.clientY });
    },
    { passive: true },
  );

  cssRenderer.domElement.addEventListener(
    "touchstart",
    (e) => {
      const t = e.touches[0];
      clickRoom({ clientX: t.clientX, clientY: t.clientY });
    },
    { passive: true },
  );

  function hoverRoom(e) {
    setMouseFromEvent(e);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObject(laptopRoot, true);
    // renderer.domElement.style.cursor = hits.length ? "pointer" : "";
    const c = hits.length ? "pointer" : "";
    renderer.domElement.style.cursor = c;
    cssRenderer.domElement.style.cursor = c;
  }
  renderer.domElement.addEventListener("mousemove", hoverRoom);
  cssRenderer.domElement.addEventListener("mousemove", hoverRoom);
  // Escape closes focus
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (focused) exitFocus();
    }
  });

  // render loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    cssRenderer.render(scene, camera);
  }
  animate();

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      try {
        cssRenderer.domElement.remove();
      } catch {}
      try {
        renderer.dispose();
      } catch {}
      try {
        viewport.dispose();
      } catch {}
      try {
        renderer.domElement.removeEventListener("click", clickRoom);
      } catch {}
    });
  }
})();
