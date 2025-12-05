import React from "react";

import type { WindowAppProps } from "../system/types";

const BackgammonApp: React.FC<WindowAppProps> = () => {
  const gameUrl = "https://www.247backgammon.org/";

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <iframe
        title="Backgammon"
        src={gameUrl}
        style={{ width: "100%", height: "100%", border: 0 }}
        allow="fullscreen; autoplay; clipboard-read; clipboard-write"
        allowFullScreen={true}
      />
    </div>
  );
};

export default BackgammonApp;
