import * as THREE from "three";

import roomUrl from "./assets/portfolio-room.glb?url";
import { createMatrixLoader } from "./loader.js";
import { createThreeContext } from "./three/context.js";
import { createControls, lockAzimuthAroundCurrentView } from "./three/controls.js";
import { createFocusZoom } from "./three/focusZoom.js";
import { addLights } from "./three/lights.js";
import { loadRoom } from "./three/loadRoom.js";
import { createCameraRig } from "./three/rig.js";
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
  // const cameraRig = createCameraRig(camera);
  // scene.add(cameraRig);

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
  const clickable = screenMesh?.parent || screenMesh;

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

  function clickRoom(e) {
    console.log("[clickRoom] canvas clicked", e.type);
    setMouseFromEvent(e);
    ray.setFromCamera(ndc, camera);
    // const hits = clickable ? ray.intersectObject(clickable, true) : [];
    const hits = ray.intersectObject(laptopRoot, true);
    console.log(
      "[clickRoom] hits:",
      hits.map((h) => h.object.name),
    );
    const firstLaptopHit = hits.find((h) => isDescendantOf(h.object, laptopRoot));

    if (firstLaptopHit) {
      focuser.focusOn({
        centerFrom: screenMesh, // geometry center = screen surface
        orientFrom: cssObject, // orientation/normal = anchor’s +Z
        distanceScale: 0.75,
        duration: 650,
      });
      setTimeout(() => {
        cssRenderer.domElement.style.pointerEvents = "auto";
        if (iframeEl) iframeEl.style.pointerEvents = "auto";
      }, 650);
      // cssRenderer.domElement.style.pointerEvents = "auto";
      // if (iframeEl) iframeEl.style.pointerEvents = "auto";
      return;
    }

    if (!focuser.isFocusing() && cssRenderer.domElement.style.pointerEvents === "auto") {
      focuser.restore();
      setTimeout(() => {
        cssRenderer.domElement.style.pointerEvents = "none";
        if (iframeEl) iframeEl.style.pointerEvents = "none";
      }, 260);
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
    renderer.domElement.style.cursor = hits.length ? "pointer" : "";
  }
  renderer.domElement.addEventListener("mousemove", hoverRoom);
  cssRenderer.domElement.addEventListener("mousemove", hoverRoom);
  // Escape closes focus
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const focused = cssRenderer.domElement.style.pointerEvents === "auto";
      if (focused) {
        focuser.restore();
        setTimeout(() => (cssRenderer.domElement.style.pointerEvents = "none"), 260);
      }
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
