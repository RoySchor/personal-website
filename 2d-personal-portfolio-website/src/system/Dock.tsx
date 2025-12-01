import React from "react";

import type { AppDefinition, WindowState } from "./types";

interface DockProps {
  apps: AppDefinition[];
  openApp: (key: AppDefinition["key"]) => void;
  minimizedWindows: WindowState[];
  restoreWindow: (key: WindowState["key"]) => void;
}

const Dock: React.FC<DockProps> = ({ apps, openApp, minimizedWindows, restoreWindow }) => {
  const fixed = apps.filter((a) => a.dockFixed);
  const runningMin = minimizedWindows;

  return (
    <div
      className="mac-blur"
      style={{
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: 10,
        height: 72,
        borderRadius: 18,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "var(--mac-dock-bg)",
        border: `1px solid var(--mac-dock-border)`,
      }}
    >
      {fixed.map((app) => (
        <DockIcon
          key={app.key}
          title={app.title}
          icon={app.icon}
          onClick={() => openApp(app.key)}
        />
      ))}

      {/* divider */}
      <div style={{ width: 1, height: 42, background: "rgba(255,255,255,0.12)" }} />

      {runningMin.map((w) => (
        <DockIcon
          key={w.key}
          title={w.title}
          icon={w.icon}
          onClick={() => restoreWindow(w.key)}
          small
        />
      ))}
    </div>
  );
};

const DockIcon: React.FC<{ title: string; icon: string; onClick: () => void; small?: boolean }> = ({
  title,
  icon,
  onClick,
  small,
}) => (
  <button
    onMouseDown={onClick}
    title={title}
    style={{
      appearance: "none",
      border: 0,
      background: "transparent",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: small ? 44 : 56,
      height: small ? 44 : 56,
      borderRadius: 12,
      padding: 6,
    }}
  >
    <img src={icon} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
  </button>
);

export default Dock;
