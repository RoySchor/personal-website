import React, { useRef, useState, useEffect } from "react";

import WindowControl from "./WindowControls";

interface Props {
  title: string;
  icon?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  active: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  children: React.ReactNode;
}

const Window: React.FC<Props> = (props) => {
  const headerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [controlsHovered, setControlsHovered] = useState(false);
  const dragStart = useRef<{ x: number; y: number; mx: number; my: number }>(null);
  const resizeStart = useRef<{ w: number; h: number; mx: number; my: number }>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY : e.clientY;

      if (!clientX || !clientY) return;

      if (dragging && dragStart.current) {
        const dx = clientX - dragStart.current.mx;
        const dy = clientY - dragStart.current.my;
        props.onMove(dragStart.current.x + dx, Math.max(28, dragStart.current.y + dy));
      }
      if (resizing && resizeStart.current) {
        const dw = clientX - resizeStart.current.mx;
        const dh = clientY - resizeStart.current.my;
        const minW =
          parseInt(
            getComputedStyle(document.documentElement).getPropertyValue("--window-min-width"),
          ) || 360;
        const minH =
          parseInt(
            getComputedStyle(document.documentElement).getPropertyValue("--window-min-height"),
          ) || 220;
        props.onResize(
          Math.max(minW, resizeStart.current.w + dw),
          Math.max(minH, resizeStart.current.h + dh),
        );
      }
    };
    const onUp = () => {
      setDragging(false);
      setResizing(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove as EventListener);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove as EventListener);
      window.removeEventListener("touchend", onUp);
    };
  }, [props, dragging, resizing]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    // Only call preventDefault if it's not a passive event (mostly for MouseEvent here)
    if (!("touches" in e)) {
      e.preventDefault();
    }
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setDragging(true);
    dragStart.current = { x: props.x, y: props.y, mx: clientX, my: clientY };
    props.onFocus();
  };

  const startResize = (e: React.MouseEvent | React.TouchEvent) => {
    if (!("touches" in e)) {
      e.preventDefault();
    }
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setResizing(true);
    resizeStart.current = { w: props.w, h: props.h, mx: clientX, my: clientY };
    props.onFocus();
  };

  return (
    <div
      style={{
        position: "absolute",
        transform: `translate(${props.x}px, ${props.y}px)`,
        width: props.w,
        height: props.h,
        zIndex: props.z,
        borderRadius: "var(--window-border-radius)",
        overflow: "hidden",
        boxShadow: props.active ? "0 10px 24px rgba(0,0,0,0.45)" : "0 6px 16px rgba(0,0,0,0.25)",
        border: "1px solid var(--win-border)",
        background: "var(--win-bg)",
      }}
      onMouseDown={props.onFocus}
      onTouchStart={props.onFocus}
    >
      {/* Title bar */}
      <div
        ref={headerRef}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        className="mac-blur"
        style={{
          height: "var(--window-header-height)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 10px",
          cursor: "grab",
          background: "rgba(22,24,29,0.7)",
          position: "relative",
        }}
      >
        {/* window traffic lights */}
        <div
          style={{
            position: "absolute",
            left: 10,
            display: "flex",
            gap: "var(--window-header-icon-gap)",
          }}
          onMouseEnter={() => setControlsHovered(true)}
          onMouseLeave={() => setControlsHovered(false)}
        >
          <WindowControl
            color="#ff5f57"
            onClick={props.onClose}
            icon="close"
            showIcon={controlsHovered}
            iconSize="var(--window-header-inner-circle-icon-size)"
          />
          <WindowControl
            color="#febc2e"
            onClick={props.onMinimize}
            icon="minimize"
            showIcon={controlsHovered}
            iconSize="var(--window-header-inner-circle-icon-size)"
          />
        </div>

        {/* Centered title and icon */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {props.icon && (
            <img
              src={props.icon}
              style={{
                borderRadius: "20%",
                width: "var(--window-title-website-icon-size)",
                height: "var(--window-title-website-icon-size)",
              }}
            />
          )}
          <div style={{ fontSize: "var(--window-title-website-font-size)", opacity: 0.9 }}>
            {props.title}
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          width: "100%",
          height: `calc(100% - var(--window-header-height))`,
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarGutter: "stable",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        }}
      >
        {props.children}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        onTouchStart={startResize}
        style={{
          position: "absolute",
          right: 6,
          bottom: 6,
          width: 16,
          height: 16,
          cursor: "nwse-resize",
          opacity: 0.6,
        }}
        title="Resize"
      >
        <svg viewBox="0 0 16 16" width="16" height="16">
          <path d="M2 14L14 2M6 14L14 6M10 14L14 10" stroke="white" strokeOpacity="0.35" />
        </svg>
      </div>
    </div>
  );
};

export default Window;
