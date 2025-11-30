import * as THREE from "three";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

export function mountScreenOverlay(root, { iframeUrl = "https://example.org" } = {}) {
  const screenMesh = root.getObjectByName("Macbook_screen");
  const screenAnchor = root.getObjectByName("Macbook_screen_anchor");

  if (!screenMesh || !screenAnchor) {
    console.error("❌ Missing Macbook_screen and/or Macbook_screen_anchor");
    return null;
  }
  // Content (swap for iframe when ready)
  const CSS_W = 1920;
  const CSS_H = 1200;

  const wrapper = document.createElement("div");
  wrapper.style.width = CSS_W + "px";
  wrapper.style.height = CSS_H + "px";
  wrapper.style.pointerEvents = "auto";

  const iframe = document.createElement("iframe");
  iframe.src = iframeUrl;
  iframe.style.width = CSS_W + "px";
  iframe.style.height = CSS_H + "px";
  iframe.style.border = "0";
  iframe.style.background = "#111";
  iframe.style.pointerEvents = "none";
  wrapper.appendChild(iframe);

  const cssObject = new CSS3DObject(wrapper);

  // Parent to the anchor (inherits position+rotation)
  screenAnchor.add(cssObject);

  // Match width in world units
  const size = new THREE.Box3().setFromObject(screenMesh).getSize(new THREE.Vector3());
  const pxToWorld = size.x / CSS_W;
  cssObject.scale.set(pxToWorld, pxToWorld, 1);

  // Mirror horizontally for your mesh’s handedness
  cssObject.scale.x *= -1;

  // Lift slightly off the glass
  cssObject.position.set(0, 0, 0.002);

  return { cssObject, iframEl: iframe, wrapper, screenMesh, screenAnchor };
}
