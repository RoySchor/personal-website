import React from "react";

interface DesktopIconProps {
  title: string;
  icon: string;
  onOpen: () => void;
  rightOffset: number; // stack on the right side
  topOffset: number;
}

const DesktopIcon: React.FC<DesktopIconProps> = ({
  title,
  icon,
  onOpen,
  rightOffset,
  topOffset,
}) => {
  const isPortfolio = title === "Portfolio";

  return (
    <div
      onDoubleClick={onOpen}
      title={title}
      style={{
        position: "absolute",
        right: rightOffset,
        top: topOffset,
        width: "var(--desktop-icon-width)",
        textAlign: "center",
        cursor: "default",
      }}
    >
      <div className="glass" style={{ padding: 10, borderRadius: 20 }}>
        <img
          src={icon}
          style={{
            width: "var(--desktop-icon-size)",
            height: "var(--desktop-icon-size)",
            borderRadius: isPortfolio ? "40%" : "0",
          }}
        />
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: "var(--desktop-icon-font-size)",
          fontWeight: 600,
          color: "var(--muted)",
          textShadow: `
          -0.5px -0.5px 0 #000,
          0.5px -0.5px 0 #000,
          -0.5px  0.5px 0 #000,
          0.5px  0.5px 0 #000
        `,
        }}
      >
        {title}
      </div>
    </div>
  );
};

export default DesktopIcon;
