import React from "react";

import type { WindowAppProps } from "../system/types";

const PortfolioApp: React.FC<WindowAppProps> = () => {
  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: 0 }}>Portfolio</h1>
      <p style={{ opacity: 0.8 }}>This is a placeholder. Replace with your inner 2D site later.</p>
      <div className="glass" style={{ padding: 16, borderRadius: 12, marginTop: 12 }}>
        <p>Ideas: sections for About, Experience, Projects, Contact.</p>
      </div>
    </div>
  );
};

export default PortfolioApp;
