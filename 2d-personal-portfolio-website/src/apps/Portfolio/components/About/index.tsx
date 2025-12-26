import React from "react";

import "./styles.css";
import AboutMeHawaiiImage from "../../../../assets/portfolio-assets/about-me-hawaii-img.webp";
import AboutMeHelensImage from "../../../../assets/portfolio-assets/about-me-helens-img.webp";
import ResumeBox from "../ResumeBox/ResumeBox";

const About: React.FC = () => {
  return (
    <div className="content-section">
      <h1 className="section-header">Welcome</h1>
      <h2 className="section-subheader">I'm Roy Schor</h2>

      <p className="section-text">
        I'm a full-stack software engineer working at Justworks. In May of 2024, I
        graduated from Penn State University with a BS in Computer Science.
      </p>

      <p className="section-text">
        Thank you for taking the time to check out my portfolio. I hope you enjoy
        exploring it as much as I enjoyed building it!
      </p>

      <ResumeBox />

      <div className="about-me-section">
        <h2>About Me</h2>
        <p className="section-text">
          My first taste of coding was handwriting Java programs and full classes on
          paper. I almost left the craft when I started studying Finance in college.
          However, a few of my close friends convinced me to give it another shot.
        </p>

        <p className="section-text">
          Outside of technology, I'm happiest when I'm moving, exploring, or somewhere
          completely new.
        </p>

        <p className="section-text">
          I'm an avid scuba diver and have been lucky enough to dive in places across the
          globe — from Florida to Belize and Thailand — swimming alongside sharks,
          octopus, and everything in between.
        </p>

        <p className="section-text">
          There's something inexplicable about being underwater and floating surrounded by
          a seemingly infinite ocean.
        </p>

        <img
          src={AboutMeHelensImage}
          alt="Roy Schor"
          className="about-me-image st-helens-image"
        />

        <p className="section-text">
          Staying active is a big part of my life. I spend a lot of time in the gym and
          enjoy pushing myself in races ranging from duathlons to triathlons.
        </p>

        <img src={AboutMeHawaiiImage} alt="Roy Schor" className="about-me-image" />

        <p className="section-text">
          Hiking has become one of the ways I've grown the most, largely thanks to my
          brothers, who constantly pushed me beyond my comfort zone. Through challenging
          climbs like summiting Mount St. Helens, Trolltunga in Norway, or Stairway to
          Heaven in Hawaii, my brothers taught me confidence, leadership, and
          self-fortitude.
        </p>

        <p className="section-text">
          Sometimes the screens can be a little too much. Getting outside, moving my body,
          and exploring new places helps me reset — and I bring that same curiosity and
          energy back into the things I build.
        </p>
      </div>
    </div>
  );
};

export default About;
