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
  const viewport = makeEvenViewportSync(ctx);

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
    cssRenderer.domElement.style.pointerEvents = "auto";
    cssRenderer.domElement.style.cursor = "pointer";
    wrapper.style.pointerEvents = "auto";
    iframeEl.style.pointerEvents = "none";
    interactive = false;
    // one-time: the next click on the wrapper enables the iframe
    const arm = (ev) => {
      // stop this click from raycasting again
      ev.stopPropagation();
      iframeEl.style.pointerEvents = "auto";
      iframeEl.style.cursor = "pointer";
      wrapper.style.pointerEvents = "none"; // pass-through to iframe now
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
