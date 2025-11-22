import { createMatrixLoader } from './loader.js';
import { initThree } from './threeApp.js';

// Start Matrix rain overlay
const matrix = createMatrixLoader('loader');
matrix.start();

initThree({
  canvasId: 'c',
  modelUrl: '/assets/portfolio-room.glb',

  // Update progress bar as assets stream in
  onProgress: (pct /* 0..1 */) => {
    matrix.setProgress(pct || 0);
  },

  // When everything is ready, fade out the loader
  onAllAssetsLoaded: () => {
    matrix.setProgress(1);
    matrix.stop();
  },
});
