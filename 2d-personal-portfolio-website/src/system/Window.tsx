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
      console.log(
        "Move Event:",
        "Type:",
        e.type,
        "Dragging:",
        dragging,
        "Resizing:",
        resizing,
        "Touches:",
        "touches" in e ? e.touches.length : 0,
      );
      // If we are not dragging/resizing, do not block default behavior
      if (!dragging && !resizing) return;

      const clientX = "touches" in e ? e.touches[0]?.clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY : (e as MouseEvent).clientY;
      if (clientX == null || clientY == null) return;

      // Only prevent default if we are actively dragging or resizing
      if (e.cancelable) {
        e.preventDefault();
        console.log("Touch/Move Default Prevented (because dragging/resizing is true)");
      }

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
      console.log("Up/End Event. Resetting Dragging and Resizing.");
      setDragging(false);
      setResizing(false);
    };
    window.addEventListener("mousemove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp, { passive: true });
    window.addEventListener("touchmove", onMove as EventListener, { passive: false });
    window.addEventListener("touchend", onUp as EventListener, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove as EventListener);
      window.removeEventListener("mouseup", onUp as EventListener);
      window.removeEventListener("touchmove", onMove as EventListener);
      window.removeEventListener("touchend", onUp as EventListener);
    };
  }, [dragging, resizing, props]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
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

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024 || "ontouchstart" in window);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        left: props.x,
        top: props.y,
        width: props.w,
        height: props.h,
        zIndex: props.z,
        borderRadius: "var(--window-border-radius)",
        overflow: "hidden",
        boxShadow: props.active ? "0 10px 24px rgba(0,0,0,0.45)" : "0 6px 16px rgba(0,0,0,0.25)",
        border: "1px solid var(--win-border)",
        background: "var(--win-bg)",
        willChange: "left, top",
      }}
      onMouseDown={props.onFocus}
      onTouchStart={(e) => {
        console.log("Window Root TouchStart: Firing Focus.");
        props.onFocus();
      }}
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
            left: isMobile ? 28 : 10,
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
            showIcon={isMobile || controlsHovered}
            iconSize="var(--window-header-inner-circle-icon-size)"
          />
          <WindowControl
            color="#febc2e"
            onClick={props.onMinimize}
            icon="minimize"
            showIcon={isMobile || controlsHovered}
            iconSize="var(--window-header-inner-circle-icon-size)"
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          width: "100%",
          height: `calc(100% - var(--window-header-height))`,
          overflow: "auto",
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
