import React, { useState } from "react";
import "./styles.css";

import resumePdf from "../../assets/resume/Schor, Roy Resume.pdf";
import type { WindowAppProps } from "../../system/types";

type View = "landing" | "about" | "experience" | "projects" | "contact";

const PortfolioApp: React.FC<WindowAppProps> = () => {
  const [view, setView] = useState<View>("landing");

  const navLinks: { label: string; value: View }[] = [
    { label: "Home", value: "landing" },
    { label: "About", value: "about" },
    { label: "Experience", value: "experience" },
    { label: "Projects", value: "projects" },
    { label: "Contact", value: "contact" },
  ];

  const handleNavClick = (e: React.MouseEvent, val: View) => {
    e.preventDefault();
    setView(val);
  };

  if (view === "landing") {
    return (
      <div className="portfolio-container landing">
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
    <div className="portfolio-container inner">
      {/* Left Sidebar */}
      <div className="portfolio-sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">Roy Schor</h1>
        </div>

        <nav className="sidebar-nav">
          {navLinks.map((item) => (
            <a
              key={item.value}
              href="#"
              onClick={(e) => handleNavClick(e, item.value)}
              className={`sidebar-link ${view === item.value ? "active" : ""}`}
            >
              {item.label === "Home" ? "HOME" : item.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="portfolio-content">
        {view === "about" && (
          <div className="content-section">
            <h1 className="section-header">Welcome</h1>
            <h2 className="section-subheader">I'm Roy Schor</h2>

            <p className="section-text">
              I'm a software engineer passionate about building immersive and interactive web
              experiences. Welcome to my digital portfolio!
            </p>

            <p className="section-text">
              Feel free to explore my projects, check out my experience, or get in touch. I built
              this desktop environment to showcase what's possible on the web.
            </p>

            {/* Resume Box */}
            <div className="resume-box">
              <div className="resume-icon">📄</div>
              <div className="resume-info">
                <h3>Looking for my resume?</h3>
                <a href={resumePdf} download="Schor, Roy Resume.pdf">
                  Click here to download it!
                </a>
              </div>
            </div>

            <div className="about-me-section">
              <h3>About Me</h3>
              <p className="section-text">
                From a young age, I have been fascinated by technology and how things work. This
                curiosity led me to pursue a career in software engineering, where I can solve
                complex problems and create useful tools.
              </p>
              <p className="section-text">
                When I'm not coding, you can find me exploring 3D graphics, playing backgammon, or
                collecting quotes.
              </p>
            </div>
          </div>
        )}

        {view !== "about" && (
          <div className="content-section">
            <h1 className="section-header">{view.charAt(0).toUpperCase() + view.slice(1)}</h1>
            <p>Content coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioApp;
