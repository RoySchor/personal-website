import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

export function initThree({
  canvasId = 'c',
  modelUrl = `${import.meta.env.BASE_URL}assets/portfolio-room.glb`,
  onAllAssetsLoaded = () => {},
  onProgress = () => {}, // <— NEW
} = {}) {
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

  // CSS3D Renderer for HTML overlay
  const cssRenderer = new CSS3DRenderer();
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.domElement.style.position = 'absolute';
  cssRenderer.domElement.style.top = '0';
  cssRenderer.domElement.style.left = '0';
  cssRenderer.domElement.style.pointerEvents = 'none';
  cssRenderer.domElement.style.zIndex = '10'; // Make sure it's on top
  document.body.appendChild(cssRenderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.maxDistance = 12;
  controls.minDistance = 1.0;

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

  // Loading manager: progress + done
  const manager = new THREE.LoadingManager(
    () => {
      onProgress(1, 1, 1); // ensure 100%
      onAllAssetsLoaded();
    },
    (url, loaded, total) => {
      // Some pipelines don't know 'total'; clamp if needed
      const pct = total ? loaded / total : 0;
      onProgress(pct, loaded, total);
    }
  );

  const gltfLoader = new GLTFLoader(manager);
  const ktx2 = new KTX2Loader(manager).setTranscoderPath('/basis/').detectSupport(renderer);
  gltfLoader.setKTX2Loader(ktx2);
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);

  gltfLoader.load(
    modelUrl,
    (gltf) => {
      const root = gltf.scene;

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

      // Add HTML to MacBook screen
      const screenMesh = root.getObjectByName('Macbook_screen');
      if (screenMesh) {
        // Create a bright test div (easier to see than iframe)
        const testDiv = document.createElement('div');
        testDiv.style.width = '1920px';
        testDiv.style.height = '1200px';
        testDiv.style.background = 'linear-gradient(45deg, #ff00ff, #00ffff)';
        testDiv.style.border = '20px solid lime';
        testDiv.style.display = 'flex';
        testDiv.style.alignItems = 'center';
        testDiv.style.justifyContent = 'center';
        testDiv.style.fontSize = '200px';
        testDiv.style.fontWeight = 'bold';
        testDiv.style.color = 'yellow';
        testDiv.innerHTML = 'TEST';
        testDiv.style.pointerEvents = 'none';

        // Wrap in CSS3DObject
        const cssObject = new CSS3DObject(testDiv);

        // Get WORLD transforms (includes parent transforms from Blender hierarchy)
        screenMesh.updateWorldMatrix(true, false);

        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();

        worldPos.setFromMatrixPosition(screenMesh.matrixWorld);
        worldQuat.setFromRotationMatrix(screenMesh.matrixWorld);
        worldScale.setFromMatrixScale(screenMesh.matrixWorld);

        cssObject.position.copy(worldPos);
        cssObject.quaternion.copy(worldQuat);

        // Apply the rotation correction we found earlier
        const correctionQuat = new THREE.Quaternion();
        correctionQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 3.9);
        cssObject.quaternion.multiply(correctionQuat);

        // Non-uniform scale: adjust X (width) and Y (height) independently
        // Use NEGATIVE scale to mirror instead of rotating!
        const scaleX = -0.00245; // Negative to flip horizontally
        const scaleY = 0.00034;
        const scaleZ = 0.0003;
        cssObject.scale.set(scaleX, scaleY, scaleZ);

        scene.add(cssObject);
      } else {
        console.error('❌ Macbook_screen not found');
      }

      // Camera placement
      const box = new THREE.Box3().setFromObject(root);
      const center = box.getCenter(new THREE.Vector3());
      const sizeVec = box.getSize(new THREE.Vector3());
      const radius = sizeVec.length() * 0.5;

      controls.target.copy(center);

      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      const phoneZoomOutMultiplier = isCoarse ? 1.15 : 1.0;
      const horizontalDist = radius * 1.75 * phoneZoomOutMultiplier;

      const y = horizontalDist * 0.6;
      camera.position.set(center.x + horizontalDist, center.y + y, center.z - horizontalDist);
      camera.lookAt(center);

      controls.maxPolarAngle = Math.PI * 0.49;
      controls.update();

      const startAz = Math.atan2(
        camera.position.z - controls.target.z,
        camera.position.x - controls.target.x
      );

      const halfFanDeg = isCoarse ? 100 : 125;
      const halfFan = THREE.MathUtils.degToRad(halfFanDeg);

      requestAnimationFrame(() => {
        // Allow only a fan around the current view
        controls.minAzimuthAngle = startAz + halfFan;
        controls.maxAzimuthAngle = startAz - halfFan;

        // Zoom limits
        controls.minDistance = .5;
        controls.maxDistance = 8.0;

        controls.update();
      });
    },
    undefined,
    (err) => console.error('GLB load error:', err)
  );

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  function animate() {
    window.requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    cssRenderer.render(scene, camera);
  }
  animate();

  return { renderer, scene, camera, controls };
}
