export function createExitButton(onClick) {
  const btn = document.createElement("button");
  btn.textContent = "Exit";
  Object.assign(btn.style, {
    position: "fixed",
    top: "12px",
    right: "30px",
    zIndex: "99999",
    padding: "8px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.3)",
    background: "rgba(0,0,0,0.55)",
    color: "#fff",
    font: "500 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    backdropFilter: "blur(6px)",
    cursor: "pointer",
    display: "none",
  });
  btn.addEventListener("click", onClick);
  document.body.appendChild(btn);
  return btn;
}
