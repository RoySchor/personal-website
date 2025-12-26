import React, { useState, useEffect, useRef } from "react";
import "./styles.css";

const Wifi: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className="wifi-icon-container"
      onMouseDown={() => setIsOpen(!isOpen)}
    >
      {/* Wifi Icon SVG */}
      <svg
        className="wifi-icon-svg"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 1 }}
      >
        <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
      </svg>

      {isOpen && (
        <div
          className="mac-blur glass-menu wifi-dropdown"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="wifi-section-title">Known Networks</div>
          <div className="wifi-network-item active">
            <div className="wifi-icon-circle">
              <svg className="wifi-icon-inner" viewBox="0 0 24 24">
                <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
              </svg>
            </div>
            <span className="wifi-name">DUH!</span>
            <svg className="wifi-lock" viewBox="0 0 24 24">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3 3.1-3s3.1 1.29 3.1 3v2z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wifi;
