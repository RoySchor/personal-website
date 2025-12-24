import * as THREE from "three";

import musicUrl from "./assets/air-on-a-g-sring.m4a";
import roomUrl from "./assets/portfolio-room.glb?url";
import { createPinchZoom } from "./interactions/pinchZoom.js";
import { createPreviewFocus } from "./interactions/previewFocus.js";
import { createRaycast } from "./interactions/raycast.js";
import { createMatrixLoader } from "./loader.js";
import { createCameraMover } from "./three/cameraMover.js";
import { createThreeContext } from "./three/context.js";
import { createControls, lockAzimuthAroundCurrentView } from "./three/controls.js";
import { createFocusZoom } from "./three/focusZoom.js";
import { addLights } from "./three/lights.js";
import { loadRoom } from "./three/loadRoom.js";
import { mountScreenOverlay } from "./three/screenOverlay.js";
import { makeEvenViewportSync } from "./three/viewport.js";
import { createArrowControls } from "./ui/arrowControls.js";
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

  // NOW create these after controls exists
  const cameraMover = createCameraMover({ camera, controls });

  const arrowControls = createArrowControls({
    camera,
    controls,
    onMove: (direction) => cameraMover.move(direction),
    onZoom: (direction) => cameraMover.zoom(direction),
  });

  // load room glb
  const { root, center, isCoarse } = await loadRoom(ctx, roomUrl, {
    onProgress,
    onAllAssetsLoaded,
  });
  controls.target.copy(center);
  controls.update();
  lockAzimuthAroundCurrentView(controls, camera, center, isCoarse);

  const iframeUrl = import.meta.env.VITE_SCREEN_URL || "/screen/";

  const overlay = mountScreenOverlay(root, { iframeUrl });
  if (!overlay) return;
  const { screenMesh, iframeEl, wrapper, cssObject } = overlay;

  // Update cameraMover with actual mesh/cssObject
  cameraMover.setMesh(screenMesh, cssObject);

  // Find the smallest ancestor that represents the whole laptop
  function getLaptopRoot(node) {
    let cur = node;
    while (cur && cur.parent && !/macbook/i.test(cur.name)) {
      cur = cur.parent;
    }
    return cur || node; // fallback to the mesh itself
  }
  const laptopRoot = getLaptopRoot(screenMesh);

  // Instructions Overlay logic
  const instructions = document.getElementById("instructions-overlay");

  // Create a larger invisible hitbox around the laptop
  const createExpandedHitbox = (targetObject, expandFactor = 1.5, name = "hitbox") => {
    const bbox = new THREE.Box3().setFromObject(targetObject);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());

    const expandedSize = size.clone().multiplyScalar(expandFactor);
    const hitboxGeom = new THREE.BoxGeometry(
      expandedSize.x,
      expandedSize.y,
      expandedSize.z,
    );
    const hitboxMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const hitboxMesh = new THREE.Mesh(hitboxGeom, hitboxMat);

    hitboxMesh.position.copy(center);
    hitboxMesh.name = name;

    scene.add(hitboxMesh);

    return hitboxMesh;
  };

  const laptopHitbox = createExpandedHitbox(laptopRoot, 2.5, "laptop_hitbox");

  // Find the speaker
  let speakerRoot = null;
  root.traverse((obj) => {
    if (
      obj.name &&
      (obj.name === "Amplifer" || obj.name === "Cartoon_Marshall_Amplifer")
    ) {
      if (obj.name === "Amplifer" || !speakerRoot) {
        speakerRoot = obj;
      }
    }
  });

  const speakerHitbox = speakerRoot
    ? createExpandedHitbox(speakerRoot, 1.2, "speaker_hitbox")
    : null;

  // Music Player
  const musicWrapper = document.createElement("div");
  musicWrapper.id = "music-wrapper";
  Object.assign(musicWrapper.style, {
    position: "fixed",
    bottom: "20px",
    left: "20px",
    zIndex: "100",
    visibility: "hidden",
    pointerEvents: "none",
    opacity: "0",
    transition: "opacity 0.3s ease, transform 0.3s ease",
    transform: "translateY(20px)",
  });

  musicWrapper.innerHTML = `
    <div style="position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.5); background: rgba(0,0,0,0.8); border-radius: 4px; padding: 6px; width: 300px;">
        <button id="close-music" style="
            position: absolute;
            top: -12px;
            right: -12px;
            background: #333;
            color: white;
            border: 2px solid white;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            cursor: pointer;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        ">×</button>
        <div style="color: white; font-family: sans-serif; font-size: 12px; margin-bottom: 4px; padding-left: 4px;">
            Johann Sebastian Bach - Air on the G String
        </div>
        <audio controls preload="none" style="width: 100%; height: 30px;">
            <source src="${musicUrl}" type="audio/mp4">
        </audio>
    </div>
  `;
  document.body.appendChild(musicWrapper);

  musicWrapper.querySelector("#close-music").addEventListener("click", () => {
    musicWrapper.style.visibility = "hidden";
    musicWrapper.style.pointerEvents = "none";
    musicWrapper.style.opacity = "0";
    musicWrapper.style.transform = "translateY(20px)";
    const audio = musicWrapper.querySelector("audio");
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  });

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
      overlay.setFocused(true);
      viewport?.dispose();
      pinch.attach();
      arrowControls.show();
      exitBtn.style.display = "block";
    },
    onExit: () => {
      overlay.setFocused(false);
      pinch.detach();
      arrowControls.hide();
      viewport = makeEvenViewportSync(ctx);
      exitBtn.style.display = "none";
    },
    onArmIframe: () => {
      pinch.detach();
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

  const ray = createRaycast(renderer, camera);

  function clickRoom(e) {
    if (gateIfBusy(e)) return;

    // Check speaker
    if (speakerRoot) {
      const speakerHitboxHits = speakerHitbox
        ? ray.intersect(e, speakerHitbox, false)
        : [];
      const speakerHits = ray.intersect(e, speakerRoot, true);
      const hitSpeaker =
        speakerHitboxHits.length > 0 ||
        speakerHits.some((h) => isDesc(h.object, speakerRoot));

      if (hitSpeaker) {
        // Toggle player
        if (musicWrapper.style.visibility === "visible") {
          // Hide and stop
          musicWrapper.style.visibility = "hidden";
          musicWrapper.style.pointerEvents = "none";
          musicWrapper.style.opacity = "0";
          musicWrapper.style.transform = "translateY(20px)";
          const audio = musicWrapper.querySelector("audio");
          if (audio) {
            audio.pause();
            audio.currentTime = 0;
          }
        } else {
          // Show and play
          musicWrapper.style.visibility = "visible";
          musicWrapper.style.pointerEvents = "auto";
          musicWrapper.style.opacity = "1";
          musicWrapper.style.transform = "translateY(0)";
        }
        return;
      }
    }

    // Check hitbox first, then check if we're clicking laptop descendants
    const hitboxHits = ray.intersect(e, laptopHitbox, false);
    const laptopHits = ray.intersect(e, laptopRoot, true);

    const hitLaptop =
      hitboxHits.length > 0 || laptopHits.some((h) => isDesc(h.object, laptopRoot));

    if (hitLaptop) {
      if (!focuser.isFocusing() && preview.isFocused()) return;
      transitioning = true;
      if (instructions) instructions.classList.add("hidden");
      (async () => {
        await focuser.focusOn({
          centerFrom: screenMesh,
          orientFrom: cssObject,
          duration: 650,
        });
        preview.enablePreview();
        transitioning = false;
      })();
      return;
    }
    if (!focuser.isFocusing() && preview.isFocused()) {
      exitFocus();
    }
  }

  function exitFocus() {
    transitioning = true;
    if (instructions) instructions.classList.remove("hidden");
    (async () => {
      await focuser.restore(500);
      preview.disableAllPointers();
      transitioning = false;
    })();
  }

  // hover cursor
  function hoverRoom(e) {
    if (transitioning || focuser.isFocusing()) return;

    let overSpeaker = false;
    if (speakerRoot) {
      const speakerHitboxHits = speakerHitbox
        ? ray.intersect(e, speakerHitbox, false)
        : [];
      const speakerHits = ray.intersect(e, speakerRoot, true);
      overSpeaker = speakerHitboxHits.length > 0 || speakerHits.length > 0;
    }

    const hitboxHits = ray.intersect(e, laptopHitbox, false);
    const laptopHits = ray.intersect(e, laptopRoot, true);
    const overLaptop = hitboxHits.length > 0 || laptopHits.length > 0;
    const c = overLaptop || overSpeaker ? "pointer" : "";
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
