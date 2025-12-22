import React, { useState, useRef, useEffect } from "react";
import "./styles.css";

import About from "./components/About";
import Contact from "./components/Contact";
import Experience from "./components/Experience";
import Projects from "./components/Projects";
import Sidebar from "./components/Sidebar";
import type { WindowAppProps } from "../../system/types";

type View = "landing" | "about" | "experience" | "projects" | "contact";

const PortfolioApp: React.FC<WindowAppProps> = () => {
  const [view, setView] = useState<View>("landing");
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }

    const scrollableParent = containerRef.current?.closest(".window-content-scrollable");
    if (scrollableParent) {
      scrollableParent.scrollTop = 0;
    }
  }, [view]);

  const navLinks: { label: string; value: View }[] = [
    { label: "Home", value: "landing" },
    { label: "About", value: "about" },
    { label: "Experience", value: "experience" },
    { label: "Projects", value: "projects" },
    { label: "Contact", value: "contact" },
  ];

  const handleNavClick = (e: React.MouseEvent, val: string) => {
    e.preventDefault();
    setView(val as View);
  };

  if (view === "landing") {
    return (
      <div className="portfolio-container landing" ref={containerRef}>
        <div className="portfolio-header">
          <h1 className="portfolio-title">Roy Schor</h1>
          <h2 className="portfolio-subtitle">Software Engineer</h2>
        </div>

        <div className="portfolio-links">
          {navLinks
            .filter((item) => item.value !== "landing")
            .map((item) => (
              <a
                key={item.value}
                href="#"
                onClick={(e) => handleNavClick(e, item.value)}
                className="portfolio-link"
              >
                {item.label}
              </a>
            ))}
        </div>
      </div>
    );
  }

  // Inner Layout (Sidebar + Content)
  return (
    <div className="portfolio-container inner" ref={containerRef}>
      {/* Left Sidebar */}
      <Sidebar
        navLinks={navLinks.map((link) => ({ ...link, value: link.value }))}
        activeView={view}
        onNavClick={handleNavClick}
      />

      {/* Main Content Area */}
      <div className="portfolio-content" ref={contentRef}>
        {view === "about" && <About />}
        {view === "experience" && <Experience />}
        {view === "projects" && <Projects />}
        {view === "contact" && <Contact />}
      </div>
    </div>
  );
};

export default PortfolioApp;
