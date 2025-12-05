export function createArrowControls({ camera, controls, onMove, onZoom }) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "60px";
  container.style.right = "10px"; // Aligned with exit button
  container.style.display = "none";
  container.style.zIndex = "10000";
  container.style.userSelect = "none";

  // Grid layout: 3x3 with center empty - smaller buttons
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "28px 28px 28px";
  grid.style.gridTemplateRows = "28px 28px 28px";
  grid.style.gap = "3px";

  const createButton = (type, direction, gridArea, label) => {
    const btn = document.createElement("button");
    btn.style.background = "rgba(0, 0, 0, 0.7)";
    btn.style.border = "2px solid rgba(255, 255, 255, 0.3)";
    btn.style.borderRadius = "10px";
    btn.style.color = "white";
    btn.style.fontSize = "12px";
    btn.style.cursor = "pointer";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.gridArea = gridArea;
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
  grid.appendChild(createButton("zoom", "in", "1 / 1 / 2 / 2", "+"));
  grid.appendChild(createButton("move", "up", "1 / 2 / 2 / 3", "↑"));
  grid.appendChild(createButton("zoom", "out", "1 / 3 / 2 / 4", "−"));
  grid.appendChild(createButton("move", "left", "2 / 1 / 3 / 2", "←"));
  grid.appendChild(createButton("move", "right", "2 / 3 / 3 / 4", "→"));
  grid.appendChild(createButton("move", "down", "3 / 2 / 4 / 3", "↓"));

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
