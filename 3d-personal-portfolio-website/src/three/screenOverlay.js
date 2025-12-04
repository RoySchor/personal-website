import * as THREE from "three";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

export function mountScreenOverlay(
  root,
  { iframeUrl = "https://example.org" } = {}
) {
  const screenMesh   = root.getObjectByName("Macbook_screen");
  const screenAnchor = root.getObjectByName("Macbook_screen_anchor");
  if (!screenMesh || !screenAnchor) {
    console.error("❌ Missing Macbook_screen and/or Macbook_screen_anchor");
    return null;
  }

  // Base aspect ratio
  const BASE_W = 1920;
  const BASE_H = 1200;
  const ASPECT = BASE_W / BASE_H;

  const wrapper = document.createElement("div");
  wrapper.style.pointerEvents = "none";

  const iframe = document.createElement("iframe");
  iframe.src = iframeUrl; // your /screen app
  iframe.style.border = "0";
  iframe.style.background = "#111";
  iframe.style.pointerEvents = "none";
  wrapper.appendChild(iframe);

  const cssObject = new CSS3DObject(wrapper);
  screenAnchor.add(cssObject);

  const fit = () => {
    const targetCSSWidth  = Math.min(Math.max(window.innerWidth, 640), 1280);
    const targetCSSHeight = Math.round(targetCSSWidth / ASPECT);

    wrapper.style.width  = `${targetCSSWidth}px`;
    wrapper.style.height = `${targetCSSHeight}px`;
    iframe.style.width   = `${targetCSSWidth}px`;
    iframe.style.height  = `${targetCSSHeight}px`;

    const meshSize = new THREE.Box3().setFromObject(screenMesh).getSize(new THREE.Vector3());
    const s = meshSize.x / targetCSSWidth;

    cssObject.scale.set(-s, s, 1);
    cssObject.position.set(0, 0, 0.002);
  };

  fit();
  window.addEventListener("resize", fit);

  return { cssObject, iframeEl: iframe, wrapper, screenMesh, screenAnchor, refit: fit };
}
