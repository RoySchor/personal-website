import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import resumePdf from "../assets/resume/Schor, Roy Resume.pdf";
import type { WindowAppProps } from "../system/types";

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const ResumeApp: React.FC<WindowAppProps> = () => {
  const [numPages, setNumPages] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024 || "ontouchstart" in window);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    setContainerWidth(el.clientWidth); // Initial

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "#525659",
        touchAction: "pan-y",
        padding: "20px 0",
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <a
          href={resumePdf}
          download="Schor, Roy Resume.pdf"
          style={{
            color: "white",
            textDecoration: "none",
            background: "rgba(0,0,0,0.5)",
            padding: "8px 16px",
            borderRadius: 4,
            fontSize: 14,
          }}
        >
          Download PDF
        </a>
      </div>

      <Document
        file={resumePdf}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={<div style={{ color: "white", padding: 20 }}>Loading PDF...</div>}
        error={
          <div style={{ color: "white", padding: 20 }}>
            Failed to load PDF.{" "}
            <a href={resumePdf} target="_blank" rel="noreferrer" style={{ color: "#2f81f7" }}>
              Download instead.
            </a>
          </div>
        }
      >
        {Array.from(new Array(numPages), (_el, index) => (
          <div
            key={`page_${index + 1}`}
            style={{ marginBottom: 20, boxShadow: "0 4px 8px rgba(0,0,0,0.3)" }}
          >
            <Page
              pageNumber={index + 1}
              width={containerWidth ? Math.min(containerWidth - 40, 800) : undefined}
              renderAnnotationLayer={true}
              renderTextLayer={true}
              scale={isMobile ? 1.2 : 1.5}
            />
          </div>
        ))}
      </Document>
    </div>
  );
};

export default ResumeApp;
