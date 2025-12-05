import React, { useEffect, useState } from "react";

import lockBgPlaceholder from "../assets/lockscreens/lockscreen-bg.webp";
interface Props {
  onLogin: () => void;
}

const LockScreen: React.FC<Props> = ({ onLogin }) => {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation after component mounts
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = () => {
    setFadingOut(true);
    // Wait for fade-out animation to complete before calling onLogin
    setTimeout(() => {
      onLogin();
    }, 500); // Match the transition duration
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 15000,
        opacity: visible && !fadingOut ? 1 : 0,
        transition: "opacity 0.5s ease-in-out",
      }}
    >
      <img
        src={lockBgPlaceholder}
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
          fontSize: "var(--lock-screen-font-size)",
          padding: 24,
          borderRadius: 16,
          textAlign: "center",
          textShadow: `
              -0.35px -0.35px 0 #000,
              0.35px -0.35px 0 #000,
              -0.35px  0.35px 0 #000,
              0.35px  0.35px 0 #000
            `,
          opacity: 0.8,
        }}
      >
        <h2 style={{ margin: 0 }}>Locked</h2>
        <p
          style={{
            marginTop: 6,
            fontSize: "var(--lock-screen-subtitle-font-size)",
          }}
        >
          Press login to return to desktop
        </p>
        <button
          onMouseDown={handleLogin}
          style={{
            fontSize: "var(--lock-screen-button-font-size)",
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
