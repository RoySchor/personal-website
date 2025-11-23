import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export function createThreeContext(
  canvasId = 'c'
) {
  const canvas = document.getElementById(canvasId);

  // WebGL renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearAlpha(0);
  renderer.domElement.style.touchAction = 'none';

  // CSS3D Renderer for HTML overlay
  const cssRenderer = new CSS3DRenderer();
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.domElement.id = 'css3d-root'; // New
  cssRenderer.domElement.style.position = 'fixed';
  cssRenderer.domElement.style.top = '0'; // To remove check first
  cssRenderer.domElement.style.left = '0'; // To remove check first
  cssRenderer.domElement.style.pointerEvents = 'none';
  cssRenderer.domElement.style.inset = '0';
  cssRenderer.domElement.style.zIndex = '10'; // Make sure it's on top
  document.getElementById('css3d-root')?.remove();
  document.body.appendChild(cssRenderer.domElement);

  // Scene + Environment
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;

  // Camera
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.05,
    100
  );

  return { renderer, cssRenderer, scene, camera };
}
