import React from "react";

type CSSPx = number | string;

interface DesktopIconProps {
  title: string;
  icon: string;
  onOpen: () => void;
  rightOffset: CSSPx; // stack on the right side
  topOffset: CSSPx;
  iconGap: CSSPx;
  gapMultiplier: number;
}

function toPx(v: CSSPx) {
  return typeof v === "number" ? `${v}px` : v;
}

function topWithGap(top: CSSPx, gap: CSSPx = 0, mult = 0) {
  const t = toPx(top);
  const g = toPx(gap);
  return mult ? `calc(${t} + ${g} * ${mult})` : t;
}

const DesktopIcon: React.FC<DesktopIconProps> = ({
  title,
  icon,
  onOpen,
  rightOffset,
  topOffset,
  iconGap,
  gapMultiplier,
}) => {
  const isPortfolio = title === "Portfolio";
  const isResume = title === "Resume";

  return (
    <div
      onDoubleClick={onOpen}
      onClick={() => {
        if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
          onOpen();
        }
      }}
      title={title}
      style={{
        position: "absolute",
        right: toPx(rightOffset),
        top: topWithGap(topOffset, iconGap, gapMultiplier),
        width: "var(--desktop-icon-width)",
        textAlign: "center",
        cursor: "default",
      }}
    >
      <div className="glass" style={{ padding: 10, borderRadius: 20 }}>
        <img
          src={icon}
          style={{
            width: isResume ? "var(--desktop-resume-icon-width)" : "var(--desktop-icon-size)",
            height: isResume ? "var(--desktop-resume-icon-height)" : "var(--desktop-icon-size)",
            borderRadius: isPortfolio ? "40%" : "0",
          }}
        />
      </div>
      <div
        style={{
          marginTop: 4,
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
