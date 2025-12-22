import React from "react";

import "./styles.css";
import aroundtheworld50sGif from "../../../../assets/gifs/around-the-world-50s-website.gif";
import artByDavGif from "../../../../assets/gifs/art-by-dav-website.gif";
import blenderRoomScene from "../../../../assets/gifs/blender-room-scene.gif";
import lifeOfRoyBlogGif from "../../../../assets/gifs/life-of-roy-blog.gif";
import oldPortfolioGif from "../../../../assets/gifs/old-portfolio-website.gif";

interface ProjectLink {
  label: string;
  url: string;
}

interface ProjectMedia {
  src: string;
  caption?: string;
}

interface Project {
  title: string;
  subtitle?: string;
  description?: string;
  bullets?: string[];
  media?: ProjectMedia[];
  links: ProjectLink[];
}

const projects: Project[] = [
  {
    title: "Personal Portfolio Website",
    description:
      "royschor.com is my portfolio website—and the site you're on right now. This project was both demanding and incredibly enjoyable to build. It challenged me technically and creatively, and it began when I realized my previous portfolio no longer reflected my style or growth.\n\nWhile searching for inspiration, I noticed that nearly every portfolio followed the same formula: a top navigation bar and endless vertical scrolling. I wanted something different—more creative, more interactive, and most importantly, more me.\n\nI developed this site in my spare time, between work, travel, and personal life. If you're reading this now, it means the project is finally complete.",
    media: [
      {
        src: blenderRoomScene,
        caption: "Blender scene of the 3D website exported as a glb.",
      },
    ],
    bullets: [
      "For a brief technical overview (full details are available in the GitHub repository): the website is architected as two distinct layers—a 3D experience and a 2D application.",
      "The 3D layer uses Three.js to render a Blender-authored scene and embeds the 2D site within it via an iframe. The 2D layer itself is a fully standalone React application. Its integration into the 3D environment is achieved using Three.js's CSS renderer, which maps the 2D HTML into 3D space through CSS transforms, creating the illusion of true three-dimensional depth.",
    ],
    links: [
      {
        label: "Github - personal-website repository",
        url: "https://github.com/RoySchor/personal-website",
      },
    ],
  },
  {
    title: "Website Development",
    description:
      "I design and build user-friendly websites tailored to specific client needs. My focus is on creating sites that are easy to maintain and update with minimal effort. Here are a few highlights:",
    bullets: [
      "I develop a wide range of projects, from fully automated blogs that generate new pages via user-friendly GUIs, to virtual galleries for aspiring artists.",
    ],
    media: [
      { src: artByDavGif, caption: "Art By Dav" },
      { src: aroundtheworld50sGif, caption: "Around The World 50s Blog" },
      { src: oldPortfolioGif, caption: "Old Portfolio Website" },
      { src: lifeOfRoyBlogGif, caption: "Story of Roy Blog" },
    ],
    links: [
      {
        label: "Github - aroundtheworld50s repo",
        url: "https://github.com/RoySchor/aroundtheworld50s",
      },
      {
        label: "Website - www.aroundtheworld50s.com",
        url: "https://www.aroundtheworld50s.com/",
      },
      {
        label: "Github - art-by-dav repo",
        url: "https://github.com/RoySchor/art-by-dav",
      },
      {
        label: "Website - www.art-by-dav.com",
        url: "https://royschor.github.io/art-by-dav/",
      },
      {
        label: "Github- old-portfolio repo",
        url: "https://github.com/RoySchor/personalWebsite",
      },
      {
        label: "Website - www.storyofroy.com",
        url: "https://storyofroy.wordpress.com/",
      },
    ],
  },
  {
    title: "Stock Prediction Neural Network",
    subtitle: "Python, Keras, Pandas",
    description:
      "Created an LSTM Neural Network using TensorFlow and Keras, utilizing Pandas Dataframe. The network continuously predicted the 5th trading day Close value based on the past 4 closing values.\n\nThis project was researched, designed, failed, and redone until reaching the desired goal. Detailed project info and analysis can be found below:",
    links: [
      {
        label: "Github - Stock-Neural-Network Repo",
        url: "https://github.com/RoySchor/Stock-Neural-Network",
      },
      {
        label: "Medium - Utilizing AI to Crack the Stock Market",
        url: "https://medium.com/@royschor/artificial-neural-networks-and-stocks-7d17474c14c8",
      },
    ],
    media: [],
  },
  {
    title: "Swift App Developer - developed 7 IOS Apps",
    description:
      "Researched, designed, and coded 7 Apps in Swift. Integrating UX & UI skills via backend programming through the colors, graphics, visual design, and layout to create a cohesive app that can be run on IOS devices",
    bullets: [
      "PokerPro: A multiplayer Poker App. The ability to log in and play poker with those on the same wifi network. Utilizes SwiftData and Multiplayer Peer Conectivity",
      "WordWizz: A multi-game app displaying different Scrabble game versions with a user-friendly display. Available in 3 languages.",
    ],
    links: [
      {
        label: "Github - WordWizz Repo",
        url: "https://github.com/RoySchor/WordWizzScrambleApp",
      },
    ],
    media: [],
  },
];

const Projects: React.FC = () => {
  return (
    <div className="content-section projects-section">
      <h1 className="section-header">Projects</h1>

      <div className="projects-list">
        {projects.map((project, index) => (
          <div key={index} className="project-card">
            <h2 className="project-title">{project.title}</h2>
            {project.subtitle && <h3 className="project-subtitle">{project.subtitle}</h3>}

            {project.description && (
              <div className="project-description">
                {project.description.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}

            {project.media && project.media.length > 0 && (
              <div className={`project-media-grid count-${project.media.length}`}>
                {project.media.map((item, i) => {
                  const isBlenderScene = item.src.includes("blender-room-scene");
                  return (
                    <div
                      key={i}
                      className={`media-item ${isBlenderScene ? "blender-scene" : ""}`}
                    >
                      <img src={item.src} alt={`${project.title} demo ${i + 1}`} />
                      {item.caption && (
                        <div className="media-caption">{item.caption}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {project.bullets && (
              <ul className="project-bullets">
                {project.bullets.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            )}

            <div className="project-links">
              {project.links.map((link, i) => (
                <div key={i} className="project-link-item">
                  <span className="link-arrow">➜</span>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Projects;
