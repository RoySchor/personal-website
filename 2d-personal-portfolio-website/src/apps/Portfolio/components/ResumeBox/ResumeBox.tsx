import React from "react";

import "./styles.css";
import resumeGif from "../../../../assets/gifs/download-resume.gif";
import resumePdf from "../../../../assets/resume/Schor, Roy Resume.pdf";

const ResumeBox: React.FC = () => {
  return (
    <div className="resume-box">
      <img src={resumeGif} alt="Download Resume" className="resume-icon" />
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
