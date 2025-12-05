import React, { useEffect, useState } from "react";

interface Props {
  onFinish: () => void;
  onCancel: () => void;
  onConfirmed: () => void;
}

const ShutdownOverlay: React.FC<Props> = ({ onFinish, onCancel, onConfirmed }) => {
  const [phase, setPhase] = useState<"confirm" | "fade" | "bars" | "black" | "done">("confirm");

  const handleConfirm = () => {
    onConfirmed();
    setPhase("fade");
  };

  useEffect(() => {
    if (phase === "confirm") return;

    if (phase === "fade") {
      const t1 = setTimeout(() => setPhase("bars"), 500);
      return () => clearTimeout(t1);
    }

    if (phase === "bars") {
      const t2 = setTimeout(() => setPhase("black"), 1500);
      return () => clearTimeout(t2);
    }

    if (phase === "black") {
      const t3 = setTimeout(() => {
        onFinish();
      }, 1000);
      return () => clearTimeout(t3);
    }
  }, [phase, onFinish]);

  // Confirmation modal
  if (phase === "confirm") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 20000,
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          className="mac-blur glass"
          style={{
            padding: "32px 40px",
            borderRadius: 16,
            textAlign: "center",
            maxWidth: 400,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 24, marginBottom: 16 }}>Shutdown</h2>
          <p style={{ margin: 0, fontSize: 18, marginBottom: 24, opacity: 0.9 }}>
            Are you sure you want to shut down?
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={onCancel}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: 16,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                border: "none",
                background: "#ff5f57",
                color: "white",
                fontSize: 16,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Shut Down
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Black screen with optional bouncy bar
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "black",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: phase === "done" ? 5000 : 20000, // Drop below lock screen when done
        opacity: phase === "done" ? 0 : 1,
        transition: phase === "done" ? "opacity 0.5s ease-in-out" : "none",
        pointerEvents: phase === "done" ? "none" : "auto",
      }}
    >
      {phase === "bars" && (
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
