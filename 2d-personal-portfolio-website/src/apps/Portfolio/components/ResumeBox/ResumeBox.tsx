import React from "react";

import "./styles.css";
import resumeMp4 from "../../../../assets/mp4/download-resume.mp4";
import resumePdf from "../../../../assets/resume/Schor, Roy Resume.pdf";

const ResumeBox: React.FC = () => {
  return (
    <div className="resume-box">
      <video className="resume-icon" autoPlay loop muted playsInline preload="metadata">
        <source src={resumeMp4} type="video/mp4" />
      </video>
      <div className="resume-info">
        <h3>Looking for my resume?</h3>
        <a href={resumePdf} download="Schor, Roy Resume.pdf">
          Click here to download it!
        </a>
      </div>
    </div>
  );
};

export default ResumeBox;
