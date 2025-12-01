import React, { useState, useRef, useEffect } from "react";

import menuLogo from "../assets/icons/menu-logo.svg";

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
        height: 28,
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
            gap: 8,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 6,
          }}
          title="Menu"
        >
          <img src={menuLogo} width={16} height={16} />
          <span style={{ fontWeight: 600 }}>Menu</span>
        </div>
        {open && (
          <div
            className="mac-blur glass"
            style={{
              position: "absolute",
              top: 26,
              left: 4,
              width: 200,
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

      {/* right status (clock placeholder) */}
      <div style={{ fontSize: 12, opacity: 0.8 }}>
        {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </div>
    </div>
  );
};

const Item: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <div
    onMouseDown={onClick}
    className="glass"
    style={{
      padding: "8px 10px",
      borderRadius: 8,
      marginBottom: 6,
      cursor: "pointer",
    }}
  >
    {label}
  </div>
);

export default MenuBar;
