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

  // Manual touch drag handling
  const touchStart = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const touchY = e.touches[0].clientY;
    const deltaY = touchStart.current - touchY;

    // Apply scroll immediately (use manual scroll helper logic)
    if (containerRef.current) {
      const scrollable = containerRef.current.closest(".window-content-scrollable");
      if (scrollable) {
        scrollable.scrollTop += deltaY;
      } else {
        const parent = containerRef.current.parentElement;
        if (parent) parent.scrollTop += deltaY;
      }
    }

    // Update start for continuous drag
    touchStart.current = touchY;
  };

  const handleTouchEnd = () => {
    touchStart.current = null;
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "#525659",
        touchAction: "pan-y",
        padding: "20px 0",
        position: "relative",
      }}
    >
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
