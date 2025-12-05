import React, { useState } from "react";

import quotesData from "../data/quotes.json";
import type { WindowAppProps } from "../system/types";

const QuotesApp: React.FC<WindowAppProps> = () => {
  const [currentQuote, setCurrentQuote] = useState<string | null>(null);

  const quotes: string[] = quotesData;

  const getRandomQuote = () => {
    if (quotes.length === 0) {
      setCurrentQuote("Add some quotes to the list!");
      return;
    }
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setCurrentQuote(quotes[randomIndex]);
  };

  const formatQuote = (quote: string) => {
    if (!quote) return null;

    const parts = quote.split(" - ");
    const elements: React.ReactNode[] = [];

    parts.forEach((part, partIndex) => {
      if (partIndex > 0) {
        elements.push(<br key={`br-${partIndex}`} />);
        part = " - " + part;
      }

      const lines = part.split("\n");

      lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
          elements.push(<br key={`ln-${partIndex}-${lineIndex}`} />);
        }

        const italicRegex = /\*([^*]+)\*/g;
        let lastIndex = 0;
        let match;

        while ((match = italicRegex.exec(line)) !== null) {
          if (match.index > lastIndex) {
            elements.push(line.substring(lastIndex, match.index));
          }
          elements.push(
            <em key={`em-${partIndex}-${lineIndex}-${match.index}`} style={{ fontStyle: "italic" }}>
              {match[1]}
            </em>,
          );
          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < line.length) {
          elements.push(line.substring(lastIndex));
        }
      });
    });

    return elements;
  };

  return (
    <div
      style={{
        padding: "var(--quotes-container-padding)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--quotes-dev-gap)",
        minHeight: "100%",
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
          maxWidth: "var(--quotes-subtitle-max-width)",
          lineHeight: "1.6",
          opacity: 0.9,
        }}
      >
        If you know me, you know I love quotes. Whether they're inspiring and thought-provoking, or
        depressing dreary, I love them all the same.
        <br />
        <br />
        What are you waiting for grab a quote
      </p>

      <button
        onClick={() => {
          getRandomQuote();
        }}
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
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
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

      <div
        style={{
          marginTop: "var(--quotes-quote-box-margin-top)",
          padding: "15px 15px",
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          width: "100%",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "var(--quotes-quote-size)",
            color: "#EEF3DB",
            fontStyle: "normal",
            lineHeight: "1.8",
          }}
        >
          {currentQuote ? formatQuote(currentQuote) : "No Quote Yet :)"}
        </p>
      </div>
    </div>
  );
};

export default QuotesApp;
