import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Let CSS show through (we'll add a radial gradient in CSS)
renderer.setClearAlpha(0);

const scene = new THREE.Scene();

// Subtle environment for PBR balance
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;

// Camera + controls
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.maxDistance = 12;
controls.minDistance = 1.0;

// Lights (key + fill + hemi)
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
scene.add(hemiLight);
// directionalLight.intensity = 0.8;

// scene.add(new THREE.HemisphereLight(0xffffff, 0x444a55, 0.9));

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

// Load GLB (KTX2 + Meshopt)
const gltfLoader = new GLTFLoader();
const ktx2 = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer);
gltfLoader.setKTX2Loader(ktx2);
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

gltfLoader.load(
  '/assets/portfolio-room.glb',
  (gltf) => {
    const root = gltf.scene;

    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const m = obj.material;
        if (m && m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        if (m && m.emissiveMap) m.emissiveMap.colorSpace = THREE.SRGBColorSpace;
      }

      if (obj.isMesh && obj.material) {

        // Fix glare on specific materials
        if (obj.material.name === "DeskWood" || obj.material.name === "ready_player_one_book_cover" || obj.material.name === "stacked paper") {
          obj.material.roughness = 0.85;
          obj.material.metalness = 0.0;
          obj.material.needsUpdate = true;
        }
        obj.material.roughness = Math.min(obj.material.roughness + 0.2, 1.0);
      }
    });

    scene.add(root);

    // Frame & place camera ~35° down angle
    const box = new THREE.Box3().setFromObject(root);
    const center = box.getCenter(new THREE.Vector3());
    const sizeVec = box.getSize(new THREE.Vector3());
    const radius = sizeVec.length() * 0.5;

    controls.target.copy(center);

    const horizontalDist = radius * 1.75;
    const y = horizontalDist * 0.6;

    camera.position.set(
      center.x + horizontalDist,
      center.y + y,
      center.z - horizontalDist);
    camera.lookAt(center);

    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();
  },
  undefined,
  (err) => console.error('GLB load error:', err)
);

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
