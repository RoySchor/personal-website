import React, { useState, useEffect } from "react";

const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Update every few seconds to keep time roughly synced
    const t = setInterval(() => setTime(new Date()), 5000);
    return () => clearInterval(t);
  }, []);

  const d = time;
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  const dateStr = `${weekday}\u00A0\u00A0${month}\u00A0\u00A0${day}`;
  const timeStr = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        fontSize: 30,
        opacity: 0.85,
        paddingRight: 14,
        textShadow: `
          -0.5px -0.5px 0 #000,
          0.5px -0.5px 0 #000,
          -0.5px  0.5px 0 #000,
          0.5px  0.5px 0 #000
        `,
      }}
    >
      <span style={{ marginRight: 20, fontSize: "var(--menubar-font-size)" }}>
        {dateStr}
      </span>
      <span style={{ fontSize: "var(--menubar-font-size)" }}>{timeStr}</span>
    </div>
  );
};

export default Clock;
