import React from "react";

import "./styles.css";
import resumeGif from "../../../../assets/gifs/download-resume.gif";
import resumePdf from "../../../../assets/resume/Schor, Roy Resume.pdf";

const About: React.FC = () => {
  return (
    <div className="content-section">
      <h1 className="section-header">Welcome</h1>
      <h2 className="section-subheader">I'm Roy Schor</h2>

      <p className="section-text">
        I'm a full-stack software engineer working at Justworks! In May of 2024 I graduated from
        Penn State University with a BS in Computer Science.
      </p>

      <p className="section-text">
        Thank you for taking the time to check out my portfolio. I hope you enjoyed exploring it as
        much as I enjoyed building it!
      </p>

      {/* Resume Box */}
      <div className="resume-box">
        <img src={resumeGif} alt="Download Resume" className="resume-icon" />
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
          From a young age, I have always been fascinated by the fact that almost everything we do
          is intertwined with technology.
        </p>
        <p className="section-text">
          My first taste of coding was hand writing Java programs and full classes on paper. I
          almost left the craft when I started studying Finance in college. However, a few of my
          close friends convinced me to give it another shot.
        </p>
        <p className="section-text">
          I now find myself working on a wide range of technically complex projects both within
          Justworks and at home. When I'm not coding, you can find me exploring nature with my
          German Shepherd, playing sheshbesh (backgammon), or being in sun.
          <br />
          <br />
          Sometimes the screens can be a little too much!
        </p>
      </div>
    </div>
  );
};

export default About;
