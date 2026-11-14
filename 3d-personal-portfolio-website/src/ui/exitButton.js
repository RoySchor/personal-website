export function createExitButton(onClick) {
  // Inject styles if not present
  if (!document.getElementById("ui-styles")) {
    const style = document.createElement("style");
    style.id = "ui-styles";
    style.textContent = `
      .exit-button {
        position: fixed;
        z-index: 99999;
        padding: 8px 12px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.3);
        background: rgba(0,0,0,0.55);
        color: #fff;
        font: 500 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        backdrop-filter: blur(6px);
        cursor: pointer;
        display: none;
        top: 12px;
        right: 50px;
      }
      .arrow-controls {
        position: fixed;
        display: none;
        z-index: 10000;
        user-select: none;
        top: 60px;
        right: 30px;
      }

      .controls-grid {
        display: grid;
        grid-template-columns: 30px 30px 30px;
        grid-template-rows: 30px 30px 30px;
        gap: 4px;
        grid-template-areas:
          "zin up zout"
          "left . right"
          ". down .";
      }

      /* Map classes to areas */
      .btn-zoom-in { grid-area: zin; }
      .btn-zoom-out { grid-area: zout; }
      .btn-up { grid-area: up; }
      .btn-down { grid-area: down; }
      .btn-left { grid-area: left; }
      .btn-right { grid-area: right; }

      @media (max-width: 1024px) {
        .controls-grid {
          gap: 7px;
        }

        .arrow-controls {
          top: auto;
          bottom: 5px;
          right: 10px;
        }

        /* Mobile: two rows with zoom on the left
             +   Up    Down
             -   Left  Right */
        .controls-grid {
          grid-template-columns: 30px 30px 30px;
          grid-template-rows: 30px 30px;
          grid-template-areas:
            "zin  up   down"
            "zout left right";
        }

        /* Sit just left of the grid (3 cols + 2 gaps ≈ 106px wide, at right: 10px). */
        .exit-button {
          top: auto;
          bottom: 5px;
          right: 125px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const btn = document.createElement("button");
  btn.className = "exit-button";
  btn.textContent = "Exit";

  btn.addEventListener("click", onClick);
  document.body.appendChild(btn);
  return btn;
}
