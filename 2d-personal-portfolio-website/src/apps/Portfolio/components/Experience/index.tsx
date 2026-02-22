import React from "react";

import "./styles.css";
import justworksImg from "../../../../assets/portfolio-assets/justworks-experience-img.webp";
import ResumeBox from "../ResumeBox/ResumeBox";

interface Job {
  company: string;
  role: string;
  team?: string;
  location?: string;
  period: string;
  description?: string;
  bullets: string[];
}

const jobs: Job[] = [
  {
    company: "Justworks",
    role: "Full-Stack Software Engineer",
    team: "Global Payroll Team",
    location: "New York, NY",
    period: "July 2024 - Present",
    description:
      "I design scalable systems that streamline operations, reduce costs, and drive multimillion-dollar revenue growth.",
    bullets: [
      "Co-architected and deployed a full-stack Power of Attorney (POA) document workflow integrating DocuSign APIs, automating processes to save 11,000+ operational hours and cut annual costs by ~$300,000.",
      "Led end-to-end design and implementation of a high-performance rates processing tool with dynamic inline editing, scaling to 300,000+ customer rates and supporting $50M+ in annual revenue.",
      "Unifying three distinct payroll systems (two domestic, one international) unblocking cross-functional product development and enabling platform extensibility.",
      "Engineered secure, high-throughput integrations across 8+ microservices (Ruby, Go, SQL), achieving 99%+ request success while handling 20M+ API requests per week.",
    ],
  },
  {
    company: "Justworks",
    role: "Software Engineer Intern",
    team: "Benefits Billing Team",
    location: "New York, NY",
    period: "June 2023 - August 2023",
    bullets: [
      "Solved pertinent issues facing internal customers scoped to front-end, back-end, and test bench.",
      "Architected project workflow, developed an MVP, and deployed it to production.",
      "Used weekly by over 4 internal teams to access customer-critical information.",
    ],
  },
  {
    company: "Justworks",
    role: "Software Engineer Intern",
    team: "Employer Risk Team",
    location: "New York, NY",
    period: "June 2022 - August 2022",
    bullets: [
      "Revamped a legacy production script into a dynamic front-end Workers' Compensation tool that was integrated with the back-end.",
      "Spearheaded two company-wide panels and led two high-impact intern hackathons, driving internal innovation.",
    ],
  },
];

const Experience: React.FC = () => {
  return (
    <div className="content-section experience-section">
      <ResumeBox />

      <h1 className="section-header">Experience</h1>

      <img src={justworksImg} alt="Justworks" className="justworks-image" />

      <div className="experience-list">
        {jobs.map((job, index) => (
          <div key={index} className="experience-card">
            <div className="job-header">
              <div className="job-title-row">
                <h2 className="job-company">{job.company}</h2>
                <span className="job-period">{job.period}</span>
              </div>
              <div className="job-role-row">
                <h3 className="job-role">
                  {job.role} {job.team && <span className="job-team">| {job.team}</span>}
                </h3>
                {job.location && <span className="job-location">{job.location}</span>}
              </div>
            </div>

            {job.description && <p className="job-description">{job.description}</p>}

            <ul className="job-bullets">
              {job.bullets.map((bullet, i) => (
                <li key={i}>{bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Experience;
