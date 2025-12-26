import React from "react";

import Battery from "./Battery";
import Clock from "./Clock";
import MenuDropdown from "./MenuDropdown";
import Wifi from "./Wifi";

interface MenuBarProps {
  onShutdown: () => void;
  onLock: () => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ onShutdown, onLock }) => {
  return (
    <div
      className="mac-blur app-no-select"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "var(--menubar-height)",
        display: "flex",
        alignItems: "center",
        padding: "0 8px",
        color: "var(--mac-menubar-text)",
        background: "var(--mac-menubar)",
        zIndex: 10000,
      }}
    >
      <MenuDropdown onShutdown={onShutdown} onLock={onLock} />

      {/* center empty spacer */}
      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center" }}>
        <Wifi />
        <Battery />
        <Clock />
      </div>
    </div>
  );
};

export default MenuBar;
