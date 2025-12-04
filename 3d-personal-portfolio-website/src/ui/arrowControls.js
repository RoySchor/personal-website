export function createArrowControls({ camera, controls, onMove }) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "60px";
  container.style.right = "5px"; // Aligned with exit button
  container.style.display = "none";
  container.style.zIndex = "10000";
  container.style.userSelect = "none";

  // Grid layout: 3x3 with center empty - smaller buttons
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "25px 25px 25px";
  grid.style.gridTemplateRows = "25px 25px 25px";
  grid.style.gap = "1px";

  const createButton = (direction, gridArea) => {
    const btn = document.createElement("button");
    btn.style.background = "rgba(0, 0, 0, 0.7)";
    btn.style.border = "2px solid rgba(255, 255, 255, 0.3)";
    btn.style.borderRadius = "8px";
    btn.style.color = "white";
    btn.style.fontSize = "14px";
    btn.style.cursor = "pointer";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.gridArea = gridArea;
    btn.style.touchAction = "none";
    btn.style.transition = "all 0.15s";
    btn.style.backdropFilter = "blur(10px)";

    const arrows = {
      up: "↑",
      down: "↓",
      left: "←",
      right: "→",
    };
    btn.innerHTML = arrows[direction];

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
      onMove(direction);
    };

    btn.addEventListener("click", handlePress);
    btn.addEventListener("touchstart", handlePress, { passive: false });

    return btn;
  };

  // Create buttons in grid positions
  grid.appendChild(createButton("up", "1 / 2 / 2 / 3"));
  grid.appendChild(createButton("left", "2 / 1 / 3 / 2"));
  grid.appendChild(createButton("right", "2 / 3 / 3 / 4"));
  grid.appendChild(createButton("down", "3 / 2 / 4 / 3"));

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
