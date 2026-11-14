// Copies a 3-component attribute into a plain Float32Array, dequantizing as it goes.
// The room's GLB stores positions and normals as normalized ints (KHR_mesh_quantization),
// which can't hold values past their original bounds; animated geometry needs floats.
export function toFloatArray(attribute) {
  const out = new Float32Array(attribute.count * 3);
  for (let i = 0; i < attribute.count; i++) {
    out[i * 3] = attribute.getX(i);
    out[i * 3 + 1] = attribute.getY(i);
    out[i * 3 + 2] = attribute.getZ(i);
  }
  return out;
}
