import React, { useState, useRef, useEffect } from "react";

import menuLogo from "../../assets/icons/menu-logo.webp";

interface MenuDropdownProps {
  onShutdown: () => void;
  onLock: () => void;
}

const MenuDropdown: React.FC<MenuDropdownProps> = ({ onShutdown, onLock }) => {
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
          alt="Menu Logo"
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
            zIndex: 10001,
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
      fontWeight: "var(--menu-bar-dropdown-menu-item-font-weight)",
    }}
  >
    {label}
  </div>
);

export default MenuDropdown;
