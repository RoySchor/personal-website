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

const TRACKS = [
  {
    id: "youtube-led-zeppelin",
    title: "Led Zeppelin - Gallows Pole",
    source: "youtube",
    youtubeId: "CmxaT37yeOs",
  },
  {
    id: "youtube-beatles",
    title: "The Beatles - Hey Jude",
    source: "youtube",
    youtubeId: "mQER0A0ej0M",
  },
  {
    id: "local-bach",
    title: "Johann Sebastian Bach - Air on the G String",
    source: "local",
  },
];

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

  let ytPlayer = null;
  let ytApiPromise = null;
  let ytLoadedVideoId = null;
  const localAudio = new window.Audio(musicUrl);
  localAudio.preload = "none";
  let currentTrackIndex = 0;
  let hasRandomizedTrack = false;

  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (ytApiPromise) return ytApiPromise;

    ytApiPromise = new Promise((resolve, reject) => {
      const existingTag = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      );
      if (!existingTag) {
        const scriptTag = document.createElement("script");
        scriptTag.src = "https://www.youtube.com/iframe_api";
        scriptTag.async = true;
        scriptTag.onerror = () => reject(new Error("Failed to load YouTube API"));
        document.head.appendChild(scriptTag);
      }

      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousReady === "function") previousReady();
        resolve(window.YT);
      };

      const maxWaitMs = 10000;
      const pollMs = 100;
      let waited = 0;
      const timer = window.setInterval(() => {
        if (window.YT && window.YT.Player) {
          window.clearInterval(timer);
          resolve(window.YT);
          return;
        }
        waited += pollMs;
        if (waited >= maxWaitMs) {
          window.clearInterval(timer);
          reject(new Error("Timed out waiting for YouTube API"));
        }
      }, pollMs);
    });

    return ytApiPromise;
  }

  function getCurrentTrack() {
    return TRACKS[currentTrackIndex];
  }

  function stopMusicPlayback() {
    try {
      localAudio.pause();
      localAudio.currentTime = 0;
    } catch {}
    if (!ytPlayer) return;
    try {
      ytPlayer.stopVideo();
    } catch {}
  }

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
        <div id="music-track-title" style="color: white; font-family: sans-serif; font-size: 12px; margin-bottom: 4px; padding-left: 4px;"></div>
        <div style="display: flex; gap: 6px;">
            <button id="music-play" style="flex: 1; height: 30px; border: 0; border-radius: 4px; cursor: pointer;">Play</button>
            <button id="music-pause" style="flex: 1; height: 30px; border: 0; border-radius: 4px; cursor: pointer;">Pause</button>
            <button id="music-stop" style="flex: 1; height: 30px; border: 0; border-radius: 4px; cursor: pointer;">Stop</button>
            <button id="music-next" style="flex: 1; height: 30px; border: 0; border-radius: 4px; cursor: pointer;">Next</button>
        </div>
        <div id="music-status" style="color: #ccc; font-family: sans-serif; font-size: 11px; margin-top: 6px; padding-left: 4px;">
            Ready
        </div>
        <div id="yt-player" style="position: absolute; width: 1px; height: 1px; left: -9999px; top: -9999px; pointer-events: none;"></div>
    </div>
  `;
  document.body.appendChild(musicWrapper);

  const musicStatus = musicWrapper.querySelector("#music-status");
  const musicTrackTitle = musicWrapper.querySelector("#music-track-title");

  function setMusicStatus(text) {
    if (musicStatus) musicStatus.textContent = text;
  }

  function syncTrackTitle() {
    const currentTrack = getCurrentTrack();
    if (musicTrackTitle) musicTrackTitle.textContent = currentTrack.title;
  }

  syncTrackTitle();

  async function ensureYouTubePlayer(initialVideoId) {
    if (ytPlayer) return ytPlayer;
    setMusicStatus("Loading player...");
    const YT = await loadYouTubeApi();
    return new Promise((resolve) => {
      ytPlayer = new YT.Player("yt-player", {
        height: "1",
        width: "1",
        videoId: initialVideoId,
        playerVars: {
          rel: 0,
          controls: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            setMusicStatus("Ready");
            resolve(ytPlayer);
          },
          onStateChange: (event) => {
            if (getCurrentTrack().source !== "youtube") return;
            const state = YT.PlayerState;
            if (event.data === state.PLAYING) setMusicStatus("Playing");
            else if (event.data === state.PAUSED) setMusicStatus("Paused");
            else if (event.data === state.BUFFERING) setMusicStatus("Buffering...");
            else if (event.data === state.ENDED) setMusicStatus("Ended");
          },
        },
      });
      ytLoadedVideoId = initialVideoId;
    });
  }

  localAudio.addEventListener("play", () => {
    if (getCurrentTrack().source === "local") setMusicStatus("Playing");
  });

  localAudio.addEventListener("pause", () => {
    if (getCurrentTrack().source === "local" && localAudio.currentTime > 0) {
      setMusicStatus("Paused");
    }
  });

  localAudio.addEventListener("waiting", () => {
    if (getCurrentTrack().source === "local") setMusicStatus("Buffering...");
  });

  localAudio.addEventListener("ended", () => {
    if (getCurrentTrack().source === "local") setMusicStatus("Ended");
  });

  async function playCurrentTrack({ restart = false } = {}) {
    const currentTrack = getCurrentTrack();
    syncTrackTitle();
    setMusicStatus("Loading...");

    if (currentTrack.source === "local") {
      // Keep sources mutually exclusive.
      if (ytPlayer) {
        try {
          ytPlayer.pauseVideo();
        } catch {}
      }
      if (restart) {
        try {
          localAudio.currentTime = 0;
        } catch {}
      }
      try {
        await localAudio.play();
      } catch {
        setMusicStatus("Playback blocked");
      }
      return;
    }

    try {
      const player = await ensureYouTubePlayer(currentTrack.youtubeId);
      // Keep sources mutually exclusive.
      try {
        localAudio.pause();
      } catch {}
      const isDifferentYoutubeTrack = ytLoadedVideoId !== currentTrack.youtubeId;
      if (isDifferentYoutubeTrack) {
        player.loadVideoById(currentTrack.youtubeId);
        ytLoadedVideoId = currentTrack.youtubeId;
        return;
      }
      if (restart) {
        try {
          player.seekTo(0, true);
        } catch {}
      }
      player.playVideo();
    } catch {
      // If YouTube can't load, force reliable fallback track.
      currentTrackIndex = TRACKS.findIndex((track) => track.source === "local");
      syncTrackTitle();
      setMusicStatus("YouTube unavailable. Playing local track.");
      try {
        await localAudio.play();
      } catch {
        setMusicStatus("Unable to play local fallback");
      }
    }
  }

  musicWrapper.querySelector("#music-play").addEventListener("click", async () => {
    await playCurrentTrack();
  });

  musicWrapper.querySelector("#music-next").addEventListener("click", async () => {
    currentTrackIndex = (currentTrackIndex + 1) % TRACKS.length;
    await playCurrentTrack({ restart: true });
  });

  musicWrapper.querySelector("#music-pause").addEventListener("click", () => {
    const currentTrack = getCurrentTrack();
    if (currentTrack.source === "local") {
      localAudio.pause();
      return;
    }
    if (!ytPlayer) return;
    try {
      ytPlayer.pauseVideo();
    } catch {}
  });

  musicWrapper.querySelector("#music-stop").addEventListener("click", () => {
    stopMusicPlayback();
    setMusicStatus("Stopped");
  });

  musicWrapper.querySelector("#close-music").addEventListener("click", () => {
    musicWrapper.style.visibility = "hidden";
    musicWrapper.style.pointerEvents = "none";
    musicWrapper.style.opacity = "0";
    musicWrapper.style.transform = "translateY(20px)";
    stopMusicPlayback();
    setMusicStatus("Stopped");
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
          stopMusicPlayback();
          setMusicStatus("Stopped");
        } else {
          // Show and play
          musicWrapper.style.visibility = "visible";
          musicWrapper.style.pointerEvents = "auto";
          musicWrapper.style.opacity = "1";
          musicWrapper.style.transform = "translateY(0)";
          if (!hasRandomizedTrack) {
            currentTrackIndex = Math.floor(Math.random() * TRACKS.length);
            hasRandomizedTrack = true;
            syncTrackTitle();
            playCurrentTrack();
          } else {
            syncTrackTitle();
          }
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
        stopMusicPlayback();
      } catch {}
      try {
        musicWrapper.remove();
      } catch {}
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
