import * as THREE from "three";

// Soft camera-facing puffs that rise off the coffee, grow, sway and fade. Ages are
// staggered so the stream is continuous; each puff respawns at the surface when it dies.

const MUG_NAME = THREE.PropertyBinding.sanitizeNodeName("CoffeeMug.002");
const COFFEE_MATERIAL = "Inside Cup Color";

const PUFF_COUNT = 14;
// Seconds a puff lives, ± LIFETIME_JITTER.
const LIFETIME = 3.2;
const LIFETIME_JITTER = 0.6;
// World-space metres.
const RISE = 0.09;
const START_SIZE = 0.018;
const END_SIZE = 0.055;
const SWAY = 0.008;
const MAX_OPACITY = 0.4;
// Slightly grey so the steam still reads against light walls.
const STEAM_COLOR = 0xd4d4d4;

export function createCoffeeSteam({ root, scene }) {
  // Continuous ambient motion; skip it for visitors who ask for less.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;

  const mug = root.getObjectByName(MUG_NAME);
  if (!mug) {
    console.warn(`coffeeSteam: no "${MUG_NAME}" in the room`);
    return null;
  }

  // Rise from the coffee itself; the mug's own centre is pulled sideways by the handle.
  const coffee =
    mug.children.find(
      (child) => child.isMesh && child.material?.name === COFFEE_MATERIAL,
    ) ?? mug;
  const surface = new THREE.Box3().setFromObject(coffee);
  const surfaceSize = surface.getSize(new THREE.Vector3());
  const spawnRadius = Math.min(surfaceSize.x, surfaceSize.z) * 0.3;

  const group = new THREE.Group();
  group.name = "coffee_steam";
  surface.getCenter(group.position);
  group.position.y = surface.max.y;
  // Added to the scene, not the room model, and never raycast, so steam can't block
  // hover or clicks on nearby objects.
  scene.add(group);

  const texture = createPuffTexture();
  const puffs = Array.from({ length: PUFF_COUNT }, (_, i) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        color: STEAM_COLOR,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      }),
    );
    sprite.raycast = () => {};
    group.add(sprite);

    const puff = { sprite };
    respawn(puff);
    puff.age = (i / PUFF_COUNT) * puff.lifetime;
    return puff;
  });

  function respawn(puff) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * spawnRadius;
    puff.originX = Math.cos(angle) * distance;
    puff.originZ = Math.sin(angle) * distance;
    puff.lifetime = LIFETIME + (Math.random() * 2 - 1) * LIFETIME_JITTER;
    puff.phase = Math.random() * Math.PI * 2;
    puff.spin = (Math.random() * 2 - 1) * 0.6;
    puff.age = 0;
  }

  function update(dt) {
    for (const puff of puffs) {
      puff.age += dt;
      if (puff.age >= puff.lifetime) respawn(puff);

      const t = puff.age / puff.lifetime;
      const { sprite } = puff;
      const sway = SWAY * t;
      sprite.position.set(
        puff.originX + Math.sin(puff.phase + puff.age * 1.7) * sway,
        RISE * (1 - Math.pow(1 - t, 1.5)),
        puff.originZ + Math.cos(puff.phase + puff.age * 1.3) * sway,
      );
      sprite.scale.setScalar(THREE.MathUtils.lerp(START_SIZE, END_SIZE, t));
      sprite.material.opacity = MAX_OPACITY * Math.sin(Math.PI * t);
      sprite.material.rotation += puff.spin * dt;
    }
  }

  return { update };
}

// A soft, slightly lumpy white blob drawn once on a canvas.
function createPuffTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const blobs = [
    [0.5, 0.5, 0.48, 0.55],
    [0.38, 0.42, 0.3, 0.35],
    [0.62, 0.58, 0.28, 0.3],
    [0.55, 0.36, 0.22, 0.25],
  ];
  for (const [x, y, radius, alpha] of blobs) {
    const gradient = ctx.createRadialGradient(
      x * size,
      y * size,
      0,
      x * size,
      y * size,
      radius * size,
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
