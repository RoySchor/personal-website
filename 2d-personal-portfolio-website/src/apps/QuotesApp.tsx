import React, { useEffect, useState } from "react";

import rawQuotes from "../data/quotes.json";
import type { WindowAppProps } from "../system/types";

const QuotesApp: React.FC<WindowAppProps> = () => {
  const [quotes, setQuotes] = useState<string[]>([]);

  useEffect(() => {
    // later, replace with your uploaded list; for now we load local json
    setQuotes(rawQuotes as unknown as string[]);
  }, []);

  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 style={{ margin: 0 }}>Quotes</h1>
      <p style={{ opacity: 0.8 }}>A simple list – replace the JSON with your own.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
        {quotes.map((q, i) => (
          <div key={i} className="glass" style={{ padding: 12, borderRadius: 10 }}>
            {q}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuotesApp;
