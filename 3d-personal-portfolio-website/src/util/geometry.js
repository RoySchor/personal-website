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

// Groups vertices into connected pieces using the triangle indices (union-find). Returns a
// function mapping a vertex index to its piece's representative vertex.
export function connectedPieces(geometry) {
  const vertexCount = geometry.getAttribute("position").count;
  const index = geometry.index;
  const parent = new Int32Array(vertexCount).map((_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const indexCount = index ? index.count : vertexCount;
  const vertexAt = (i) => (index ? index.getX(i) : i);
  for (let i = 0; i < indexCount; i += 3) {
    const a = find(vertexAt(i));
    parent[find(vertexAt(i + 1))] = a;
    parent[find(vertexAt(i + 2))] = find(a);
  }
  return find;
}
