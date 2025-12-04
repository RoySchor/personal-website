import React, { useState } from "react";
import { BiExpand } from "react-icons/bi";
import { HiMinus } from "react-icons/hi";
import { IoClose } from "react-icons/io5";

type CSSPx = number | string;

interface WindowControlProps {
  color: string;
  onClick?: () => void;
  icon: "close" | "minimize" | "maximize";
  showIcon: boolean;
  iconSize: CSSPx;
}

function toPx(v: CSSPx) {
  return typeof v === "number" ? `${v}px` : v;
}

const WindowControl: React.FC<WindowControlProps> = ({
  color,
  onClick,
  icon,
  showIcon,
  iconSize,
}) => {
  const [hover, setHover] = useState(false);

  const renderIcon = () => {
    if (!showIcon) return null;

    const iconStyle = {
      position: "absolute" as const,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none" as const,
      color: "rgba(0,0,0,0.7)",
      fontSize: toPx(iconSize),
    };

    switch (icon) {
      case "close":
        return <IoClose style={iconStyle} />;
      case "minimize":
        return <HiMinus style={iconStyle} />;
      case "maximize":
        return <BiExpand style={iconStyle} />;
    }
  };

  return (
    <div
      onMouseDown={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        width: "var(---window-header-icon-size)",
        height: "var(---window-header-icon-size)",
        background: color,
        borderRadius: 12,
        cursor: "pointer",
        transition: "transform 0.1s ease",
        transform: hover ? "scale(1.1)" : "scale(1)",
      }}
    >
      {renderIcon()}
    </div>
  );
};

export default WindowControl;
