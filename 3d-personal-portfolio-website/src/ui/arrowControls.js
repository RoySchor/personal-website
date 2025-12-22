export function createArrowControls({ camera, controls, onMove, onZoom }) {
  const container = document.createElement("div");
  container.className = "arrow-controls";

  // Grid layout: handled by CSS now
  const grid = document.createElement("div");
  grid.className = "controls-grid";

  const createButton = (type, direction, className, label) => {
    const btn = document.createElement("button");
    btn.className = className;
    // Base styles
    btn.style.background = "rgba(0, 0, 0, 0.7)";
    btn.style.border = "2px solid rgba(255, 255, 255, 0.3)";
    btn.style.borderRadius = "10px";
    btn.style.color = "white";
    btn.style.fontSize = "12px";
    btn.style.cursor = "pointer";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    // Grid area handled by CSS class
    btn.style.touchAction = "none";
    btn.style.transition = "all 0.15s";
    btn.style.backdropFilter = "blur(10px)";

    btn.innerHTML = label;

    btn.addEventListener("mousedown", () => {
      btn.style.background = "rgba(255, 255, 255, 0.3)";
    });
    btn.addEventListener("mouseup", () => {
      btn.style.background = "rgba(0, 0, 0, 0.7)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "rgba(0, 0, 0, 0.7)";
    });

    // Touch and click
    const handlePress = (e) => {
      e.preventDefault();
      if (type === "move") {
        onMove(direction);
      } else if (type === "zoom") {
        onZoom(direction);
      }
    };

    btn.addEventListener("click", handlePress);
    btn.addEventListener("touchstart", handlePress, { passive: false });

    return btn;
  };

  // Create buttons in grid positions
  // Class names map to grid-area names in CSS
  grid.appendChild(createButton("zoom", "in", "btn-zoom-in", "+"));
  grid.appendChild(createButton("move", "up", "btn-up", "↑"));
  grid.appendChild(createButton("zoom", "out", "btn-zoom-out", "−"));
  grid.appendChild(createButton("move", "left", "btn-left", "←"));
  grid.appendChild(createButton("move", "right", "btn-right", "→"));
  grid.appendChild(createButton("move", "down", "btn-down", "↓"));

  container.appendChild(grid);
  document.body.appendChild(container);

  return {
    show: () => {
      container.style.display = "block";
    },
    hide: () => {
      container.style.display = "none";
    },
    element: container,
  };
}
