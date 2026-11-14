export function createPreviewFocus({
  cssRoot,
  wrapper,
  iframeEl,
  onEnter,
  onExit,
  onArmIframe,
}) {
  let focused = false;

  function enablePreview() {
    focused = true;

    cssRoot.style.pointerEvents = "none";
    cssRoot.style.cursor = "";
    wrapper.style.pointerEvents = "auto";
    iframeEl.style.pointerEvents = "auto";
    iframeEl.style.cursor = "auto";
    iframeEl.style.touchAction = "auto";
    cssRoot.style.touchAction = "auto";
    wrapper.style.touchAction = "auto";

    onEnter?.();
    onArmIframe?.();
  }

  function disableAllPointers() {
    focused = false;
    cssRoot.style.pointerEvents = "none";
    cssRoot.style.cursor = "";
    wrapper.style.pointerEvents = "none";
    iframeEl.style.pointerEvents = "none";
    iframeEl.style.cursor = "";
    iframeEl.style.touchAction = "";
    cssRoot.style.touchAction = "";
    wrapper.style.touchAction = "";

    onExit?.();
  }

  return {
    enablePreview,
    disableAllPointers,
    isFocused: () => focused,
  };
}
