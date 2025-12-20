import React from "react";
import "./styles.css";

interface SidebarProps {
  navLinks: { label: string; value: string }[];
  activeView: string;
  onNavClick: (e: React.MouseEvent, val: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ navLinks, activeView, onNavClick }) => {
  return (
    <div className="portfolio-sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">Roy Schor</h1>
      </div>

      <nav className="sidebar-nav">
        {navLinks.map((item) => (
          <a
            key={item.value}
            href="#"
            onClick={(e) => onNavClick(e, item.value)}
            className={`sidebar-link ${activeView === item.value ? "active" : ""}`}
          >
            {item.label === "Home" ? "HOME" : item.label}
          </a>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
