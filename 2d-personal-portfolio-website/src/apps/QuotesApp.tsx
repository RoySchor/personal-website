import React, { useState } from "react";

import type { WindowAppProps } from "../system/types";

const QuotesApp: React.FC<WindowAppProps> = () => {
  const [currentQuote, setCurrentQuote] = useState<string | null>(null);

  // Placeholder quotes array - you can add more later
  const quotes: string[] = [
    // Add your quotes here later
  ];

  const getRandomQuote = () => {
    if (quotes.length === 0) {
      setCurrentQuote("Add some quotes to the list!");
      return;
    }
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setCurrentQuote(quotes[randomIndex]);
  };

  return (
    <div
      style={{
        padding: "var(--quotes-padding)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--quotes-gap)",
        height: "100%",
        background: "var(--win-bg)",
      }}
    >
      {/* Title */}
      <h1
        style={{
          margin: 0,
          fontSize: "var(--quotes-title-size)",
          fontWeight: "700",
          color: "#EEF3DB",
          textAlign: "center",
        }}
      >
        Get a Quote
      </h1>

      {/* Subtitle */}
      <p
        style={{
          margin: 0,
          fontSize: "var(--quotes-subtitle-size)",
          color: "#EEF3DB",
          textAlign: "center",
          maxWidth: "600px",
          lineHeight: "1.6",
          opacity: 0.9,
        }}
      >
        If you know me, you know I love quotes. Whether they're inspiring and thought-provoking,
        or depressing dreary, I love them all the same.
        <br />
        <br />
        What are you waiting for grab a quote
      </p>

      {/* Button */}
      <button
        onClick={getRandomQuote}
        style={{
          background: "#E1F781",
          color: "var(--win-bg)",
          border: "none",
          borderRadius: "12px",
          padding: "var(--quotes-button-padding)",
          fontSize: "var(--quotes-button-font-size)",
          fontWeight: "600",
          cursor: "pointer",
          transition: "all 0.2s",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
          e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
        }}
      >
        Quote
      </button>

      {/* Quote Display */}
      <div
        style={{
          marginTop: "20px",
          padding: "30px",
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          minHeight: "120px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          maxWidth: "700px",
          width: "100%",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "var(--quotes-quote-size)",
            color: "#EEF3DB",
            fontStyle: currentQuote ? "italic" : "normal",
            lineHeight: "1.8",
          }}
        >
          {currentQuote || "No Quote Yet :)"}
        </p>
      </div>
    </div>
  );
};

export default QuotesApp;
