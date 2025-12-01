export function createPreviewFocus({
  cssRoot,
  wrapper,
  iframeEl,
  makeEvenViewportSync,
  ctx,
  onEnter,
  onExit,
  onArmIframe,
}) {
  let focused = false;
  let interactive = false;
  let previewClickArm = null;
  let viewport = makeEvenViewportSync(ctx);

  function enablePreview() {
    focused = true;
    viewport?.dispose();

    cssRoot.style.pointerEvents = "auto";
    cssRoot.style.cursor = "pointer";
    wrapper.style.pointerEvents = "auto";
    iframeEl.style.pointerEvents = "none";
    cssRoot.style.touchAction = "none";
    wrapper.style.touchAction = "none";

    interactive = false;

    const arm = (ev) => {
      ev.stopPropagation();
      iframeEl.style.pointerEvents = "auto";
      iframeEl.style.cursor = "pointer";
      wrapper.style.pointerEvents = "none";
      cssRoot.style.cursor = "";
      onArmIframe?.();
      wrapper.removeEventListener("click", arm, true);
      previewClickArm = null;
      interactive = true;
    };
    previewClickArm = arm;
    wrapper.addEventListener("click", arm, true);

    onEnter?.({ focused: true, interactive: false });
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
