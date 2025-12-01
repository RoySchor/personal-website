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
  return (
    <div
      onDoubleClick={onOpen}
      title={title}
      style={{
        position: "absolute",
        right: rightOffset,
        top: topOffset,
        width: 80,
        textAlign: "center",
        cursor: "default",
      }}
    >
      <div className="glass" style={{ padding: 10, borderRadius: 12 }}>
        <img src={icon} style={{ width: 48, height: 48 }} />
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>{title}</div>
    </div>
  );
};

export default DesktopIcon;
