import React, { useEffect, useState } from "react";

interface Props {
  onFinish: () => void;
}

const ShutdownOverlay: React.FC<Props> = ({ onFinish }) => {
  const [phase, setPhase] = useState<"fade" | "bars" | "off">("fade");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("bars"), 700);
    const t2 = setTimeout(() => setPhase("off"), 1600);
    const t3 = setTimeout(onFinish, 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onFinish]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: phase === "off" ? "black" : "rgba(0,0,0,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20000,
      }}
    >
      {phase !== "off" && (
        <div
          style={{
            width: "60%",
            height: 6,
            overflow: "hidden",
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="bar"
            style={{
              width: "40%",
              height: "100%",
              background: "white",
              animation: "shbar 0.9s ease-in-out infinite alternate",
            }}
          />
        </div>
      )}
      <style>{`
        @keyframes shbar { from { transform: translateX(0%)} to { transform: translateX(150%) } }
      `}</style>
    </div>
  );
};

export default ShutdownOverlay;
