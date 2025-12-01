import * as THREE from "three";

import roomUrl from "./assets/portfolio-room.glb?url";
import { createPanPreview } from "./interactions/panPreview.js";
import { createPinchZoom } from "./interactions/pinchZoom.js";
import { createPreviewFocus } from "./interactions/previewFocus.js";
import { createRaycast } from "./interactions/raycast.js";
import { createMatrixLoader } from "./loader.js";
import { createThreeContext } from "./three/context.js";
import { createControls, lockAzimuthAroundCurrentView } from "./three/controls.js";
import { createFocusZoom } from "./three/focusZoom.js";
import { addLights } from "./three/lights.js";
import { loadRoom } from "./three/loadRoom.js";
import { mountScreenOverlay } from "./three/screenOverlay.js";
import { makeEvenViewportSync } from "./three/viewport.js";
import { createExitButton } from "./ui/exitButton.js";

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

  const exitBtn = createExitButton(() => {
    if (!focuser.isFocusing() && preview.isFocused()) exitFocus();
  });

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

  function isDesc(obj, ancestor) {
    let cur = obj;
    while (cur) {
      if (cur === ancestor) return true;
      cur = cur.parent;
    }
    return false;
  }

  const focuser = createFocusZoom({ camera, controls, cssRoot: cssRenderer.domElement });
  let transitioning = false;

  function gateIfBusy(e) {
    if (transitioning || focuser.isFocusing()) {
      e?.preventDefault?.();
      return true;
    }
    return false;
  }

  const preview = createPreviewFocus({
    cssRoot: cssRenderer.domElement,
    wrapper,
    iframeEl,
    makeEvenViewportSync,
    ctx,
    onEnter: () => {
      viewport?.dispose();
      pinch.attach();
      pan.attach();
      exitBtn.style.display = "block";
    },
    onExit: () => {
      pinch.detach();
      pan.detach();
      viewport = makeEvenViewportSync(ctx);
      exitBtn.style.display = "none";
    },
    onArmIframe: () => {
      pinch.detach();
      pan.detach();
    },
  });

  const pinch = createPinchZoom({
    camera,
    controls,
    cssRoot: cssRenderer.domElement,
    glRoot: renderer.domElement,
    screenMesh,
    cssObject,
    shouldBlock: () => transitioning || focuser.isFocusing(),
  });

  const pan = createPanPreview({
    camera,
    controls,
    renderer,
    cssRoot: cssRenderer.domElement,
    screenMesh,
    cssObject,
    shouldBlock: () => transitioning || focuser.isFocusing(),
  });

  const ray = createRaycast(renderer, camera);

  function clickRoom(e) {
    if (gateIfBusy(e)) return;
    const hits = ray.intersect(e, laptopRoot, true);
    const firstLaptopHit = hits.find((h) => isDesc(h.object, laptopRoot));

    if (firstLaptopHit) {
      if (!focuser.isFocusing() && preview.isFocused()) return;
      transitioning = true;
      (async () => {
        await focuser.focusOn({ centerFrom: screenMesh, orientFrom: cssObject, duration: 650 });
        preview.enablePreview();
        transitioning = false;
      })();
      // setTimeout(() => preview.enablePreview(), 650);
      return;
    }
    if (!focuser.isFocusing() && preview.isFocused()) {
      exitFocus();
    }
  }

  function exitFocus() {
    // focuser.restore(500);
    // setTimeout(() => preview.disableAllPointers(), 260);
    transitioning = true;
    (async () => {
      await focuser.restore(500);
      preview.disableAllPointers();
      transitioning = false;
    })();
  }

  // hover cursor
  function hoverRoom(e) {
    if (transitioning || focuser.isFocusing()) return;
    const hits = ray.intersect(e, laptopRoot, true);
    const c = hits.length ? "pointer" : "";
    renderer.domElement.style.cursor = c;
    cssRenderer.domElement.style.cursor = c;
  }

  renderer.domElement.addEventListener("click", clickRoom);
  cssRenderer.domElement.addEventListener("click", clickRoom);
  renderer.domElement.addEventListener("mousemove", hoverRoom);
  cssRenderer.domElement.addEventListener("mousemove", hoverRoom);

  renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
  cssRenderer.domElement.addEventListener("wheel", onWheel, { passive: false });

  // Escape closes focus
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && preview.isFocused()) {
      exitFocus();
    }
  });

  function onWheel(e) {
    if (transitioning || focuser.isFocusing()) {
      e.preventDefault();
    }
  }

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
        pan?.detach();
      } catch {}
      try {
        pinch?.detach();
      } catch {}
      try {
        preview?.detach?.();
      } catch {}

      // Click listeners
      try {
        renderer.domElement.removeEventListener("click", clickRoom);
      } catch {}
      try {
        cssRenderer.domElement.removeEventListener("click", clickRoom);
      } catch {}

      // Hover listeners
      try {
        renderer.domElement.removeEventListener("mousemove", hoverRoom);
      } catch {}
      try {
        cssRenderer.domElement.removeEventListener("mousemove", hoverRoom);
      } catch {}

      // Wheel listeners
      try {
        renderer.domElement.removeEventListener("wheel", onWheel);
      } catch {}
      try {
        cssRenderer.domElement.removeEventListener("wheel", onWheel);
      } catch {}
      try {
        window.removeEventListener("resize", viewport?.syncSizesEven);
      } catch {}
    });
  }
})();
