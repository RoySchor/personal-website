import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import resumePdf from "../assets/resume/Schor, Roy Resume.pdf";
import type { WindowAppProps } from "../system/types";

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = "./pdf.worker.min.js";

const ResumeApp: React.FC<WindowAppProps> = () => {
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
        alignItems: isMobile ? "flex-start" : "center",
        background: "#525659",
        padding: isMobile ? "20px" : "20px 0",
        position: "relative",
      }}
    >
      <Document
        file={resumePdf}
        loading={
          <div
            style={{
              color: "white",
              padding: 20,
              fontSize: isMobile ? "64px" : "24px",
            }}
          >
            Loading PDF...
          </div>
        }
        error={
          <div
            style={{ color: "white", padding: 20, fontSize: isMobile ? "64px" : "24px" }}
          >
            Failed to load PDF.{" "}
            <a
              href={resumePdf}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#2f81f7" }}
            >
              Download instead.
            </a>
          </div>
        }
      >
        <div style={{ marginBottom: 20, boxShadow: "0 4px 8px rgba(0,0,0,0.3)" }}>
          <Page
            pageNumber={1}
            width={
              !isMobile && containerWidth ? Math.min(containerWidth - 40, 800) : undefined
            }
            devicePixelRatio={1}
            renderAnnotationLayer={!isMobile}
            renderTextLayer={!isMobile}
            scale={isMobile ? 3.5 : 1.7}
          />
        </div>
      </Document>
    </div>
  );
};

export default ResumeApp;
