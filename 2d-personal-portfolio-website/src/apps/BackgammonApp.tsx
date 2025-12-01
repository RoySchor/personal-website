import React from "react";

import type { WindowAppProps } from "../system/types";

const BackgammonApp: React.FC<WindowAppProps> = () => {
  // Use any embeddable free backgammon site; placeholder domain below.
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <iframe
        title="Backgammon"
        src="https://cardgames.io/backgammon/"
        style={{ width: "100%", height: "100%", border: 0 }}
        allow="fullscreen"
      />
    </div>
  );
};

export default BackgammonApp;
