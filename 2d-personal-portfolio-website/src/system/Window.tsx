import React, { useRef, useState, useEffect } from "react";

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
  const dragStart = useRef<{ x: number; y: number; mx: number; my: number }>(null);
  const resizeStart = useRef<{ w: number; h: number; mx: number; my: number }>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging && dragStart.current) {
        const dx = e.clientX - dragStart.current.mx;
        const dy = e.clientY - dragStart.current.my;
        props.onMove(dragStart.current.x + dx, Math.max(28, dragStart.current.y + dy));
      }
      if (resizing && resizeStart.current) {
        const dw = e.clientX - resizeStart.current.mx;
        const dh = e.clientY - resizeStart.current.my;
        props.onResize(
          Math.max(360, resizeStart.current.w + dw),
          Math.max(220, resizeStart.current.h + dh),
        );
      }
    };
    const onUp = () => {
      setDragging(false);
      setResizing(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [props, dragging, resizing]);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: props.x, y: props.y, mx: e.clientX, my: e.clientY };
    props.onFocus();
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    resizeStart.current = { w: props.w, h: props.h, mx: e.clientX, my: e.clientY };
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
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: props.active ? "0 10px 24px rgba(0,0,0,0.45)" : "0 6px 16px rgba(0,0,0,0.25)",
        border: "1px solid var(--win-border)",
        background: "var(--win-bg)",
      }}
      onMouseDown={props.onFocus}
    >
      {/* Title bar */}
      <div
        ref={headerRef}
        onMouseDown={startDrag}
        className="mac-blur"
        style={{
          height: 32,
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          gap: 8,
          cursor: "grab",
          background: "rgba(22,24,29,0.7)",
        }}
      >
        {/* window traffic lights */}
        <div style={{ display: "flex", gap: 10, marginRight: 6 }}>
          <Circle color="#ff5f57" onClick={props.onClose} />
          <Circle color="#febc2e" onClick={props.onMinimize} />
          <Circle color="#28c840" onClick={() => {}} />
        </div>
        {props.icon && (
          <img
            src={props.icon}
            style={{
              width: 20,
              height: 20,
            }}
          />
        )}
        <div style={{ fontSize: 20, opacity: 0.9 }}>{props.title}</div>
      </div>

      {/* Content */}
      <div style={{ width: "100%", height: `calc(100% - 32px)`, overflow: "auto" }}>
        {props.children}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={startResize}
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

const Circle: React.FC<{ color: string; onClick?: () => void }> = ({ color, onClick }) => (
  <div
    onMouseDown={(e) => {
      e.stopPropagation();
      onClick?.();
    }}
    style={{ width: 18, height: 18, background: color, borderRadius: 12, cursor: "pointer" }}
  />
);

export default Window;
