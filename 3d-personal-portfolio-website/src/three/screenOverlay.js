import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

export function mountScreenOverlay(root) {
  const screenMesh   = root.getObjectByName('Macbook_screen');
  const screenAnchor = root.getObjectByName('Macbook_screen_anchor');

  if (!screenMesh || !screenAnchor) {
    console.error('❌ Missing Macbook_screen and/or Macbook_screen_anchor');
    return null;
  }

  // Content (swap for iframe when ready)
  const CSS_W = 1920;
  const CSS_H = 1200;
  const testDiv = document.createElement('div');
  testDiv.style.width  = CSS_W + 'px';
  testDiv.style.height = CSS_H + 'px';
  testDiv.style.background = 'linear-gradient(45deg,#ff00ff,#00ffff)';
  testDiv.style.border = '8px solid lime';
  testDiv.style.display = 'flex';
  testDiv.style.alignItems = 'center';
  testDiv.style.justifyContent = 'center';
  testDiv.style.fontSize = '64px';
  testDiv.style.fontWeight = 'bold';
  testDiv.style.color = 'yellow';
  testDiv.textContent = 'TEST';
  testDiv.style.pointerEvents = 'auto';

  const cssObject = new CSS3DObject(testDiv);

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

  return { cssObject, element: testDiv, screenMesh, screenAnchor };
}
