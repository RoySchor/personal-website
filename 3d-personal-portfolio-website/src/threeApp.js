// src/threeApp.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

export function initThree({
  canvasId = 'c',
  modelUrl = '/assets/portfolio-room.glb',
  onAllAssetsLoaded = () => {},
} = {}) {
  // renderer
  const canvas = document.getElementById(canvasId);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearAlpha(0);

  // scene
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;

  // camera + controls
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.maxDistance = 12;
  controls.minDistance = 1.0;

  // lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(5, 7, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 25;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-4, 3, -5);
  scene.add(fill);

  // loading manager: fires once KTX2 + GLB done
  const manager = new THREE.LoadingManager(() => {
    onAllAssetsLoaded();
  });

  // loaders
  const gltfLoader = new GLTFLoader(manager);
  const ktx2 = new KTX2Loader(manager).setTranscoderPath('/basis/').detectSupport(renderer);
  gltfLoader.setKTX2Loader(ktx2);
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);

  // load model
  gltfLoader.load(
    modelUrl,
    (gltf) => {
      const root = gltf.scene;

      // material tweaks (glare)
      root.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;

          const m = obj.material;
          if (m && m.map) m.map.colorSpace = THREE.SRGBColorSpace;
          if (m && m.emissiveMap) m.emissiveMap.colorSpace = THREE.SRGBColorSpace;

          if (m && m.name) {
            if (
              m.name === 'DeskWood' ||
              m.name === 'ready_player_one_book_cover' ||
              m.name === 'stacked paper'
            ) {
              m.roughness = 0.85;
              m.metalness = 0.0;
              m.needsUpdate = true;
            }
            m.roughness = Math.min((m.roughness ?? 0.5) + 0.2, 1.0);
          }
        }
      });

      scene.add(root);

      // frame and place camera (~35° down, rotated to look into room)
      const box = new THREE.Box3().setFromObject(root);
      const center = box.getCenter(new THREE.Vector3());
      const sizeVec = box.getSize(new THREE.Vector3());
      const radius = sizeVec.length() * 0.5;

      controls.target.copy(center);

      const horizontalDist = radius * 1.75;
      const y = horizontalDist * 0.6;
      // look from diagonal front-left -> into room (swap sign on Z to rotate)
      camera.position.set(center.x + horizontalDist, center.y + y, center.z - horizontalDist);
      camera.lookAt(center);

      controls.maxPolarAngle = Math.PI * 0.49;
      controls.update();
    },
    undefined,
    (err) => console.error('GLB load error:', err)
  );

  // resize & loop
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  function animate() {
    window.requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // expose a few handles if you need them later
  return { renderer, scene, camera, controls };
}
