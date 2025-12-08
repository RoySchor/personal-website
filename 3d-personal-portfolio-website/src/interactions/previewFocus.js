export function createPreviewFocus({
  cssRoot,
  wrapper,
  iframeEl,
  makeEvenViewportSync,
  ctx,
  onEnter,
  onExit,
  onArmIframe,
  controls,
  glRoot,
  cssRoot,
}) {
  let focused = false;
  let interactive = false;
  let previewClickArm = null;
  let viewport = makeEvenViewportSync(ctx);

  const originalDomElement = controls.domElement;

  function enablePreview() {
    focused = true;
    viewport?.dispose();

    if (controls) {
      controls.enabled = false;
    }

    if (controls && cssRoot) {
      controls.domElement = cssRoot.domElement;
    }

    if (glRoot) {
      glRoot.style.touchAction = "pan-y";
    }

    cssRoot.style.pointerEvents = "auto";
    cssRoot.style.cursor = "";
    wrapper.style.pointerEvents = "none";
    iframeEl.style.pointerEvents = "auto";
    iframeEl.style.cursor = "auto";
    iframeEl.style.touchAction = "pan-y";
    cssRoot.style.touchAction = "pan-y";
    wrapper.style.touchAction = "pan-y";

    interactive = true;

    onEnter?.({ focused: true, interactive: true });
    onArmIframe?.();
  }

  function disableAllPointers() {
    focused = false;
    interactive = false;
    cssRoot.style.pointerEvents = "none";
    cssRoot.style.cursor = "";
    wrapper.style.pointerEvents = "none";
    iframeEl.style.pointerEvents = "none";
    iframeEl.style.cursor = "";
    cssRoot.style.touchAction = "";
    wrapper.style.touchAction = "";

    if (controls && originalDomElement) {
      controls.domElement = originalDomElement;
    }

    if (controls) {
      controls.enabled = true;
    }

    if (glRoot) {
      glRoot.style.touchAction = "none";
    }

    cssRoot.style.pointerEvents = "none";
    viewport = makeEvenViewportSync(ctx);

    if (previewClickArm) {
      wrapper.removeEventListener("click", previewClickArm, true);
      previewClickArm = null;
    }
    onExit?.({ focused: false });
  }

  return {
    enablePreview,
    disableAllPointers,
    isFocused: () => focused,
    isInteractive: () => interactive,
    getViewportHandle: () => viewport,
  };
}
