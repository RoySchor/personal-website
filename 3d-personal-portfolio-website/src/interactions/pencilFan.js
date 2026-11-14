import * as THREE from "three";

// The pencil bodies are merged into the holder's mesh (one primitive per material), so
// they can't be moved individually. Instead the pencil vertices are deformed: everything
// rises a little and the tops fan out from the holder's centre axis.

const HOLDER_NAME = "PencilHolder_Bottom";
const PENCIL_MATERIAL_PREFIX = "Pencil";

// World-space rise in metres.
const LIFT = 0.015;
// How far the pencil tips spread, as a fraction of their distance from the centre axis.
const SPREAD = 0.25;
// Easing speed; higher settles faster. Frame-rate independent.
const EASE_SPEED = 10;
// How long a tap holds the fanned-out pose on touch devices.
const TAP_HOLD_MS = 600;

export function createPencilFan({ root, ray }) {
  const holder = root.getObjectByName(HOLDER_NAME);
  if (!holder) {
    console.warn(`pencilFan: no "${HOLDER_NAME}" in the room`);
    return null;
  }

  const holderMesh = holder.children.find((child) => child.isMesh && isHolderBody(child));
  const pencilMeshes = holder.children.filter(
    (child) => child.isMesh && !isHolderBody(child),
  );
  if (!holderMesh || pencilMeshes.length === 0) {
    console.warn("pencilFan: could not find the holder body and pencil parts");
    return null;
  }

  // All parts share the holder node's local space, which has no rotation, so local +Y is up.
  holderMesh.geometry.computeBoundingBox();
  const holderBox = holderMesh.geometry.boundingBox;
  const centerX = (holderBox.min.x + holderBox.max.x) / 2;
  const centerZ = (holderBox.min.z + holderBox.max.z) / 2;
  const rimY = holderBox.max.y;
  const tipY = Math.max(...pencilMeshes.map((mesh) => maxY(mesh.geometry)));
  const liftLocal = LIFT / holder.getWorldScale(new THREE.Vector3()).y;

  const parts = pencilMeshes.map((mesh) => {
    const rest = toFloatPositions(mesh.geometry);
    const positions = new THREE.BufferAttribute(rest.slice(), 3);
    positions.setUsage(THREE.DynamicDrawUsage);
    mesh.geometry.setAttribute("position", positions);
    // Deformed vertices leave the original bounds; these meshes are tiny, so skip culling.
    mesh.frustumCulled = false;
    return { rest, positions };
  });

  // Covers the holder and the raised pencils so hover doesn't flicker while they move.
  const hitBox = new THREE.Box3().setFromObject(holder);
  hitBox.max.y += LIFT;
  hitBox.expandByScalar(0.01);

  let hovered = false;
  let holdUntil = 0;
  let progress = 0;

  function apply() {
    for (const { rest, positions } of parts) {
      const out = positions.array;
      for (let i = 0; i < rest.length; i += 3) {
        const x = rest[i];
        const y = rest[i + 1];
        const z = rest[i + 2];
        // 0 at the holder's rim, 1 at the tips: only the exposed part fans out.
        const height = THREE.MathUtils.clamp((y - rimY) / (tipY - rimY), 0, 1);
        const spread = SPREAD * height * progress;
        out[i] = x + (x - centerX) * spread;
        out[i + 1] = y + liftLocal * progress;
        out[i + 2] = z + (z - centerZ) * spread;
      }
      positions.needsUpdate = true;
    }
  }

  // Returns true when the pointer is over the pencil holder.
  function hoverAt(e) {
    hovered = ray.hitsBox(e, hitBox);
    return hovered;
  }

  function clearHover() {
    hovered = false;
  }

  // Returns true when the tap landed on the pencil holder.
  function tapAt(e) {
    if (!ray.hitsBox(e, hitBox)) return false;
    holdUntil = performance.now() + TAP_HOLD_MS;
    return true;
  }

  function update(dt) {
    const target = hovered || performance.now() < holdUntil ? 1 : 0;
    if (progress === target) return;

    progress += (target - progress) * (1 - Math.exp(-EASE_SPEED * dt));
    if (Math.abs(target - progress) < 0.001) progress = target;
    apply();
  }

  return { hoverAt, clearHover, tapAt, update };
}

function isHolderBody(mesh) {
  return !mesh.material?.name?.startsWith(PENCIL_MATERIAL_PREFIX);
}

function maxY(geometry) {
  geometry.computeBoundingBox();
  return geometry.boundingBox.max.y;
}

// Positions are stored as normalized int16 (KHR_mesh_quantization), which can't go past
// the original bounds; copy them to floats so the pencils can rise above their tips.
function toFloatPositions(geometry) {
  const source = geometry.getAttribute("position");
  const out = new Float32Array(source.count * 3);
  for (let i = 0; i < source.count; i++) {
    out[i * 3] = source.getX(i);
    out[i * 3 + 1] = source.getY(i);
    out[i * 3 + 2] = source.getZ(i);
  }
  return out;
}
