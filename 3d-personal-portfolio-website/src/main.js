import roomUrl from './assets/portfolio-room.glb?url';
import { createMatrixLoader } from './loader.js';
import { createThreeContext } from './three/context.js';
import { createControls, lockAzimuthAroundCurrentView } from './three/controls.js';
import { addLights } from './three/lights.js';
import { loadRoom } from './three/loadRoom.js';
import { mountScreenOverlay } from './three/screenOverlay.js';
import { makeEvenViewportSync } from './three/viewport.js';

// Start Matrix rain overlay
const matrix = createMatrixLoader('loader');
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
  const ctx = createThreeContext('c');
  const { renderer, cssRenderer, scene, camera } = ctx;

  // keep both renderers in perfect sync (even width/height)
  const viewport = makeEvenViewportSync(ctx);

  // world
  addLights(scene);
  const controls = createControls(camera, renderer.domElement);

  // load room glb
  const { root, center, isCoarse } = await loadRoom(ctx, roomUrl, { onProgress, onAllAssetsLoaded });
  controls.target.copy(center);
  controls.update();
  lockAzimuthAroundCurrentView(controls, camera, center, isCoarse);

  // mount CSS3D overlay on laptop screen
  mountScreenOverlay(root);

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
      try { cssRenderer.domElement.remove(); } catch {}
      try { renderer.dispose(); } catch {}
      try { viewport.dispose(); } catch {}
    });
  }
})();
