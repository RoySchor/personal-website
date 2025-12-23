import emailjs from "@emailjs/browser";
import React, { useRef, useState } from "react";
import "./styles.css";

const Contact: React.FC = () => {
  const form = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const sendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.current) return;

    setStatus("sending");

    emailjs
      .sendForm("service_igi7bjy", "template_6vm1m0m", form.current, "ad8VrPzMcuCyL7Vh3")
      .then(
        () => {
          setStatus("success");
          if (form.current) form.current.reset();
        },
        (error) => {
          console.error("FAILED...", error.text);
          setStatus("error");
        },
      );
  };

  return (
    <div className="content-section">
      <h2 className="section-subheader">Have an idea? Want to connect? Let's talk</h2>

      <p className="section-text">
        I am currently employed; however, I am always open to side projects and new
        opportunities to keep my skills sharp. Feel free to reach out!
      </p>

      <p className="section-text">
        Want to skip the form? Just email me:{" "}
        <a href="mailto:royschor@gmail.com" className="contact-email-link">
          royschor@gmail.com
        </a>
      </p>

      <div className="contact-form-container">
        <form ref={form} onSubmit={sendEmail}>
          <div className="form-group">
            <label htmlFor="user_name" className="form-label">
              * Your name:
            </label>
            <input
              type="text"
              name="user_name"
              id="user_name"
              required
              className="form-input"
              placeholder="Enter your name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="user_email" className="form-label">
              * Email:
            </label>
            <input
              type="email"
              name="user_email"
              id="user_email"
              required
              className="form-input"
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="message" className="form-label">
              * Message:
            </label>
            <textarea
              name="message"
              id="message"
              required
              rows={6}
              className="form-textarea"
              placeholder="Enter your message"
            />
          </div>

          <button
            type="submit"
            className="contact-submit-btn"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending..." : "Contact Me"}
          </button>

          {status === "success" && (
            <p className="status-message success">Message sent successfully!</p>
          )}
          {status === "error" && (
            <p className="status-message error">
              Failed to send message. Please try again.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default Contact;
