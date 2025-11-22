import { createMatrixLoader } from './loader.js';
import { initThree } from './threeApp.js';

// start matrix loader immediately
const matrix = createMatrixLoader('loader');
matrix.start();

// kick off three.js, stop loader when all assets are ready
initThree({
  canvasId: 'c',
  modelUrl: '/assets/portfolio-room.glb',
  onAllAssetsLoaded: () => {
    matrix.stop(); // fade out + remove loader
  },
});
