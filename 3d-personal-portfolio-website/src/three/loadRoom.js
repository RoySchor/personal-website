import * as THREE from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

export function loadRoom(
  ctx,
  roomUrl,
  { onProgress = () => {}, onAllAssetsLoaded = () => {} } = {},
) {
  const { renderer, scene, camera } = ctx;
  const cameraRig = scene.children.find((o) => o.isGroup) || scene;

  const manager = new THREE.LoadingManager(
    () => {
      onProgress(1, 1, 1);
      onAllAssetsLoaded();
    },
    (url, loaded, total) => {
      const pct = total ? loaded / total : 0;
      onProgress(pct, loaded, total);
    },
  );

  const gltfLoader = new GLTFLoader(manager);
  const ktx2 = new KTX2Loader(manager)
    .setTranscoderPath(`${import.meta.env.BASE_URL}basis/`)
    .detectSupport(renderer);
  gltfLoader.setKTX2Loader(ktx2);
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);

  return new Promise((resolve, reject) => {
    gltfLoader.load(
      roomUrl,
      (gltf) => {
        const root = gltf.scene;

        // mild material tweak
        root.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;

            const m = obj.material;
            if (!m) return;

            if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
            if (m.emissiveMap) m.emissiveMap.colorSpace = THREE.SRGBColorSpace;
            if (
              m.name &&
              (m.name === "DeskWood" ||
                m.name === "ready_player_one_book_cover" ||
                m.name === "stacked paper")
            ) {
              m.roughness = 0.85;
              m.metalness = 0.0;
              m.needsUpdate = true;
            }
            m.roughness = Math.min((m.roughness ?? 0.5) + 0.2, 1.0);
          }
        });

        scene.add(root);

        // initial camera placement
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        const sizeVec = box.getSize(new THREE.Vector3());
        const radius = sizeVec.length() * 0.5;

        const isCoarse = window.matchMedia("(pointer: coarse)").matches;
        const phoneZoomOutMultiplier = isCoarse ? 1.15 : 1.0;
        const horizontalDist = radius * 1.75 * phoneZoomOutMultiplier;
        const y = horizontalDist * 0.6;

        ctx.center = center; // stash for controls post-config
        camera.position.set(center.x + horizontalDist, center.y + y, center.z - horizontalDist);
        camera.lookAt(center);

        resolve({ root, center, isCoarse });
      },
      undefined,
      (err) => {
        console.error("GLB load error:", err);
        reject(err);
      },
    );
  });
}
