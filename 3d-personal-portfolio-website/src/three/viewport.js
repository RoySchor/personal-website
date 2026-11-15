export function makeEvenViewportSync(ctx) {
  const { renderer, cssRenderer, camera } = ctx;

  /**
   * This specifically fixes issues on Safari and Chrome on Mobile devices
   * Issue relates to viewport scaling resizing due to uneven dimensions
   * Fix is to force even dimensions for both the WebGL and CSS renderers
   *
   * Thread relating to multiple issues can be found here:
   * https://github.com/pmndrs/drei/issues/720
   * Unsolved without resolution plan in sight
   */
  function syncSizesEven() {
    // Measure the window, not the canvas: the canvas carries its last fixed pixel size,
    // so measuring it meant a rotate or window resize never grew or shrank the view.
    let w = Math.round(window.innerWidth);
    let h = Math.round(window.innerHeight);

    // force even
    const evenH = h % 2 === 0 ? h : h + 1;
    const evenW = w % 2 === 0 ? w : w + 1;

    // Both layers get the same even pixel box (canvas style included) so they stay aligned.
    renderer.setSize(evenW, evenH);
    cssRenderer.setSize(evenW, evenH);

    // lock CSS box to exact px to avoid fractional layout
    cssRenderer.domElement.style.width = evenW + "px";
    cssRenderer.domElement.style.height = evenH + "px";

    camera.aspect = evenW / evenH;
    camera.updateProjectionMatrix();
  }

  syncSizesEven();
  const onResize = () => syncSizesEven();
  window.addEventListener("resize", onResize, { passive: true });

  return { syncSizesEven, dispose: () => window.removeEventListener("resize", onResize) };
}
