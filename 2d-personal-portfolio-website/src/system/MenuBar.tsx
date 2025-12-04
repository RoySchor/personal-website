import React, { useState, useRef, useEffect } from "react";

import menuLogo from "../assets/icons/menu-logo.webp";

interface MenuBarProps {
  onShutdown: () => void;
  onLock: () => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ onShutdown, onLock }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

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
      <div ref={ref} style={{ position: "relative" }}>
        <div
          onMouseDown={() => setOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--menubar-gap)",
            cursor: "pointer",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: "var(--menubar-font-size)",
            textShadow: `
              -0.5px -0.5px 0 #000,
              0.5px -0.5px 0 #000,
              -0.5px  0.5px 0 #000,
              0.5px  0.5px 0 #000
            `,
          }}
          title="Menu"
        >
          <img
            src={menuLogo}
            style={{
              display: "flex",
              alignItems: "center",
              width: "var(--menubar-logo-size)",
              height: "var(--menubar-logo-size)",
            }}
          />
          <span style={{ fontWeight: 400 }}>Menu</span>
        </div>
        {open && (
          <div
            className="mac-blur glass-menu"
            style={{
              position: "absolute",
              top: "var(--menu-bar-dropdown-menu-top-gap)",
              left: 4,
              width: "var(--menu-bar-dropdown-menu-width)",
              padding: 8,
              borderRadius: 10,
            }}
          >
            <Item
              label="Lock Screen"
              onClick={() => {
                setOpen(false);
                onLock();
              }}
            />
            <Item
              label="Shut Down…"
              onClick={() => {
                setOpen(false);
                onShutdown();
              }}
            />
          </div>
        )}
      </div>

      {/* center empty spacer */}
      <div style={{ flex: 1 }} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 30,
          opacity: 0.85,
          paddingRight: 14,
          textShadow: `
          -0.5px -0.5px 0 #000,
          0.5px -0.5px 0 #000,
          -0.5px  0.5px 0 #000,
          0.5px  0.5px 0 #000
        `,
        }}
      >
        <span style={{ marginRight: 20, fontSize: "var(--menubar-font-size)" }}>
          {(() => {
            const d = new Date();
            const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
            const month = d.toLocaleDateString("en-US", { month: "short" });
            const day = d.getDate();
            return `${weekday}\u00A0\u00A0${month}\u00A0\u00A0${day}`;
          })()}
        </span>
        <span style={{ fontSize: "var(--menubar-font-size)" }}>
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </span>
      </div>
    </div>
  );
};

const Item: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <div
    onMouseDown={onClick}
    style={{
      padding: "var(--menu-bar-dropdown-menu-item-padding)",
      borderRadius: 8,
      margin: "var(--menu-bar-dropdown-menu-item-margin)",
      cursor: "pointer",
      color: "black",
      fontSize: "var(--menu-bar-dropdown-menu-font-size)",
      fontWeight: 50,
      textShadow: `
          -0.5px -0.5px 0 #000,
          0.5px -0.5px 0 #000,
          -0.5px  0.5px 0 #000,
          0.5px  0.5px 0 #000
        `,
    }}
  >
    {label}
  </div>
);

export default MenuBar;
