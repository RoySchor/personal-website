import * as THREE from "three";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

export function mountScreenOverlay(root, { iframeUrl = "https://example.org" } = {}) {
  const screenMesh = root.getObjectByName("Macbook_screen");
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
  iframe.src = iframeUrl;
  iframe.style.border = "0";
  iframe.style.background = "#111";
  iframe.style.pointerEvents = "none";
  wrapper.appendChild(iframe);

  const cssObject = new CSS3DObject(wrapper);
  screenAnchor.add(cssObject);

  // -- Configuration for Mobile Focused State --
  const MOBILE_WIDTH = 1024;
  const MOBILE_HEIGHT = 1600;
  const MOBILE_Y_OFFSET = 0.04;

  let isFocused = false;

  const fit = () => {
    // Standard Laptop Mode (Default)
    let targetW = Math.min(Math.max(window.innerWidth, 640), 1280);
    let targetH = Math.round(targetW / ASPECT);
    let offsetY = 0;

    if (isFocused && window.innerWidth <= 1024) {
      targetW = MOBILE_WIDTH;
      targetH = MOBILE_HEIGHT;
      offsetY = MOBILE_Y_OFFSET;
    }

    // Apply dimensions to DOM
    wrapper.style.width = `${targetW}px`;
    wrapper.style.height = `${targetH}px`;
    iframe.style.width = `${targetW}px`;
    iframe.style.height = `${targetH}px`;

    // Calculate Scale
    const meshSize = new THREE.Box3()
      .setFromObject(screenMesh)
      .getSize(new THREE.Vector3());

    const s = meshSize.x / targetW;

    cssObject.scale.set(-s, s, 1);
    cssObject.position.set(0, offsetY, 0.002);
  };

  fit();
  window.addEventListener("resize", fit);

  return {
    cssObject,
    iframeEl: iframe,
    wrapper,
    screenMesh,
    screenAnchor,
    refit: fit,
    setFocused: (val) => {
      isFocused = val;
      fit();
    },
  };
}
