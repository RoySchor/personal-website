import React from "react";

interface Props {
  onLogin: () => void;
}

const LockScreen: React.FC<Props> = ({ onLogin }) => {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 15000 }}>
      <img
        src="/src/assets/lockscreen/lock-bg-placeholder.jpg"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "brightness(0.8)",
        }}
      />
      <div
        className="mac-blur glass"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
          width: 400,
          padding: 24,
          borderRadius: 16,
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>Locked</h2>
        <p style={{ opacity: 0.8, marginTop: 6 }}>Press login to return to desktop</p>
        <button
          onMouseDown={onLogin}
          style={{
            marginTop: 16,
            padding: "10px 16px",
            borderRadius: 12,
            background: "white",
            color: "#111",
            border: 0,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Login
        </button>
      </div>
    </div>
  );
};

export default LockScreen;
